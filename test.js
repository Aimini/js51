let vm = new _51cpu()

vm.XRAM[0x0001] = 0x01
vm.XRAM[0x00F0] = 0x0A
vm.XRAM[0x0AAA] = 0xA0
vm.XRAM[0xFF01] = 0xFF
vm.IDATA.content = [0x75,0xE0,0x01,0x13,0x80,0xFD]