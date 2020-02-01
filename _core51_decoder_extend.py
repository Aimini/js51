import _core51_operation_extend
import mem_bit_ref
class _core51_decoder_extend(_core51_operation_extend._core51_operation_extend):
    def __init__(self):
        super().__init__()
        self.interrupt_end_linstener = []
        self.irq = []

    def execute_one(self):
        opcode = self.fetch_opcode()
        if opcode.test(0x01, 0x1F):
            #AJMP addr11
            addr11 = ((opcode.value << 3) & 0x700) | int(self.fetch_const())
            addr11 = (self.PC.get() & 0xF800) |  addr11
            self.PC.set(addr11)
        elif opcode.test(0x11, 0x1F):
            #ACALL 0x11
            addr11 = ((opcode.value << 3) & 0x700) | int(self.fetch_const())
            addr11 = (self.PC.get() & 0xF800) |  addr11
            self.op_call(addr11)
        elif opcode.value < 0x80:
            #0x00 - 0x7F
            if opcode.value < 0x40:
                self.__execute_decode_00_3F(opcode)
            else :
                self.__execute_decode_40_7F(opcode)
            
        else :
            #0x80 - 0xFF
            if opcode.value < 0xC0:
                self.__execute_decode_80_BF(opcode)
            else :
                self.__execute_decode_C0_FF(opcode)
            
        

        for i in self.irq:
            irqn = i()
            if irqn >= 0:
                self.op_call((irqn << 3) + 3)

        



    def __execute_decode_00_3F (self, opcode):
        if opcode.value < 0x20:
            # 0x00 - 0x1F
            if opcode.value < 0x10:
                self.__execute_decode_00_0F(opcode)
            else :
                self.__execute_decode_10_1F(opcode)
            
        
        else :
            # 0x20 - 0x3F
            if opcode.value < 0x30:
                self.__execute_decode_20_2F(opcode)
            else :
                self.__execute_decode_30_3F(opcode)
            
        


    def __execute_decode_00_0F(self, opcode):
        if opcode.test(0x00):
            #NOP
            pass
        elif opcode.test(0x02):
            #LJMP addr16
            self.PC.set(self.fetch_const16())
        
        elif opcode.test(0x03):
            #RR A
            self.op_rr(self.A)
        elif opcode.test(0x04):
            #INC A
            self.op_inc(self.A)
        elif opcode.test(0x05):
            #INC direct
            self.op_inc(self.fetch_direct())
        elif opcode.test(0x06, 0xFE):
            #INC @Ri
            self.op_inc(opcode.ri())
        elif opcode.test(0x08, 0xF8):
            #INC Rn
            self.op_inc(opcode.rn())
        


    def __execute_decode_10_1F(self, opcode):
        if opcode.test(0x10):
            #JBC bit,offset
            bit_cell = self.fetch_bit()
            offset_raw = self.fetch_const()
            self.op_condition_jump(bit_cell, offset_raw)
            bit_cell.set(0)
        elif opcode.test(0x12):
            #LCALL addr16
            self.op_call(self.fetch_const16())
        elif opcode.test(0x13):
            # RRC A
            self.op_rrc(self.A)
        elif opcode.test(0x14):
            #DEC A
            self.op_dec(self.A)
        elif opcode.test(0x15):
            #DEC direct
            self.op_dec(self.fetch_direct())
        elif opcode.test(0x16, 0xFE):
            #DEC @Ri
            self.op_dec(opcode.ri())
        elif opcode.test(0x18, 0xF8):
            #DEC Rn
            self.op_dec(opcode.rn())
        


    def __execute_decode_20_2F(self, opcode):
        if opcode.test(0x20):
            #JB bit, offset
            b = self.fetch_bit()
            offset_raw = self.fetch_const()
            self.op_condition_jump(b, offset_raw)
        elif opcode.test(0x22):
            #RET
            b = self.op_ret()
        elif opcode.test(0x23):
            #RL A
            self.op_rl(self.A)
        elif opcode.test(0x24):
            #ADD A, #immed
            self.op_add(self.A, self.fetch_const())
        elif opcode.test(0x25):
            #ADD A, direct
            self.op_add(self.A, self.fetch_direct())
        elif opcode.test(0x26, 0xFE):
            #ADD A, @Ri
            self.op_add(self.A, opcode.ri())
        elif opcode.test(0x28, 0xF8):
            #ADD A, Rn
            self.op_add(self.A, opcode.rn())
        


    def __execute_decode_30_3F(self, opcode):
        if opcode.test(0x30):
            #JNB bit,offset
            b = self.fetch_bit()
            offset_raw = self.fetch_const()
            self.op_not_condition_jump(b, offset_raw)

        elif opcode.test(0x32):
            #RETI
            self.op_ret()
            for l in self.interrupt_end_linstener:
                l()
            
        elif opcode.test(0x33):
            # RLC A
            self.op_rlc(self.A)
        elif opcode.test(0x34):
            #ADDC A,#immed
            self.op_addc(self.A, self.fetch_const())
        elif opcode.test(0x35):
            #ADDC A,direct
            self.op_addc(self.A, self.fetch_direct())
        elif opcode.test(0x36, 0xFE):
            #ADDC A,@Ri
            self.op_addc(self.A, opcode.ri())
        elif opcode.test(0x38, 0xF8):
            #ADDC A,Rn
            self.op_addc(self.A, opcode.rn())
        



    def __execute_decode_40_7F (self, opcode):
        if opcode.value < 0x60:
            # 0x40 - 0x5F
            if opcode.value < 0x50:
                self.__execute_decode_40_4F(opcode)
            else :
                self.__execute_decode_50_5F(opcode)
        else :
            # 0x60 - 0x7F
            if opcode.value < 0x70:
                self.__execute_decode_60_6F(opcode)
            else :
                self.__execute_decode_70_7F(opcode)
            
        




    def __execute_decode_40_4F (self, opcode):
        if opcode.test(0x40):
            #JC offset
            CY = mem_bit_ref.mem_bit_ref(self.PSW,7)
            self.op_condition_jump(CY, self.fetch_const())
        elif opcode.test(0x42):
            #ORL direct,A
            self.op_orl(self.fetch_direct(), self.A)
        elif opcode.test(0x43):
            #ORL direct,#immed
            direct = self.fetch_direct()
            immed = self.fetch_const()
            self.op_orl(direct, immed)
        elif opcode.test(0x44):
            #ORL A,#immed
            immed = self.fetch_const()
            self.op_orl(self.A, immed)
        elif opcode.test(0x45):
            #ORL A,direct
            self.op_orl(self.A, self.fetch_direct())
        elif opcode.test(0x46, 0xFE):
            #ORL A,@Ri
            self.op_orl(self.A, opcode.ri())
        elif opcode.test(0x48, 0xF8):
            #ORL A,Rn
            self.op_orl(self.A, opcode.rn())
        



    def __execute_decode_50_5F (self, opcode):
        if opcode.test(0x50):
            #JNC offset
            CY = mem_bit_ref.mem_bit_ref(self.PSW, 7)
            self.op_not_condition_jump(CY, self.fetch_const())
        elif opcode.test(0x52):
            #ANL direct,A
            self.op_anl(self.fetch_direct(), self.A)
        elif opcode.test(0x53):
            #ANL direct,#immed
            direct = self.fetch_direct()
            immed = self.fetch_const()
            self.op_anl(direct, immed)
        elif opcode.test(0x54):
            #ANL A,#immed
            self.op_anl(self.A, self.fetch_const())
        elif opcode.test(0x55):
            #ANL A,direct
            self.op_anl(self.A, self.fetch_direct())
        elif opcode.test(0x56, 0xFE):
            #ANL A,@Ri
            self.op_anl(self.A, opcode.ri())
        elif opcode.test(0x58, 0xF8):
            #ANL A,Rn
            self.op_anl(self.A, opcode.rn())
        


    def __execute_decode_60_6F (self, opcode):
        if opcode.test(0x60):
            #JZ offset
            offset_raw = self.fetch_const()
            if int(self.A) == 0:
                self.op_sjump(offset_raw)
        elif opcode.test(0x62):
            #XRL direct,A
            self.op_xrl(self.fetch_direct(), self.A)
        elif opcode.test(0x63):
            #XRL direct,#immed
            direct = self.fetch_direct()
            immed = self.fetch_const()
            self.op_xrl(direct, immed)
        elif opcode.test(0x64):
            #XRL A,#immed
            self.op_xrl(self.A, self.fetch_const())
        elif opcode.test(0x65):
            #XRL A,direct
            self.op_xrl(self.A, self.fetch_direct())
        elif opcode.test(0x66, 0xFE):
            #XRL A,@Ri
            self.op_xrl(self.A, opcode.ri())
        elif opcode.test(0x68, 0xF8):
            #XRL A,Rn
            self.op_xrl(self.A, opcode.rn())
        



    def __execute_decode_70_7F (self, opcode):
        if opcode.test(0x70):
            #JNZ offset
            offset_raw = self.fetch_const()
            if int(self.A) != 0:
                self.op_sjump(offset_raw)
        elif opcode.test(0x72):
            #ORL C,bit
            CY = mem_bit_ref.mem_bit_ref(self.PSW, 7)
            self.op_orl_bit(CY, self.fetch_bit())
        elif opcode.test(0x73):
            #JMP @A+DPTR
            self.PC.set(self.A.get() + self.DPTR.get())
        elif opcode.test(0x74):
            #MOV A,#immed
            self.A.set(self.fetch_const())
        elif opcode.test(0x75):
            #MOV direct,#immed
            direct = self.fetch_direct()
            immed =  self.fetch_const()
            self.op_move(direct, immed)
        elif opcode.test(0x76, 0xFE):
            #  MOV   @Ri,#immed
            self.op_move(opcode.ri(), self.fetch_const())
        elif opcode.test(0x78, 0xF8):
            #  MOV   Rn,#immed
            self.op_move(opcode.rn(), self.fetch_const())
        



    def __execute_decode_80_BF (self, opcode):

        if opcode.value < 0xA0:
            if opcode.value < 0x90:
                self.__execute_decode_80_8F(opcode)
            else :
                self.__execute_decode_90_9F(opcode)
            
        else :
            if opcode.value < 0xB0:
                self.__execute_decode_A0_AF(opcode)
            else :
                self.__execute_decode_B0_BF(opcode)
            
        



    def __execute_decode_80_8F(self, opcode):
        if opcode.test(0x80):
            #SJMP offset
            self.op_sjump(self.fetch_const())
        elif opcode.test(0x82):
            #ANL C,bit
            CY = mem_bit_ref.mem_bit_ref(self.PSW, 7)
            self.op_anl_bit(CY, self.fetch_bit())
        elif opcode.test(0x83):
            #MOVC A, @A+PC
            self.op_move(self.A, self.ROM[self.A.get() + self.PC.get()])
        elif opcode.test(0x84):
            #DIV AB
            self.op_div()
        elif opcode.test(0x85):
            # MOV direct_dest, direct_src2
            src = self.fetch_direct()
            dest = self.fetch_direct()
            self.op_move(dest, src)
        elif opcode.test(0x86, 0xFE):
            # MOV direct,@Ri
            self.op_move(self.fetch_direct(), opcode.ri())
        elif opcode.test(0x88, 0xF8):
            # MOV direct,Rn
            self.op_move(self.fetch_direct(), opcode.rn())
        



    def __execute_decode_90_9F(self, opcode):
        if opcode.test(0x90):
            #MOV DPTR,#immed
            self.DPTR.set(self.fetch_const16())
        elif opcode.test(0x92):
            #MOV bit,C
            CY = mem_bit_ref.mem_bit_ref(self.PSW, 7)
            self.op_move(self.fetch_bit(), CY)
        elif opcode.test(0x93):
            #MOVC A,@A+DPTR
            self.op_move(self.A, self.ROM[self.A.get() + self.DPTR.get()])
        elif opcode.test(0x94):
            #SUBB A,#immed
            self.op_subb(self.A, self.fetch_const())
        elif opcode.test(0x95):
            #SUBB A,direct
            self.op_subb(self.A, self.fetch_direct())
        elif opcode.test(0x96, 0xFE):
            #SUBB A,@Ri
            self.op_subb(self.A, opcode.ri())
        elif opcode.test(0x98, 0xF8):
            #SUBB A,Rn
            self.op_subb(self.A, opcode.rn())
        



    def __execute_decode_A0_AF(self, opcode):
        if opcode.test(0xA0):
            # ORL C,/bit
            CY = mem_bit_ref.mem_bit_ref(self.PSW, 7)
            self.op_orl_bit(CY, self.fetch_bit(), True)
        elif opcode.test(0xA2):
            # MOV C,bit
            CY = mem_bit_ref.mem_bit_ref(self.PSW, 7)
            self.op_move(CY, self.fetch_bit())
        elif opcode.test(0xA3):
            # INC DPTR
            self.op_inc(self.DPTR)
        elif opcode.test(0xA4):
            # MUL AB
            self.op_mul()
        elif opcode.test(0xA5):
            # USER DEFINED 
            return 0
        elif opcode.test(0xA6, 0xFE):
            # MOV @Ri,direct 
            self.op_move(opcode.ri(), self.fetch_direct())
        elif opcode.test(0xA8, 0xF8):
            # MOV Rn,direct 
            self.op_move(opcode.rn(), self.fetch_direct())
        



    def __execute_decode_B0_BF(self, opcode):
        if opcode.test(0xB0):
            #ANL C,/bit
            CY = mem_bit_ref.mem_bit_ref(self.PSW, 7)
            self.op_anl_bit(CY, self.fetch_bit(), True)
        elif opcode.test(0xB2):
            #CPL bit
            self.op_cpl(self.fetch_bit())
        elif opcode.test(0xB3):
            #CPL C
            CY = mem_bit_ref.mem_bit_ref(self.PSW, 7)
            self.op_cpl(CY)
        elif opcode.test(0xB4):
            #CJNE A,#immed,offset
            immed = self.fetch_const()
            offset_raw = self.fetch_const()
            self.op_cjne(self.A, immed, offset_raw)
        elif opcode.test(0xB5):
            #CJNE A,direct,offset
            direct = self.fetch_direct()
            offset_raw = self.fetch_const()
            self.op_cjne(self.A, direct, offset_raw)
        elif opcode.test(0xB6, 0xFE):
            #CJNE @Ri,#immed,offset
            immed = self.fetch_const()
            offset_raw = self.fetch_const()
            self.op_cjne(opcode.ri(), immed, offset_raw)
        elif opcode.test(0xB8, 0xF8):
            #CJNE Rn,#immed,offset
            immed = self.fetch_const()
            offset_raw = self.fetch_const()
            self.op_cjne(opcode.rn(), immed, offset_raw)
        



    def __execute_decode_C0_FF (self, opcode):
        if opcode.value < 0xE0:
            if opcode.value < 0xD0:
                self.__execute_decode_C0_CF(opcode)
            else :
                self.__execute_decode_D0_DF(opcode)
            
        else :
            if opcode.value < 0xF0:
                self.__execute_decode_E0_EF(opcode)
            else :
                self.__execute_decode_F0_FF(opcode)
            
        



    def __execute_decode_C0_CF (self, opcode):
        if opcode.test(0xC0):
            #PUSH direct
            self.op_push(self.fetch_direct())
        elif opcode.test(0xC2):
            #CLR bit
            self.fetch_bit().set(0)
        elif opcode.test(0xC3):
            #CLR C
            CY = mem_bit_ref.mem_bit_ref(self.PSW, 7)
            CY.set(0)
        elif opcode.test(0xC4):
            #SWAP A
            a = self.A.get()
            self.A.set(((a & 0xF0) >> 4) | ((a & 0x0F) << 4))
        elif opcode.test(0xC5):
            #XCH A,direct
            self.op_xch(self.A, self.fetch_direct())
        elif opcode.test(0xC6, 0xFE):
            #XCH A,@Ri
            self.op_xch(self.A, opcode.ri())
        elif opcode.test(0xC8, 0xF8):
            #XCH A,Rn
            self.op_xch(self.A, opcode.rn())
        




    def __execute_decode_D0_DF (self, opcode):
        if opcode.test(0xD0):
            #POP direct
            self.op_pop(self.fetch_direct())
        elif opcode.test(0xD2):
            #SETB bit
            self.fetch_bit().set(1)
        elif opcode.test(0xD3):
            #SETB C
            CY = mem_bit_ref.mem_bit_ref(self.PSW, 7)
            CY.set(1)
        elif opcode.test(0xD4):
            #DA A
            self.op_da()
        elif opcode.test(0xD5):
            # DJNZ direct,offset
            direct = self.fetch_direct()
            offset = self.fetch_const()
            #consider PSW = 0x02  and ACC = 0
            # when excute PSW dec step,
            # we consider PSW = 0x02 - 1 = 0x01
            # but ACC parity flag make PSW = 0x00
            # but! the standard CPU still using result 0x01 to make judgement
            value = self.op_dec(direct)
            if value != 0:
                self.op_sjump(offset)
        elif opcode.test(0xD6, 0xFE):
            # XCHD A,@Ri
            self.op_xchd(self.A, opcode.ri())
        elif opcode.test(0xD8, 0xF8):
            # DJNZ Rn,offset
            Rn = opcode.rn()
            offset_raw = self.fetch_const()
            self.op_dec(Rn)
            if Rn.get() != 0:
                self.op_sjump(offset_raw)
        



    def __execute_decode_E0_EF (self, opcode):

        if opcode.test(0xE0):
            #MOVX A,@DPTR
            self.op_move(self.A, self.XRAM[self.DPTR.get()])
        elif opcode.test(0xE2, 0xFE):
            #MOVX A,@Ri
            self.op_move(self.A, self.XRAM[opcode.riaddr().get()])
        elif opcode.test(0xE4):
            #CLR A
            self.A.set(0)
        elif opcode.test(0xE5):
            #MOV A,direct
            self.op_move(self.A, self.fetch_direct())
        elif opcode.test(0xE6, 0xFE):
            #MOV A,@Ri
            self.op_move(self.A, opcode.ri())
        elif opcode.test(0xE8, 0xF8):
            #MOV A,Rn
            self.op_move(self.A, opcode.rn())
        



    def __execute_decode_F0_FF (self, opcode):
        if opcode.test(0xF0):
            #MOVX @DPTR,A
            self.XRAM[self.DPTR.get()] = self.A.get()
        elif opcode.test(0xF2, 0xFE):
            #MOVX @Ri,A
            self.XRAM[opcode.riaddr().get()] = self.A.get()
        elif opcode.test(0xF4):
            #CPL A
            self.A.set(~self.A.get())
        elif opcode.test(0xF5):
            #MOV direct,A
            self.op_move(self.fetch_direct(), self.A)
        elif opcode.test(0xF6, 0xFE):
            #MOV @Ri,A
            self.op_move(opcode.ri(), self.A)
        elif opcode.test(0xF8, 0xF8):
            #MOV Rn,A
            self.op_move(opcode.rn(), self.A)
        
