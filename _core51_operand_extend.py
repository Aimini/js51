import _core51_base
import mem_bit_ref
class opcode:
    def __init__(self, value, _core51_obj):
        self.value = value
        self._core51_obj = _core51_obj
        rs = int(_core51_obj.PSW) & 0x18
        self.Ri_addr = rs | (0x01 & self.value)
        self.Rn_addr = rs | (0x07 & self.value)

    def ri(self):
        
        return self._core51_obj.get_iram(int(self.riaddr()))

    def riaddr(self):
        return self._core51_obj.get_iram(self.Ri_addr)
    
    def rn(self):
        return self._core51_obj.get_ram(self.Rn_addr)
    
    def test(self, target, mask = 0xFF):
        return (self.value & mask) == target
    # opcode.fetch_addr11():
    #     let comb = ((self.value & 0xE0) << 3) + cpu_ref.ROM[cpu_ref.PC.get()]
    #     let next_PC = cpu_ref.PC.inc().get()
    #     comb += (next_PC & 0xF800)
    #     return comb
    # }

class _core51_operand_extend(_core51_base._core51_base):
    def __init__(self):
        super().__init__()

    def fetch_opcode(self):
        o = opcode(self.ROM[int(self.PC)], self)
        self.PC += 1
        return o


    def fetch_const16(self):
        pt = int(self.PC)
        high8bit = self.ROM[pt]
        low8bit =  self.ROM[pt + 1]
        self.PC += 2
        return (high8bit << 8) + low8bit

    def fetch_const(self):
        value = self.ROM[int(self.PC.get())]
        self.PC += 1
        return value


    def fetch_direct(self):
        addr = self.ROM[int(self.PC)]
        self.PC += 1
        return self.get_ram(addr)


    def fetch_bit(self):
        bit_addr = self.ROM[int(self.PC)]
        bit_index = bit_addr & 0x07

        if bit_addr < 0x80:
            addr = 0x20 + (bit_addr >> 3)
        else:
            addr = bit_addr & 0xF8

        self.PC += 1
        return mem_bit_ref.mem_bit_ref(self.get_ram(addr), bit_index)