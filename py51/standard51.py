from .core.core51 import core51
from .peripheral.core51_peripheral import install_default_peripherals
def create_stand51():
    vm = core51()
    install_default_peripherals(vm)

    SCON = vm.get_sfr_by_name("SCON")
    SBUF = vm.get_sfr_by_name("SBUF")

    def print_sbuf(mem_obj, new_val):
        print(chr(new_val),end = '', flush = True)
        SCON[1] = 1

    SBUF.set_listener.append(print_sbuf)

    dbgarg = ['-i',R"test_hex/test.hex"]