
_51cpu.prototype.execute_one = function () {
    let opcode = this.fetch_opcode();
    if (opcode.test(0x00)) {
        //NOP
    } else if (opcode.test(0x01, 0x1F)) {
        //AJMP addr11
        this.PC.set(opcode.fetch_addr11())
    } else if (opcode.test(0x02)) {
        //LJMP addr16
        this.PC.set(this.fetch_const16())
    }
    else if (opcode.test(0x03)) {
        //RR A
        let val = this.A.get()
        let low = val & 0x01
        val = (val >> 1) & 0x7F
        val |= (low << 7)
        this.A.set(val)
    } else if (opcode.test(0x04)) {
        //INC A
        this.op_inc(this.A)
    } else if (opcode.test(0x05)) {
        //INC direct
        this.op_inc(this.fetch_direct())
    } else if (opcode.test(0x06, 0xFE)) {
        //INC @Ri
        this.op_inc(opcode.get_Ri())
    } else if (opcode.test(0x08, 0xF8)) {
        //INC Rn
        this.op_inc(opcode.get_Rn())
    } else if (opcode.test(0x10)) {
        //JBC bit,offset
        let bit_cell = this.fetch_bit()
        let offset_raw = this.fetch_const()
        if (bit_cell.get()) {
            bit_cell.set(0)
            this.op_add_offset(offset_raw)
        }
    } else if (opcode.test(0x11, 0x1F)) {
        //ACALL 0x11
        this.op_call(opcode.fetch_addr11())
    } else if (opcode.test(0x12)) {
        //LCALL addr16
        let addr16 = this.fetch_const16()
        this.op_call(addr16)
    } else if (opcode.test(0x13)) {
        // RRC A
        let psw = this.PSW.get()
        let carry = psw & 0x80

        let a = this.A.get()
        let low = (a & 0x01)

        a = ((a >> 1) & 0x7F) + carry
        psw = (psw & 0x7F) + (low << 7)

        this.A.set(a)
        this.PSW.set(psw)
    } else if (opcode.test(0x14)) {
        //DEC A
        this.op_dec(this.A)
    } else if (opcode.test(0x15)) {
        //DEC direct
        this.op_dec(this.fetch_direct())
    } else if (opcode.test(0x16, 0xFE)) {
        //DEC @Ri
        this.op_dec(opcode.get_Ri())
    } else if (opcode.test(0x18, 0xF8)) {
        //DEC Rn
        this.op_dec(opcode.get_Rn())
    } else if (opcode.test(0x20)) {
        //JB bit, offset
        let b = this.fetch_bit()
        let offset_raw = this.fetch_const()
        if (b.get())
            this.op_add_offset(offset_raw)
    } else if (opcode.test(0x22)) {
        //RET
        let b = this.op_ret()
    } else if (opcode.test(0x23)) {
        //RL A
        let value = this.A.get()
        let high = value & 0x80
        value = ((value << 1) + (high >> 7)) & 0xFF
        this.A.set(value)
    }else if (opcode.test(0x24)) {
        //ADD A, #immed
        this.op_add(this.A,this.fetch_const())
    } else if (opcode.test(0x25)) {
        //ADD A, direct
        this.op_add(this.A,this.fetch_direct())
    } else if (opcode.test(0x26,0xFE)) {
        //ADD A, @Ri
        this.op_add(this.A,opcode.get_Ri())
    }else if (opcode.test(0x28,0xF8)) {
        //ADD A, Rn
        this.op_add(this.A,opcode.get_Rn())
    }else if (opcode.test(0x30)) {
        //JNB bit,offset
        let bit =this.fetch_bit()
        let offset_raw = this.fetch_const()
        if(!bit.get())
            this.op_add_offset(offset_raw)
    }else if (opcode.test(0x32)) {
        //RETI
        this.op_ret()
        for(let l of this.interrupt_end_linstener){
            l()
        }
    } else if (opcode.test(0x33)) {
        // RLC A
        let psw = this.PSW.get()
        let carry = psw & 0x80

        let a = this.A.get()
        let high = (a & 0x80)

        a = ((a << 1) & 0xFE) + (carry >> 7)
        psw = (psw & 0x7F) + high

        this.A.set(a)
        this.PSW.set(psw)
    } else if (opcode.test(0x34)) {
        //ADDC A,#immed
        this.op_add(this.A,this.fetch_const(),true)
    } else if (opcode.test(0x35)) {
        //ADDC A,direct
        this.op_add(this.A,this.fetch_direct(),true)
    } else if (opcode.test(0x36,0xFE)) {
        //ADDC A,@Ri
        this.op_add(this.A,opcode.get_Ri(),true)
    } else if (opcode.test(0x38,0xF8)) {
        //ADDC A,Rn
        this.op_add(this.A,opcode.get_Rn(),true)
    } else if (opcode.test(0x40)) {
        //JC offset
        let offset_raw = this.fetch_const()
        if(this.PSW.get() & 0x80)
            this.op_add_offset(offset_raw)
    } else if (opcode.test(0x42)) {
        //ORL direct,A
        let direct = this.fetch_direct()
        this.orl(direct,this.A)
    } else if (opcode.test(0x43)) {
        //ORL direct,#immed
        let direct = this.fetch_direct()
        let immed = this.fetch_const()
        this.orl(direct,immed)
    } else if (opcode.test(0x44)) {
        //ORL A,#immed
        let immed = this.fetch_const()
        this.orl(this.A,immed)
    } else if (opcode.test(0x45)) {
        //ORL A,direct
        this.orl(this.A,this.fetch_direct())
    } else if (opcode.test(0x46,0xFE)) {
        //ORL A,@Ri
        this.orl(this.A,opcode.get_Ri())
    } else if (opcode.test(0x48,0xF8)) {
        //ORL A,Rn
        this.orl(this.A,opcode.get_Rn())
    } else if (opcode.test(0x50)) {
        //JNC offset
        let offset_raw = this.fetch_const()
        if((~this.PSW.get()) & 0x80)
            this.op_add_offset(offset_raw)
    } else if (opcode.test(0x52)) {
        //ANL direct,A
        let direct = this.fetch_direct()
        this.op_anl(direct,this.A)
    } else if (opcode.test(0x53)) {
        //ANL direct,#immed
        let direct = this.fetch_direct()
        let immed = this.fetch_const()
        this.op_anl(direct,immed)
    }  else if (opcode.test(0x54)) {
        //ANL A,#immed
        this.op_anl(this.A,this.fetch_const())
    }  else if (opcode.test(0x55)) {
        //ANL A,direct
        this.op_anl(this.A,this.fetch_direct())
    }  else if (opcode.test(0x56,0xFE)) {
        //ANL A,@Ri
        this.op_anl(this.A,opcode.get_Ri())
    }  else if (opcode.test(0x58,0xF8)) {
        //ANL A,Rn
        this.op_anl(this.A,opcode.get_Rn())
    }  else if (opcode.test(0x60)) {
        //JZ offset
        let offset_raw = this.fetch_const()
        if(this.A.get() == 0)
            this.op_add_offset(offset_raw)
    }  else if (opcode.test(0x62)) {
        //XRL direct,A
        let direct = this.fetch_direct()
        this.op_xrl(direct,this.A)
    }  else if (opcode.test(0x63)) {
        //XRL direct,#immed
        let direct = this.fetch_direct()
        let immed = this.fetch_const()
        this.op_xrl(direct,immed)
    }  else if (opcode.test(0x64)) {
        //XRL A,#immed
        let immed = this.fetch_const()
        this.op_xrl(this.A,immed)
    }  else if (opcode.test(0x65)) {
        //XRL A,direct
        this.op_xrl(this.A,this.fetch_direct())
    }  else if (opcode.test(0x66,0xFE)) {
        //XRL A,@Ri
        this.op_xrl(this.A,opcode.get_Ri())
    }  else if (opcode.test(0x68,0xF8)) {
        //XRL A,Rn
        this.op_xrl(this.A,opcode.get_Rn())
    }  else if (opcode.test(0x70)) {
        //JNZ offset
        let offset_raw = this.fetch_const()
        if(this.A.get() != 0)
            this.op_add_offset(offset_raw)
    }  else if (opcode.test(0x72)) {
        //ORL C,bit
        this.op_orl_bit(this.fetch_bit())
    }  else if (opcode.test(0x73)) {
        //JMP @A+DPTR
        this.PC.set(this.A.get() + this.DPTR.get())
    }  else if (opcode.test(0x74)) {
        //MOV A,#immed
        this.A.set(this.fetch_const())
    } else if (opcode.test(0x75)) {
        //MOV direct,#immed
        let direct = this.fetch_direct()
        let immed = this.fetch_const()
        this.op_move(direct, immed)
    } else if (opcode.test(0x76, 0xFE)) {
        //  MOV   @Ri,#immed
        let Ri = opcode.get_Ri()
        this.op_move(Ri, this.fetch_const())
    } else if (opcode.test(0x78, 0xF8)) {
        //  MOV   Rn,#immed
        let Rn = opcode.get_Rn()
        this.op_move(Rn, this.fetch_const())
    } else if (opcode.test(0x80)) {
        //SJMP offset
        this.op_add_offset(this.fetch_const())
    } else if (opcode.test(0x82)) {
        //ANL C,bit
        this.op_anl_bit(this.fetch_bit())
    } else if (opcode.test(0x83)) {
        //MOVC A, @A+PC
        this.op_move(this.A,this.IDATA.get(this.A.get() + this.PC.get()))
    } else if (opcode.test(0x84)) {
        //DIV AB
        this.op_div()
    } else if (opcode.test(0x85)) {
        // MOV direct_dest, direct_src2
        let src = this.fetch_direct()
        let dest = this.fetch_direct()
        this.op_move(dest, src)
    } else if (opcode.test(0x86,0xFE)) {
        // MOV direct,@Ri
        this.op_move(this.fetch_direct(), opcode.get_Ri())
    } else if (opcode.test(0x88,0xF8)) {
        // MOV direct,Rn
        this.op_move(this.fetch_direct(), opcode.get_Rn())
    } else if (opcode.test(0x90)) {
        //MOV DPTR,#immed
        this.DPTR.set(this.fetch_const16())
    } else if (opcode.test(0x92)) {
        //MOV bit,C
        this.op_move(this.fetch_bit(),this.PSW.carry)
    } else if (opcode.test(0x93)) {
        //MOV A,@A+DPTR
        this.op_move(this.A,this.IDATA.get(this.A.get() + this.DPTR.get()))
    } else if (opcode.test(0x94)) {
        //SUBB A,#immed
        this.op_subb(this.A,this.fetch_const())
    } else if (opcode.test(0x95)) {
        //SUBB A,direct
        this.op_subb(this.A,this.fetch_direct())
    } else if (opcode.test(0x96,0xFE)) {
        //SUBB A,@Ri
        this.op_subb(this.A,opcode.get_Ri() )
    } else if (opcode.test(0x98,0xF8)) {
        //SUBB A,Rn
        this.op_subb(this.A,opcode.get_Rn() )
    } else if (opcode.test(0xA0)) {
        // ORL C,/bit
        this.op_orl_bit(this.fetch_bit(),true)
    } else if (opcode.test(0xA2)) {
        // MOV C,bit
        this.op_move(this.PSW.carry,this.fetch_bit())
    } else if (opcode.test(0xA3)) {
        // INC DPTR
        this.op_inc(this.DPTR)
    } else if (opcode.test(0xA4)) {
        // MUL AB
        this.op_mul()
    } else if (opcode.test(0xA5)) {
        // USER DEFINED 
        return 0
    } else if (opcode.test(0xA6,0xFE)) {
        // MOV @Ri,direct 
        this.op_move(opcode.get_Ri(),this.fetch_direct())
    } else if (opcode.test(0xA8,0xF8)) {
        // MOV Rn,direct 
        this.op_move(opcode.get_Rn(),this.fetch_direct())
    } else if (opcode.test(0xB0)) {
        //ANL C,/bit
        this.op_anl_bit(this.fetch_bit(),true)
    } else if (opcode.test(0xB2)) {
        //CPL bit
        this.op_cpl(this.fetch_bit())
    } else if (opcode.test(0xB3)) {
        //CPL C
        this.op_cpl(this.PSW.carry)
    } else if (opcode.test(0xB4)) {
        //CJNE A,#immed,offset
        let immed = this.fetch_const()
        let offset_raw = this.fetch_const()
        this.op_cjne(this.A,immed,offset_raw)
    } else if (opcode.test(0xB5)) {
        //CJNE A,direct,offset
        let direct = this.fetch_direct()
        let offset_raw = this.fetch_const()
        this.op_cjne(this.A,direct,offset_raw)
    } else if (opcode.test(0xB6,0xFE)) {
        //CJNE @Ri,#immed,offset
        let immed = this.fetch_const()
        let offset_raw = this.fetch_const()
        this.op_cjne(opcode.get_Ri(),immed,offset_raw)
    } else if (opcode.test(0xB8,0xF8)) {
        //CJNE Rn,#immed,offset
        let immed = this.fetch_const()
        let offset_raw = this.fetch_const()
        this.op_cjne(opcode.get_Rn(),immed,offset_raw)
    } else if (opcode.test(0xC0)) {
        //PUSH direct
        this.op_push(this.fetch_direct())
    } else if (opcode.test(0xC2)) {
        //CLR bit
        this.fetch_bit().set(0)
    } else if (opcode.test(0xC3)) {
        //CLR C
        this.PSW.carry.set(0)
    } else if (opcode.test(0xC4)) {
        //SWAP A
        let a = this.A.get()
        this.A.set(((a & 0xF0) >> 4) | ((a&0x0F)<<4))
    } else if (opcode.test(0xC5)) {
        //XCH A,direct
        this.op_xch(this.A,this.fetch_direct())
    } else if (opcode.test(0xC6,0xFE)) {
        //XCH A,@Ri
        this.op_xch(this.A,opcode.get_Ri())
    } else if (opcode.test(0xC8,0xF8)) {
        //XCH A,Rn
        this.op_xch(this.A,opcode.get_Rn())
    } else if (opcode.test(0xD0)) {
        //POP direct
        this.op_pop(this.fetch_direct())
    } else if (opcode.test(0xD2)) {
        //SETB bit
        this.fetch_bit().set(1)
    } else if (opcode.test(0xD3)) {
        //SETB C
        this.PSW.set(this.PSW.get() | 0x80)
    } else if (opcode.test(0xD4)) {
        //DA A
        this.op_da()
    } else if (opcode.test(0xD5)) {
        // DJNZ direct,offset
        let direct = this.fetch_direct()
        let offset = this.fetch_const()
        //consider PSW = 0x02  and ACC = 0
        // when excute PSW dec step,
        // we consider PSW = 0x02 - 1 = 0x01
        // but ACC parity flag make PSW = 0x00
        // but! the standard CPU still using result 0x01 to make judgement
        let value = this.op_dec(direct)
        if (value != 0)
            this.op_add_offset(offset)
    } else if (opcode.test(0xD6,0xFE)) {
        // XCHD A,@Ri
        this.op_xchd(this.A,opcode.get_Ri())
    } else if (opcode.test(0xD8,0xF8)) {
        // DJNZ Rn,offset
        let Rn = opcode.get_Rn()
        let offset_raw = this.fetch_const()
        this.op_dec(Rn)
        if(Rn.get() != 0)
            this.op_add_offset(offset_raw)
    } else if (opcode.test(0xE0)) {
         //MOVX A,@DPTR
         this.A.set(this.ERAM[this.DPTR.get()])
    } else if (opcode.test(0xE2,0xFE)) {
       //MOVX A,@Ri
       let Ri = opcode.get_Ri()
       Ri.ram = this.ERAM
       this.op_move(this.A,Ri)
    } else if (opcode.test(0xE4)) {
        //CLR A
        this.A.set(0)
    }  else if (opcode.test(0xE5)) {
        //MOV A,direct
        this.op_move(this.A,this.fetch_direct())
    } else if (opcode.test(0xE6,0xFE)) {
        //MOV A,@Ri
        this.op_move(this.A,opcode.get_Ri())
    } else if (opcode.test(0xE8,0xF8)) {
        //MOV A,Rn
        this.op_move(this.A,opcode.get_Rn())
    }  else if (opcode.test(0xF0)) {
        //MOVX @DPTR,A
        this.ERAM[this.DPTR.get()] = this.A.get()
    } else if (opcode.test(0xF2,0xFE)) {
        //MOVX @Ri,A
        let Ri = opcode.get_Ri()
        Ri.ram = this.ERAM
        this.op_move(Ri,this.A)
    } else if (opcode.test(0xF4)) {
        //CPL A
        this.A.set((~this.A.get())&0xFF)
    } else if (opcode.test(0xF5)) {
        //MOV direct,A
        this.op_move(this.fetch_direct(),this.A)
    } else if (opcode.test(0xF6,0xFE)) {
        //MOV @Ri,A
        this.op_move(opcode.get_Ri(),this.A)
    } else if (opcode.test(0xF8,0xF8)) {
        //MOV Rn,A
        this.op_move(opcode.get_Rn(),this.A)
    }
    for(i of this.irq){
        let irqn = i();
        if(irqn >= 0){
            this.op_call((irqn << 3) + 3)
        }
    }
}