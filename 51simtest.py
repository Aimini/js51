import core51
import core51_peripheral
import hex_decoder
import argparse
import random
import sys

parser = argparse.ArgumentParser(description="8051 simulator")
parser.add_argument('-i', '--input-file',   dest='input_file', action='store', help='input intel hex file')

dbgarg = ["-i", R"test_hex\int_test.hex"]

args = parser.parse_args(dbgarg)


run_flag = True
dump_count = 0


vm = core51.core51()
core51_peripheral.install_default_peripherals(vm)


def normal_stop():
    global run_flag
    run_flag = False
    print("program exit.")


def assert_core(par0reg, par1reg, function_val):
    p0 = int(par0reg)
    p1 = int(par1reg)
    if function_val == 1:
        if not (p0 > p1):
            raise ArithmeticError("{} > {} assert failed".format(p0, p1))
    elif function_val == 2:
        if not (p0 == p1):
            raise ArithmeticError("{} == {} assert failed".format(p0, p1))
    if function_val == 3:
        if not (p0 < p1):
            raise ArithmeticError("{} < {} assert failed".format(p0, p1))
    if function_val == 4:
            raise Exception("user actively requested a crash.")




def install_assert_sfr(core: core51.core51):
    p0 = "ASTPAR0"
    p1 = "ASTPAR1"
    my_sfr = {
        0xFC: "EXR",
        0xFD: p0,
        0xFE: p1,
        0xFF: "ASTREG",
    }

    obj = core.sfr_extend(my_sfr)
    obj["EXR"].set_listener.append(lambda mem_obj, new_value: normal_stop())
    obj["ASTREG"].set_listener.append(lambda mem_obj, new_value: assert_core(obj[p0], obj[p1], new_value))

install_assert_sfr(vm)


with open(args.input_file) as fh:
    data = hex_decoder.decode_ihex(fh.read())
    vm.load_rom(data)

vm.reset()
while run_flag:
    vPC = int(vm.PC)
    try:
        vm.step(1)
    except Exception as e:
        str(e)
        raise Exception(str(e) + " at PC[{:0>4X}]".format(vPC))
print(vm.text_snapshot())