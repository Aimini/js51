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

