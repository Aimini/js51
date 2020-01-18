
##include all instruction opreation
import _core51_operand_extend
import mem

class _core51_operation_extend(_core51_operand_extend._core51_operand_extend):
    def __init__(self):
        super().__init__()

    def op_sjump(self, offset_raw):
        offset = 0
        if offset_raw >= 0x80:
            offset = - (256 - offset_raw)
        else:
            offset = offset_raw
        self.PC += offset

    def op_condition_jump(self, condition, offset_raw):
        if int(condition) != 0:
            self.op_sjump(offset_raw)

    def op_not_condition_jump(self, condition, offset_raw):
        if int(condition) == 0:
            self.op_sjump(offset_raw)


    def op_cjne(self, dest,src,offset_raw):
        a = int(dest)
        b = int(src)
        result = a - b
        
        self.op_condition_jump(result, offset_raw)

        if result < 0:
            self.PSW[7] = 1
        else:
            self.PSW[7]= 0
    
    def op_push(self, store_cell):
        self.SP += 1
        self.IRAM[int(self.SP)].set(int(store_cell))
        return self


    def op_pop(self, store_cell):
        store_cell.set(int(self.IRAM[int(self.SP)]))
        self.SP -= 1
        return self



    def op_call(self, addr):
        pc = int(self.PC)
        self.op_push(pc & 0xFF)
        self.op_push((pc >> 8) & 0xFF)
        self.PC.set(int(addr))
        return self


    def op_ret(self):
        temp = mem.mem()
        self.op_pop(temp)
        high8bit = int(temp)
        self.op_pop(temp)
        low8bit = int(temp)
        self.PC.set((high8bit << 8) + low8bit)
        return self


    def op_inc(self, dest):
        value = dest.get() + 1
        dest += 1
        return value

    def op_dec(self, dest):
        value = dest.get() - 1
        dest -= 1
        return value

    def __adduc(self, dest, src, using_carry = False):
        psw = int(self.PSW)
        ci =  ((psw & 0x80) >> 7) if using_carry else 0

        a = int(dest)
        b = int(src)
        s = a + b + ci

        co = 0
        ac = 0
        ov = 0

        if (s > 0xFF):
            co = 1
        
        if ((a & 0x0F) + (b & 0x0F) > 0x0F):
            ac = 1
        

        if ((((~a) & (~b) & s) | (a & b & (~s))) & 0x80):
            ov = 1
        
        dest.set(s)
        self.PSW.set((psw & 0x3B) + (co << 7) + (ac << 6) + (ov << 2))

    def op_add(self, dest, src):
        self.__adduc(dest, src, False)
    
    def op_addc(self, dest, src):
        self.__adduc(dest, src, True)


    def op_subb(self, dest, src):
        psw = int(self.PSW)
        ci = (psw & 0x80) >> 7
        a = int(dest)
        b = int(src)
        result = a - b - ci
        co = 0
        ac = 0
        ov = 0
        if result < 0:
            result = 0x100 + result #two's complement
            co = 1

        if (a&0xF) - (b&0xF) - ci < 0:
            ac = 1
    
        if (((~a)&b&result)|(a&(~b)&(~result)))&0x80:
            ov = 1
    
        dest.set(result)
        self.PSW.set((psw & 0x3B) + (co << 7) + (ac << 6) + (ov << 2))

    
    def op_div(self):
        a = self.A.get()
        b = self.B.get()
        self.PSW[7] = 0
        if  b == 0:
            self.PSW[2] = 1
        else:
            self.PSW[2] = 0
            quotient = a//b
            remainder = a % b
            self.A.set(quotient)
            self.B.set(remainder)
        


    def op_mul(self):
        a = int(self.A)
        b = int(self.B)
        self.PSW[7] = 0
        product = a*b
        if  product > 0xFF:
            self.PSW[2] = 1
        else:
            self.PSW[2] = 0
            
        self.A.set(product & 0xFF)
        self.B.set(product >> 8)


    def op_da(self):
        a = int(self.A)
        carry = self.PSW[7]

        if ((a&0x0F) > 9) or (int(self.PSW) & 0x40):
            a += 6
        
        if a > 0xFF:
            carry = 1

        if ((a&0xF0) > 0x90) or (carry):
            a += 0x60
        
        if a>0xFF:
            carry = 1

        if carry:
            self.PSW[7] = 1
            
        self.A.set(a)


    def op_orl(self, dest, src):
        dest |= src


    def op_anl(self, dest, src):
        dest &= src
    
    def op_orl_bit(self, dest, src,inverted = False):
        b = dest.get()
        if inverted:
            dest.set(b | (~src.get()))
        else:
             dest.set(b | src.get())


    def op_anl_bit(self,dest,src,inverted = False):
        b = dest.get()
        if inverted:
            dest.set(b & (~src.get()))
        else:
             dest.set(b & src.get())


    def op_xrl(self,dest,src):
        dest ^= src


    def __rrcc(self, dest, use_cy):
        val = int(dest)
        b0 = val & 0x01
        if use_cy:
            si = self.PSW[7]
            self.PSW[7] = b0
        else:
            si = b0

        val = (val >> 1) & 0x7F
        val |= (si << 7)
        dest.set(val)
    

    def op_rr(self, dest):
        self.__rrcc(dest, False)


    def op_rrc(self, dest):
        self.__rrcc(dest, True)


    def __rlcc(self, dest, use_cy):
        val = int(dest)
        b7 = (val & 0x80) >> 7

        if use_cy:    
            si = self.PSW[7]
            self.PSW[7] = b7
        
        else:
            si = b7
    
        val = (val << 1) & 0xFE
        val |= si
        dest.set(val)


    def op_rl(self, dest):
        self.__rlcc(dest,False)
    

    def op_rlc(self, dest):
        self.__rlcc(dest,True)


    def op_cpl(self, dest):
        dest.set(~int(dest))
        return self


    def op_xch(self, dest, src):
        tmp = int(dest)
        dest.set(int(src))
        src.set(int(tmp))


    def op_xchd(self, dest, src):
        a = int(dest)
        b = int(src)
        al = a&0x0F
        bl = b&0x0F
        a = (a&0xF0) | bl
        b = (b&0xF0) | al
        dest.set(a)
        src.set(b)


    def op_move(self, dest, src):
        dest.set(int(src))
        