
_51cpu.prototype.build_instruction_table  = function (){
    let A11 = "addr11"
    let C16 = "const16"
    let C8 = "const8"
    let A = "A"
    let D = "direct"

    let CY = "PSW.CY"

    let BIT = "BIT"
    let NBIT = "NBIT"
    let RI = "RAM@Ri"
    let RN = "RAM@Rn"
    let DPTR = "DPTR"

    let XRI = "XRAM@Ri"
    let XDPTR = "XRAM@DPTR"

    let mp = _51cpu.prototype;
    this.instruction_table = [
        [[0x00],        mp.op_nop,        [],       "NOP"],
        [[0x01, 0x1F],  mp.op_jump,       [A11],    "AJMP addr11"],
        [[0x02],        mp.op_jump,       [C16],    "LJMP addr16"],
        [[0x03],        mp.op_rr,         [A],      "RR  A"],
        [[0x04],        mp.op_inc,        [A],      "INC A"],
        [[0x05],        mp.op_inc,        [D],      "INC direct"],
        [[0x06, 0xFE],  mp.op_inc,        [RI],     "INC @Ri"],
        [[0x08, 0xF8],  mp.op_inc,        [RN],     "INC Rn"],

        [[0x10],        mp.op_jbc,        [BIT,C8], "JBC bit,offset"],
        [[0x11, 0x1F],  mp.op_call,       [A11],    "ACALL addr11"],
        [[0x12],        mp.op_call,       [C16],    "LCALL addr16"],
        [[0x13],        mp.op_rrc,        [A],      "RRC A"],
        [[0x14],        mp.op_dec ,       [A],      "DEC A"],
        [[0x15],        mp.op_dec ,       [D],      "DEC direct"],
        [[0x16, 0xFE],  mp.op_dec,        [RI],     "DEC @Ri"],
        [[0x18, 0xF8],  mp.op_dec,        [RN],     "DEC Rn"],

        [[0x20],        mp.op_con_sjump,  [BIT,C8], "JB bit, offset"],
        [[0x22],        mp.op_ret,        [],       "RET"],
        [[0x23],        mp.op_rl,         [A],      "RL A"],
        [[0x24],        mp.op_add,        [A,C8],   "ADD A, #immed"],
        [[0x25],        mp.op_add,        [A,D],    "ADD A, direct"],
        [[0x26, 0xFE],  mp.op_add,        [A,RI],   "ADD A, @Ri"],
        [[0x28, 0xF8],  mp.op_add,        [A,RN],   "ADD A, Rn"],

        [[0x30],        mp.op_ncon_sjump, [BIT,C8], "JNB bit,offset"],
        [[0x32],        mp.op_reti,       [],       "RETI"],
        [[0x33],        mp.op_rlc,        [A],      "RLC A"],
        [[0x34],        mp.op_addc,       [A,C8],   "ADDC A, #immed"],
        [[0x35],        mp.op_addc,       [A,D],    "ADDC A, direct"],
        [[0x36, 0xFE],  mp.op_addc,       [A,RI],   "ADDC A, @Ri"],
        [[0x38, 0xF8],  mp.op_addc,       [A,RN],   "ADDC A, Rn"],

        [[0x40],        mp.op_con_sjump, [CY,C8],   "JC offset"],
        [[0x42],        mp.op_orl,       [D,A],     "ORL direct,A"],
        [[0x43],        mp.op_orl,       [D,C8],    "ORL direct,#immed"],
        [[0x44],        mp.op_orl ,      [A,C8],    "ORL A, #immed"],
        [[0x45],        mp.op_orl ,      [A,D],     "ORL A, direct"],
        [[0x46, 0xFE],  mp.op_orl,       [A,RI],    "ORL A,@Ri"],
        [[0x48, 0xF8],  mp.op_orl,       [A,RN],    "ORL A,Rn"],

        [[0x50],        mp.op_ncon_sjump,[CY,C8],   "JNC offset"],
        [[0x52],        mp.op_anl,       [D,A],     "ANL direct,A"],
        [[0x53],        mp.op_anl,       [D,C8],    "ANL direct,#immed"],
        [[0x54],        mp.op_anl,       [A,C8],    "ANL A, #immed"],
        [[0x55],        mp.op_anl,       [A,D],     "ANL A, direct"],
        [[0x56, 0xFE],  mp.op_anl,       [A,RI],    "ANL A, @Ri"],
        [[0x58, 0xF8],  mp.op_anl,       [A,RN],    "ANL A, Rn"],

        [[0x60],        mp.op_jz,        [C8],      "JZ offset"],
        [[0x62],        mp.op_xrl,       [D,A],     "XRL direct,A"],
        [[0x63],        mp.op_xrl,       [D,C8],    "XRL direct,#immed"],
        [[0x64],        mp.op_xrl,       [A,C8],    "XRL A, #immed"],
        [[0x65],        mp.op_xrl,       [A,D],     "XRL A, direct"],
        [[0x66, 0xFE],  mp.op_xrl,       [A,RI],    "XRL A,@Ri"],
        [[0x68, 0xF8],  mp.op_xrl,       [A,RN],    "XRL A,Rn"],

        [[0x70],        mp.op_jnz,       [C8],      "JNZ offset"],
        [[0x72],        mp.op_orl,       [CY,BIT],  "ORL C,bit"],
        [[0x73],        mp.op_jadptr,    [],        "JMP @A+DPTR"],
        [[0x74],        mp.op_move,      [A,C8],    "MOV A,#immed"],
        [[0x75],        mp.op_move,      [D,C8],    "MOV direct,#immed"],
        [[0x76, 0xFE],  mp.op_move,      [RI,C8],   "MOV @Ri,#immed"],
        [[0x78, 0xF8],  mp.op_move,      [RN,C8],   "MOv Rn,#immed"],
        
        [[0x80],        mp.op_sjump,     [C8],       "SJMP offset"],
        [[0x82],        mp.op_anl,       [CY,BIT],   "ANL C,bit"],
        [[0x83],        mp.op_movcapc,   [],         "MOVC A, @A+PC"],
        [[0x84],        mp.op_div,       [],         "DIV AB"],
        [[0x85],        mp.op_move,      [D,D],      "MOV direct, direct"],
        [[0x86, 0xFE],  mp.op_move,      [D,RI],     "MOV direct, @Ri"],
        [[0x88, 0xF8],  mp.op_move,      [D,RN],     "MOv direct, Rn"],

        [[0x90],        mp.op_move,      [DPTR,C16], "MOV DPTR, #immed"],
        [[0x92],        mp.op_move,      [BIT,CY],   "MOV bit, C"],
        [[0x93],        mp.op_movcadptr, [],         "MOV A, @A+DPTR"],
        [[0x94],        mp.op_subb,      [A,C8],     "SUBB A, #immed"],
        [[0x95],        mp.op_subb,      [A,D],      "SUBB A, direct"],
        [[0x96, 0xFE],  mp.op_subb,      [A,RI],     "SUBB A, @Ri"],
        [[0x98, 0xF8],  mp.op_subb,      [A,RN],     "SUBB A, Rn"],

        [[0xA0],        mp.op_orl,          [CY,NBIT],  "ORL C,/bit"],
        [[0xA2],        mp.op_move,         [CY,BIT],   "MOV C,bit"],
        [[0xA3],        mp.op_inc,          [DPTR],     "INC DPTR"],
        [[0xA4],        mp.op_mul,          [],         "MUL AB"],
        [[0xA5],        mp.op_reserved,     [],         "RESERVED"],
        [[0xA6, 0xFE],  mp.op_move,         [RI,D],"MOV @Ri,direct"],
        [[0xA8, 0xF8],  mp.op_move,         [RN,D],"MOV Rn, direct"],

        [[0xB0],        mp.op_anl,          [CY,NBIT],  "ANL C,/bit"],
        [[0xB2],        mp.op_cpl,          [BIT],      "CPL bit"],
        [[0xB3],        mp.op_cpl,          [CY],       "CPL C"],
        [[0xB4],        mp.op_cjne,         [A,C8,C8],  "CJNE A,  #immed, offset"],
        [[0xB5],        mp.op_cjne,         [A,D, C8],  "CJNE A,  direct, offset"],
        [[0xB6, 0xFE],  mp.op_cjne,         [RI,C8,C8], "CJNE @Ri,#immed, offset"],
        [[0xB8, 0xF8],  mp.op_cjne,         [RN,C8,C8], "CJNE Rn, #immed, offset"],

        [[0xC0],        mp.op_push,         [D],      "PUSH direct"],
        [[0xC2],        mp.op_clr,          [BIT],    "CLR bit"],
        [[0xC3],        mp.op_clr,          [CY],     "CLR C"],
        [[0xC4],        mp.op_swap,         [A],      "SWAP A"],
        [[0xC5],        mp.op_xch,          [A, D],   "XCH A, direct"],
        [[0xC6, 0xFE],  mp.op_xch,          [A, RI],  "XCH A, @Ri"],
        [[0xC8, 0xF8],  mp.op_xch,          [A, RN],  "XCH A, Rn"],
        
        [[0xD0],        mp.op_pop,          [D],      "POP direct"],
        [[0xD2],        mp.op_setb,         [BIT],    "SETB bit"],
        [[0xD3],        mp.op_setb,         [CY],     "SETB C"],
        [[0xD4],        mp.op_da,           [A],      "DA A"],
        [[0xD5],        mp.op_djnz,         [D, C8],  "DJNZ direct,offset"],
        [[0xD6, 0xFE],  mp.op_xchd,         [A, RI],  "XCHD A,@Ri"],
        [[0xD8, 0xF8],  mp.op_djnz,         [RN,C8],  "DJNZ Rn,offset"],

        [[0xE0],        mp.op_move,         [A,XDPTR],"MOVX A, @DPTR"],
        [[0xE2,0xFE],   mp.op_move,         [A,XRI],  "MOVX A, @Ri"],
        [[0xE4],        mp.op_clr,          [A],      "CLR A"],
        [[0xE5],        mp.op_move,         [A, D],   "MOV A,direct"],
        [[0xE6, 0xFE],  mp.op_move,         [A, RI],  "MOV A,@Ri"],
        [[0xE8, 0xF8],  mp.op_move,         [A, RN],  "MOV A,Rn"],

        [[0xF0],        mp.op_move,         [XDPTR,A], "MOVX @DPTR, A"],
        [[0xF2,0xFE],   mp.op_move,         [XRI,A],   "MOVX @Ri, A"],
        [[0xF4],        mp.op_cpl,          [A],       "CPL A"],
        [[0xF5],        mp.op_move,         [D,A],     "MOV direct,A"],
        [[0xF6, 0xFE],  mp.op_move,         [RI,A],    "MOV @Ri,A"],
        [[0xF8, 0xF8],  mp.op_move,         [RN,A],    "MOV Rn,A"],
    ]
}
_51cpu.prototype.build_operands = function(opcode, operands){
    let A11 = "addr11"
    let C16 = "const16"
    let C8 = "const8"
    let A = "A"
    let D = "direct"

    let CY = "PSW.CY"

    let BIT = "BIT"
    let NBIT = "NBIT"
    let RI = "RAM@Ri"
    let RN = "RAM@Rn"
    let DPTR = "DPTR"

    let XRI = "XRAM@Ri"
    let XDPTR = "XRAM@DPTR"

    let dops = []
    for(oneop of operands){
        if(oneop === A11){
            let address11 = ((opcode << 3) & 0x700) + this.fetch_const()
            dops.push(address11)
            continue;
        }
        if(oneop === C16){
            dops.push(this.fetch_const16())
            continue;
        }
        if(oneop === C8){
            dops.push(this.fetch_const())
            continue;
        }
        if(oneop === A){
            dops.push(this.A)
            continue;
        }
        if(oneop === D){
            dops.push(this.fetch_direct())
            continue;
        }
        if(oneop === CY){
            dops.push(this.PSW.carry)
            continue;
        }
        if(oneop === BIT){
            dops.push(this.fetch_bit())
            continue;
        } 
        if(oneop === NBIT){
            let b = this.fetch_bit()
            let nb = { get: () => ~b.get() }
            dops.push(nb)
            continue;
        }
        
        if(oneop === RI){
            dops.push(opcode.get_Ri())
            continue;
        }

        if(oneop === RN){
            dops.push(opcode.get_Rn())
            continue;
        }

        if(oneop === DPTR){
            dops.push(this.DPTR)
            continue;
        }

        if(oneop === XRI){
            let cpu_ref = this;
            let xriref = {
                get: ()=>   cpu_ref.ERAM[opcode.get_Ri().mem_addr] ,
                set: (val)=> cpu_ref.ERAM[opcode.get_Ri().mem_addr] = val
            }
            dops.push(xriref)
            continue;
        }

        if(oneop === XDPTR){
            let cpu_ref = this;
            let xdptrref = {
                get: ()=>   cpu_ref.ERAM[cpu_ref.DPTR.get()] ,
                set: (val)=> cpu_ref.ERAM[cpu_ref.DPTR.get()] = val
            }
            dops.push(xdptrref)
            continue;
        }
        throw "unkonw operand: " + oneop  
    }
    return dops
}

