import core51
import core51_peripheral
import hex_decoder

vm = core51.core51()
core51_peripheral.install_default_peripherals(vm)
with open("test.hex") as fh:
    data = hex_decoder.decode_ihex(fh.read())
    # print(data)
    vm.load_rom(data)
SCON = vm.get_sfr("SCON")
SBUF = vm.get_sfr("SBUF")

def print_sbuf(mem_obj, new_val):
    print(chr(new_val),end = '', flush = True)
    SCON[1] = 1

SBUF.set_listener.append(print_sbuf) 
vm.reset()
vm.run()
