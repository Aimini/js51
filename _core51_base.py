import mem
class mem_dptr(mem.mem):
    def __init__(self, dpl_obj, dph_obj):
        super().__init__(0, 16)
        self.DPL = dpl_obj
        self.DPH = dph_obj

    def _get_no_listened(self):
        return (int(self.DPH) << 8) |(int(self.DPL))
    
    def _set_no_listened(self, value):
        v_dpl = value & 0xFF
        v_dph = (value >> 8) & 0xFF
        
        self.DPL.set(v_dpl)
        self.DPH.set(v_dph)
        super()._set_no_listened(value)

class mem_psw(mem.mem):
    def __init__(self, value = 0):
        super().__init__(value, 8)
    
    def _set_no_listened(self, v):
        v = (self.value & 0x01) | (v & 0xFE)
        super()._set_no_listened(v)
    
    def set_pf(self, v):
        val = self._get_no_listened()
        val = (val & 0xFE) | (v  & 1)
        # set value 
        super()._set_no_listened(val)
        # notifaction
        super().set(val)


class _core51_base:
    def __init__(self):
        ############################
        #  core register
        self.A =  mem.mem()
        self.B =  mem.mem()
        self.PSW = mem_psw()
        self.SP =  mem.mem(7)
        self.PC =  mem.mem(0, 16)

        self.DPL =  mem.mem()
        self.DPH =  mem.mem()
        self.DPTR =  mem_dptr(self.DPL, self.DPH)
        ############################
        # IRAM, XRAM, ROM
        self.XRAM = [mem.mem() for _ in range(0x10000)]
        self.IRAM = [mem.mem() for _ in range(0x80)]

        
        self.ROM  = []

        
        ############################
        # SFR MAP
        CORE_SFR = {
            0x81: self.SP,
            0x82: self.DPL,
            0x83: self.DPH,
            0xD0: self.PSW,
            0xE0: self.A,
            0xF0: self.B,
        }

        self.sfr_name = {
            "SP":   0x81,
            "DPL":  0x82,
            "DPH":  0x83,
            "PSW":  0xD0,
            "A":    0xE0,
            "B":    0xF0,
        }
        
        #None meaning no SFR mapped
        self.SFRRAM = [None for _ in range(0x100)]
        for addr, s in CORE_SFR.items():
            self.SFRRAM[addr] = s


        self.A.change_listener.append(lambda mem_obj, new_val: self.PSW.set_pf(self.parity(new_val)))

        self.interrupt_end_linstener = []
        self.addr_breakpoint = []
        self.irq = []

    @staticmethod
    def parity(v):
        a = int(v)
        a = ((a >> 1) & 0x55) + (a & 0x55)
        a = ((a >> 2) & 0x33) + (a & 0x33)
        a = ((a >> 4) & 0x0F) + (a & 0x0F)
        return a & 1

    def sfr_extend(self, ext_package):
        ret =  {}

        for addr, name in  ext_package.items():
            if addr < 0x80:
                raise IndexError("SFR overwrite IRAM address 0x{:0>2X}.".format(addr))

            if self.SFRRAM[addr - 0x80]:
                raise IndexError("SFR overwrite SFR at address 0x{:0>2X}.".format(addr))

            if self.sfr_name.get(name):
                raise KeyError("already define SFR named '{}' at address 0x{:0>2X}.".format(name, self.sfr_name[name]))
            self.sfr_name[name] = addr
            new_mem = mem.mem()
            self.SFRRAM[addr] = new_mem

            ret[name] = new_mem


        return ret

    def get_ram(self,addr):
        if addr < 0x80:
            return self.IRAM[addr]
        else:
            return self.SFRRAM[addr]
            
    def get_sfr(self, name):
        return self.SFRRAM[self.sfr_name[name]]

    def reset(self):
        """reset all core register.(doesn't include sfr and ram)"""
        self.A.set(0)
        self.B.set(0)
        self.PSW.set(0)
        self.SP.set(7)
        self.PC.set(0)
        self.DPL.set(0)
        self.DPH.set(0)

    def text_snapshot(self):
        t =  f"{self.PC.get()} {self.A.get()} {self.B.get()} "
        t += f"{self.SP.get()} {self.PSW.get()} {self.DPTR.get()} {self.SFRRAM[0x99].get()} | "
        for x in self.IRAM:
            t += f'{x.get()} '
        return t