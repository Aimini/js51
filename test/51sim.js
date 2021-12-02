const fs =  require("fs")
const js51 =  require("./51vm")



let args = {
    input_file: "C:/Users/abb/Desktop/51cpu/temp/x11_ACALL_a11.hex",
    dump_file_template: "C:/Users/abb/Desktop/51cpu/temp/x11_ACALL_a11.simulate_hardware.dump.txt"
}
cmd_arg_list = process.argv.splice(2)
if(cmd_arg_list.length > 0)
{
    args.input_file = cmd_arg_list[0]
    args.dump_file_template = cmd_arg_list[1]
}




let run_flag = true
let CPU_ERROR_ASSERT_FAILED = 0x11
let assertion_info = null


let vm = new js51.core51()
js51.install_default_peripherals(vm)


function dump_core(core) {
    let content = "";
    let ram_dump = core.IRAM
    let reg_dump = [core.SP, core.DPL, core.DPH, core.PSW, core.A, core.B]

    for (let _ of reg_dump) {
        content += `${_._value} `
    }
    content += '\n'

    i = 0
    for (let x of ram_dump) {

        content += `${x} `
        i += 1
        if (i % 16 == 0) content += '\n'
    }
    content += ';'
    return content
}



function normal_stop(oldval, newval) {
    run_flag = false
    console.log("program exit.")
}


function assert_core(par0reg, par1reg, function_val) {
    p0 = par0reg._value
    p1 = par1reg._value
    if (function_val == 1){
            if (!(p0 > p1)) {
                vm.error_info.code = CPU_ERROR_ASSERT_FAILED
                assertion_info = `${p0} > ${p1} assert failed`
            }
        } else if (function_val == 2) {
            if (!(p0 == p1))
            {
                vm.error_info.code = CPU_ERROR_ASSERT_FAILED
                assertion_info = `${p0} == ${p1} assert faile`
            }
        } else if (function_val == 3) {
            if (!(p0 < p1))
            {
                vm.error_info.code = CPU_ERROR_ASSERT_FAILED
                assertion_info = `${p0} < ${p1} assert failed`
            }
        } else if (function_val == 4) {
            vm.error_info.code = CPU_ERROR_ASSERT_FAILED
            assertion_info = `user actively requestd a crash.`
        }
}
/*
ADDR_SIZE = 0x1D
ADDR_PCL = 0x1E
ADDR_PCH = 0x1F
ADDR_CHUCK = 0x20
ROM_LOCK = True
SEQ_DISALBE_SDP =(
    (0xAA, 0x5555),(0x55, 0x2AAA),(0x80, 0x5555),
    (0xAA, 0x5555),(0x55, 0x2AAA),(0x20, 0x5555))
SEQ_ENALBE_SDP = (
    (0xAA, 0x5555),(0x55, 0x2AAA),(0xA0, 0x5555))
def uf_programROM(core):
    if int(core.PSW) & 2 == 0:
        return
    if int(core.A) ^ int(core.B) != 0xFF:
        return
        
    # print(hex(vPC))
    global ROM_LOCK
    valA = int(core.A)
    if valA == 0:
        if ROM_LOCK:
            return
        size = int(core.IRAM[ADDR_SIZE])
        PC = (int(core.IRAM[ADDR_PCH])<< 8) + int(core.IRAM[ADDR_PCL])
        for i in range(len(core.ROM), PC + size):
            core.ROM.append(0)
        for i in range(size):
            core.ROM[PC + i] = int(core.IRAM[ADDR_CHUCK + i])
    elif valA == 1:
        size = int(core.IRAM[ADDR_SIZE])
        writing_seq = []
        for i in range(size):
            offset = i*3 + ADDR_SIZE + 1
            data = int(core.IRAM[offset])
            PC = (int(core.IRAM[offset + 2])<< 8) + int(core.IRAM[offset + 1])
            writing_seq.append((data, PC))
        
        writing_seq = tuple(writing_seq)

        if writing_seq == SEQ_DISALBE_SDP:
            ROM_LOCK = False
        elif writing_seq == SEQ_ENALBE_SDP:
            ROM_LOCK = True
*/

function assert_and_dump_test(core) {
    let a = Math.floor(Math.random() * 0x100)
    let b = Math.floor(Math.random() * 0x100)

    let t = [
        // assert 0XFF == 0XFF
        0x75, 0xFD, a,  // 3     MOV 0xFD, #0x00])
        0x75, 0xFE, b,  // 4     MOV 0xFE, #0x00
        0x75, 0xFF,     // 5     MOV 0xFF,  ?
    ]

    let condition = [
        [1, (a, b) => a > b],
        [2, (a, b) => a == b],
        [3, (a, b) => a < b],
        [4, (a, b) => False]
    ]
    for (let cmpcode = 1; cmpcode < 4; ++cmpcode) {
        let c = [].concat(t)
        c.push(cmpcode)

        core.reset()
        core.IDATA = (c)
        core.next(3)
        for (x of condition) {
            let e = "assert function error."
            if (cmpcode == x[0])
            {
                if (vm.error_info.code == js51.CPU_NO_ERROR) {
                    if (!(x[1](a, b))) // assert failed but no exception
                    {
                        console.error("assert failed but no exception ")
                        reuturn -1;
                    }

                } else {
                    if (x[1](a, b))  // passed  but  exception happend
                    {
                        console.error("passed but exception happend " + assertion_info)
                        reuturn -1;
                    }
                }

            }
        }
    }
    return 0;
}

let dump_content = ""

function install_my_sfr(core) {
    let p0 = "ASTPAR0"
    let p1 = "ASTPAR1"
    let my_sfr = new Map([
        [0xFB, "DUMPR"],
        [0xFC, "EXR"],
        [0xFD, p0],
        [0xFE, p1],
        [0xFF, "ASTREG"],
    ])

    let obj = core.sfr_extend(my_sfr)


    let dump_core_to_template_file = function () {
        dump_content += dump_core(core)
    }

    obj.get("DUMPR").setlistener.push((oldval, newval) => dump_core_to_template_file())
    obj.get("EXR").setlistener.push((oldval, newval) => normal_stop())
    obj.get("ASTREG").setlistener.push((oldval, newval) => assert_core(obj.get(p0), obj.get(p1), newval))
}

function main() {
    install_my_sfr(vm)
    /*vm.reserved_instruction = uf_programROM*/
    
    if(args.input_file.length == 0)
    {
        let doc = `node 51sim.js <rom_file.hex> <dump_file>`
        console.log(doc +'/n')
 
        console.log("testing...")
        for (let i = 0; i < 1000; ++i)
        {
            if(assert_and_dump_test(vm) != 0)
            {
                console.error("test failed!")
                return;
            }
        }
        console.error("test passed.")
    }else{
        let data = fs.readFileSync(args.input_file,'utf-8')
        data = js51.decode_ihex(data)
        vm.IDATA = data
    
        vm.reset()
        let vPC = vm.PC._value
        while (run_flag && vm.error_info.code == js51.CPU_NO_ERROR) {
            vPC = vm.PC._value
            vm.next(1)
        }
        if(vm.error_info.code != js51.CPU_NO_ERROR)
        {
            console.error(`${vPC.toString(16)} error with code ${vm.error_info.code} ${assertion_info}` );
        }
      fs.writeFileSync(args.dump_file_template, dump_content)
    }
}

main()
