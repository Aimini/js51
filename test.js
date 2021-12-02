(function(){
    let vm_test = new _51cpu(0x80, 0x100)

    vm_test.XRAM[0x0001] = 0x01
    vm_test.XRAM[0x00F0] = 0x0A
    vm_test.XRAM[0x0AAA] = 0xA0
    vm_test.XRAM[0xFF01] = 0xFF
    vm_test.IDATA = [0x75,0xE0,0x01,0x13,0x80,0xFD]

    IDATA_INVALID_IRAM_ACCESS = [0x78, 0xFF, 0x76, 0xFF] //MOV R0, #0xFF; MOV @R0, #0xFF
    IDATA_INVALID_XRAM_ACCESS = [0x90,0xFF,0xFF,0xF0] //MOV DPTR, #0xFFFF ; MOV @DPTR, A
    IDATA_INVALID_ROM_ACCESS =  [null] 
    IDATA_INVALID_SFR_ACCESS = [0x05, 0xFF] //INC 0xFF
    //test 
    vm_test.reset()
    vm_test.IDATA = IDATA_INVALID_IRAM_ACCESS
    while(vm_test.error_info.code == CPU_NO_ERROR) vm_test.next(1)
    if(vm_test.error_info.code != CPU_ERROR_INVALID_IRAM_ADDRESS) console.error("test failed")


    vm_test.reset()
    vm_test.IDATA = IDATA_INVALID_XRAM_ACCESS
    while(vm_test.error_info.code == CPU_NO_ERROR) vm_test.next(1)
    if(vm_test.error_info.code != CPU_ERROR_INVALID_XRAM_ADDRESS) console.error("test failed")


    vm_test.reset()
    vm_test.IDATA = IDATA_INVALID_ROM_ACCESS
    while(vm_test.error_info.code == CPU_NO_ERROR) vm_test.next(1)
    if(vm_test.error_info.code != CPU_ERROR_INVALID_ROM_ADDRESS) console.error("test failed")


    vm_test.reset()
    vm_test.IDATA = IDATA_INVALID_SFR_ACCESS
    while(vm_test.error_info.code == CPU_NO_ERROR) vm_test.next(1)
    if(vm_test.error_info.code != CPU_ERROR_INVALID_SFR_ADDRESS) console.error("test failed")
})();

(function(){
    let vm = new _51cpu(0x80, 0x100)
    //test SFR set/get
    let input_idx = 0
    let input_buffer = [1,2,3,4,5,6]
    let output_buffer = []

    vm.sfr_extend(new Map([
        [0x98, "SCON"],
        [0x99, "SBUF"]
    ]));


    vm.SBUF.setlistener.push(function (old_value, new_value) {
        output_buffer.push(new_value)
    })

    vm.SBUF.getlistener.push(function (current_value) {
        vm.SBUF._value = input_buffer[input_idx]
    })


    vm.SCON.getlistener.push(function (old_value, new_value) {
        // RI if we haven't read all input_buffer
        if(input_idx != input_buffer.length){
            vm.SCON._value &= 0xFE
            vm.SCON._value |= 0x01
        }
        // sending is always available, so TI is always 1
        vm.SCON._value |= 0x02
    })

    vm.SCON.setlistener.push(function (old_value, new_value) {
        // mean's core wanna read next byte if  RI is cleared
        // so increase input_idx
        if(new_value & 1 == 0){
            ++input_idx;
        }
    })


    vm.IDATA = [
        0xD2, 0x99,         // SETB TI 
        0x30, 0x98, 0xFD,   // S0:  JNB RI, $ ;wait RI
        0xE5, 0x99,         //      MOV A, SBUF
        0xC2, 0x98,         //      CLR RI
        0x04,               //      INC A
        0x30,0x99,0xFD,     //      JNB TI, $ ;wait TI
        0xF5,0x99,          //      MOV SBUF, A
        0xC2, 0x99,         //      CLR TI
        0x80,0xF3]          //      SJMP S0

    vm.reset()
    while(output_buffer.length != input_buffer.length)
    {
        vm.next(1)
    }

    for (let i = 0; i < input_buffer.length; i++) {
        if(input_buffer[i] + 1 != output_buffer[i])
            console.error("test failed")
    }
})();


(function(){
    let count = 4
    let vm = new _51cpu()
    vm.irq = function(){
    if(count)
    {
        --count;
        return 1

    }
        else
            return -1
    }
    vm.IDATA = [
        0xE4,       // CLR A  
        0x80, 0xFE,  // SJMP $
        0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,   // NOP x8    
        0x04,        // INC A  ; interrupt 1
        0x32        // RETI
    ]
    vm.reset()
    vm.next(10000)
    if(vm.A._value != 4) // should be 4
        console.error("test failed")
})();