let snapshot_iram = []
let snapshot_items = []

let DebugText = ""
_51cpu.prototype.execute_one = function () {
    // DebugText = DebugText + this.text_snapshot() + '\n'

    this.STATE += 1
    let opcode = this.fetch_opcode();
    
    let hit_encode = false
    for(let item of this.instruction_table){
        let encode = item[0]
        if(encode.length == 1){
            hit_encode = opcode.test(encode[0],0xFF)
        }else{
            hit_encode = opcode.test(encode[0],encode[1])
        }
        if(!hit_encode){
            continue;
        }
        
        let dops = this.build_operands(opcode, item[2])
        let operation = item[1]
        if(typeof(operation) === "undefined")
        {
            throw "you forget add operation callback for:" + item[3]
        }

        if(dops.length <= 3 && dops.length  >= 0){
            if(opcode.value == 0x85)
            { //move direct,direct fisrt is src, second is dest!
                let temp = dops[1]
                dops[1] = dops[0]
                dops[0] = temp
            }
            operation.apply(this,dops)
           
            // snapshot_iram.push(JSON.parse(JSON.stringify(this.IRAM)))
            // snapshot_items.push(JSON.parse(JSON.stringify(item)))
            break;
        }
        else{
            throw "wrong length" + dops.length
        }
    }
    if(!hit_encode)
        console.error("wrong isntruction opcode:" + opcode.value)
    for(i of this.irq){
        let irqn = i();
        if(irqn >= 0){
            this.op_call({get: ()=> (irqn << 3) + 3})
        }
    }
}