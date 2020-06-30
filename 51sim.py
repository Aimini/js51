from py51 import create_stand51
from py51 import hex_decoder
import argparse

vm = create_stand51()

dbgarg = ['-i',R"test_hex/test.hex"]
parser = argparse.ArgumentParser(description="8051 simulator")
parser.add_argument('-i', '--input-file',   dest='input_file', action='store', help='input intel hex file')
args = parser.parse_args(dbgarg)

with open(args.input_file) as fh:
    data = hex_decoder.decode_ihex(fh.read())
    # print(data)
    vm.load_rom(data)
vm.reset()
vm.run()
