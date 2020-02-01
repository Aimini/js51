import core51
import core51_peripheral
import hex_decoder
import argparse
vm = core51.core51()
core51_peripheral.install_default_peripherals(vm)

SCON = vm.get_sfr_by_name("SCON")
SBUF = vm.get_sfr_by_name("SBUF")

def print_sbuf(mem_obj, new_val):
    print(chr(new_val),end = '', flush = True)
    SCON[1] = 1

SBUF.set_listener.append(print_sbuf)

dbgarg = ['-i',R"D:\OneDrive\51cpu\temp\84_DIV_AB.hex"]
parser = argparse.ArgumentParser(description="8051 simulator")
parser.add_argument('-i', '--input-file',   dest='input_file', action='store', help='input intel hex file')
args = parser.parse_args()

with open(args.input_file) as fh:
    data = hex_decoder.decode_ihex(fh.read())
    # print(data)
    vm.load_rom(data)
vm.reset()
vm.run()
