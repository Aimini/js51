let CPU_NO_ERROR = 0
let CPU_ERROR_INVALID_IRAM_ADDRESS   =  2  // 
let CPU_ERROR_INVALID_ROM_ADDRESS    = 3 // try to read the ROM where doesn't have data
let CPU_ERROR_INVALID_SFR_ADDRESS    = 4
let CPU_ERROR_INVALID_XRAM_ADDRESS   = 5
function reg(value = 0, bitlen = 8) {
    this._value = value;
    this.bitlen = bitlen
    this.max = Math.pow(2, bitlen) - 1

    this.getlistener = []
    this.changedlistener = []
    this.setlistener = []
}

reg.prototype.set = function (val) {

    let oldval = this._value;
    this._value = val & this.max;

    for (let one of this.setlistener) {
        one(oldval, val);
    }
    if (oldval !== val){
        for (let one of this.changedlistener) {
            one(oldval, val);
        }
    }
    return this;
}
reg.prototype.get = function () {
    for (let one of this.getlistener) {
        one(this._value);
    }
    return this._value
}

reg.prototype.inc = function () {
    this.set((this._value + 1)& this.max)
    return this
}

reg.prototype.dec = function () {
    this.set((this._value + this.max) & this.max)
    return this
}

function memory(content){
    this.content = content
}
memory.prototype.get = function(idx){
    return this.content[idx]
}

memory.prototype.set = function(idx,value){
    this.content[idx]  = value
}
    

function _51cpu(IRAMSize = 0x100, XRAMSize = 0x10000) {
    this.A = new reg()
    this.B = new reg()
    this.PSW = new reg()
    this.SP = new reg()
    this.PC = new reg(0, 16)
    this.DPTR = new reg(0, 16)
    this.DPL = new reg()
    this.DPH = new reg()
    this.XRAM = []
    this.IRAM = []
    this.IDATA = []
    this.SFR = {
        0x81: "SP",
        0x82: "DPL",
        0x83: "DPH",
        0xD0: "PSW",
        0xE0: "A",
        0xF0: "B",
    }
    this.error_info = {
        code : CPU_NO_ERROR,
        addr : 0
    }
    
    for (let i = 0; i < IRAMSize; ++i)
        this.IRAM.push(0);
    for (let i = 0; i < XRAMSize; ++i)
        this.XRAM.push(0);

    let cpu_ref = this;

    this.DPL.get = function () {
        this._value = cpu_ref.DPTR.get() & 0xFF
        return this.__proto__.get.call(this)
    }
    
    this.DPH.get = function () {
        this._value = (cpu_ref.DPTR.get()  >> 8) & 0xFF
        return this.__proto__.get.call(this)
    }

    this.DPL.set = function (val_new) {
        cpu_ref.DPL.__proto__.set.call(this, val_new)
        let val = cpu_ref.DPTR.get()
        val &= 0xFF00
        val += val_new
        cpu_ref.DPTR.set(val)
    }

    this.DPH.set = function (val_new) {
        this.__proto__.set.call(this, val_new)
        let val = cpu_ref.DPTR.get()
        val &= 0x00FF
        val += (val_new << 8)
        cpu_ref.DPTR.set(val)
    }
    //------- Parity Flag(PSW.0) specialization --------
    //-------Can't change PF from outer method --------
    let psw_ref =this.PSW

    psw_ref.set = function (value_new) {
        let v = (value_new & 0xFE) | (this._value & 0x01)
        this.__proto__.set.call(this,v)
    }

    this.A.changedlistener.push((oldval, newval) => {
        let v = psw_ref._value;
        psw_ref._value  = (v & 0xFE) | (cpu_ref.parity() & 0x01)
        // have callback
        psw_ref.set(psw_ref._value)
    })

    //------PSW flag specification---------------

    this.PSW.carry = {
        set:function(value){
            psw_ref.set(((psw_ref._value)&0x7F) + ((value&0x01) << 7))
        },
        get:function(){
            return (psw_ref.get() >> 7) & 0x01
        }
    }

    this.interrupt_end_linstener = []
    this.addr_breakpoint = []
    this.irq = null
}

//------------------break point -----------------
_51cpu.prototype.set_addr_break = function(addr){
    this.addr_breakpoint.push(addr)
}

_51cpu.prototype.remove_addr_break = function(addr){
   this.addr_breakpoint = this.addr_breakpoint.filter(value => value != addr)
}




_51cpu.prototype.parity = function () {
    let a = this.A.get()
    return (a ^ (a >> 1) ^ (a >> 2) ^ (a >> 3) ^ (a >> 4) ^ (a >> 5) ^ (a >> 6) ^ (a >> 7)) & 0x01
}

/**
 * extend  sfr register
 *
 * @param {Map<Number,String>} ext_package
 *  key is sfr address, value is sfr name
 * @return {Map<String,reg>}
 *   return a map cantain name -> reg.
 */
_51cpu.prototype.sfr_extend = function (ext_package) {
    ret = new Map()

    for(let [addr, name] of ext_package){
        if(this.SFR[addr]){
            console.warn("overwrite SFR at address " + addr.toString(16))
        }
        this.SFR[addr] = name
        this[name] = new reg()
        ret.set(name,this[name])
    }
    return ret
}
/**
 *  reset all core register.(doesn't include sfr and ram)
 */

_51cpu.prototype.reset = function () {
    this.error_info.code = CPU_NO_ERROR
    this.A.set(0)
    this.B.set(0)
    this.PSW.set(0)
    this.SP.set(7)
    this.PC.set(0)
    this.DPTR.set(0)
}



    //--------interrupt service implement------


_51cpu.prototype.next = function (count = 1) {
    let len = 1
    for(let i = 0; i < count; ++i){
        len = this.execute_one()
        if(len == 0)
            break
        if(this.addr_breakpoint.includes(this.PC.get()))
            break;
        
    }   

}


_51cpu.prototype.coutinue = function () {
    while(true){
        this.execute_one()
        if(this.addr_breakpoint.includes(this.PC.get()))
            break;
    }
}




_51cpu.prototype.execute_one = function () {
    let opcode = this.fetch_opcode() 
    if (opcode.test(0x01, 0x1F)) {
        //AJMP addr11
        this.PC.set(opcode.fetch_addr11())
    }else if (opcode.test(0x11, 0x1F)) {
        //ACALL 0x11
        this.op_call(opcode.fetch_addr11())
    }else if (opcode.value < 0x80) {
        //0x00 - 0x7F
        if (opcode.value < 0x40) {
            this.__execute_decode_00_3F(opcode)
        } else {
            this.__execute_decode_40_7F(opcode)
        }
    } else {
        //0x80 - 0xFF
        if (opcode.value < 0xC0) {
            this.__execute_decode_80_BF(opcode)
        } else {
            this.__execute_decode_C0_FF(opcode)
        }
    }

    if (this.irq) {
        let irqn = this.irq();
        if (irqn >= 0) {
            this.op_call((irqn << 3) + 3)
        }
    }
}


_51cpu.prototype.__execute_decode_00_3F = function (opcode) {
    if (opcode.value < 0x20) {
        // 0x00 - 0x1F
        if (opcode.value < 0x10) {
            this.__execute_decode_00_0F(opcode)
        } else {
            this.__execute_decode_10_1F(opcode)
        }
    }
    else {
        // 0x20 - 0x3F
        if (opcode.value < 0x30) {
            this.__execute_decode_20_2F(opcode)
        } else {
            this.__execute_decode_30_3F(opcode)
        }
    }
}

_51cpu.prototype.__execute_decode_00_0F = function (opcode) {
    if (opcode.test(0x00)) {
        //NOP
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
    }
}

_51cpu.prototype.__execute_decode_10_1F = function (opcode) {
    if (opcode.test(0x10)) {
        //JBC bit,offset
        let bit_cell = this.fetch_bit()
        let offset_raw = this.fetch_const()
        if (bit_cell.get()) {
            bit_cell.set(0)
            this.op_add_offset(offset_raw)
        }
    }  else if (opcode.test(0x12)) {
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
    }
}

_51cpu.prototype.__execute_decode_20_2F = function (opcode) {
    if (opcode.test(0x20)) {
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
    } else if (opcode.test(0x24)) {
        //ADD A, #immed
        this.op_add(this.A, this.fetch_const())
    } else if (opcode.test(0x25)) {
        //ADD A, direct
        this.op_add(this.A, this.fetch_direct())
    } else if (opcode.test(0x26, 0xFE)) {
        //ADD A, @Ri
        this.op_add(this.A, opcode.get_Ri())
    } else if (opcode.test(0x28, 0xF8)) {
        //ADD A, Rn
        this.op_add(this.A, opcode.get_Rn())
    }
}

_51cpu.prototype.__execute_decode_30_3F = function (opcode) {
    if (opcode.test(0x30)) {
        //JNB bit,offset
        let bit = this.fetch_bit()
        let offset_raw = this.fetch_const()
        if (!bit.get())
            this.op_add_offset(offset_raw)
    } else if (opcode.test(0x32)) {
        //RETI
        this.op_ret()
        for (let l of this.interrupt_end_linstener) {
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
        this.op_add(this.A, this.fetch_const(), true)
    } else if (opcode.test(0x35)) {
        //ADDC A,direct
        this.op_add(this.A, this.fetch_direct(), true)
    } else if (opcode.test(0x36, 0xFE)) {
        //ADDC A,@Ri
        this.op_add(this.A, opcode.get_Ri(), true)
    } else if (opcode.test(0x38, 0xF8)) {
        //ADDC A,Rn
        this.op_add(this.A, opcode.get_Rn(), true)
    }
}


_51cpu.prototype.__execute_decode_40_7F = function (opcode) {
    if (opcode.value < 0x60) {
        // 0x40 - 0x5F
        if (opcode.value < 0x50) {
            this.__execute_decode_40_4F(opcode)
        } else {
            this.__execute_decode_50_5F(opcode)
        }

    } else {
        // 0x60 - 0x7F

        if (opcode.value < 0x70) {
            this.__execute_decode_60_6F(opcode)
        } else {
            this.__execute_decode_70_7F(opcode)
        }
    }

}


_51cpu.prototype.__execute_decode_40_4F = function (opcode) {
    if (opcode.test(0x40)) {
        //JC offset
        let offset_raw = this.fetch_const()
        if (this.PSW.get() & 0x80)
            this.op_add_offset(offset_raw)
    } else if (opcode.test(0x42)) {
        //ORL direct,A
        let direct = this.fetch_direct()
        this.orl(direct, this.A)
    } else if (opcode.test(0x43)) {
        //ORL direct,#immed
        let direct = this.fetch_direct()
        let immed = this.fetch_const()
        this.orl(direct, immed)
    } else if (opcode.test(0x44)) {
        //ORL A,#immed
        let immed = this.fetch_const()
        this.orl(this.A, immed)
    } else if (opcode.test(0x45)) {
        //ORL A,direct
        this.orl(this.A, this.fetch_direct())
    } else if (opcode.test(0x46, 0xFE)) {
        //ORL A,@Ri
        this.orl(this.A, opcode.get_Ri())
    } else if (opcode.test(0x48, 0xF8)) {
        //ORL A,Rn
        this.orl(this.A, opcode.get_Rn())
    }
}


_51cpu.prototype.__execute_decode_50_5F = function (opcode) {
    if (opcode.test(0x50)) {
        //JNC offset
        let offset_raw = this.fetch_const()
        if ((~this.PSW.get()) & 0x80)
            this.op_add_offset(offset_raw)
    } else if (opcode.test(0x52)) {
        //ANL direct,A
        let direct = this.fetch_direct()
        this.op_anl(direct, this.A)
    } else if (opcode.test(0x53)) {
        //ANL direct,#immed
        let direct = this.fetch_direct()
        let immed = this.fetch_const()
        this.op_anl(direct, immed)
    } else if (opcode.test(0x54)) {
        //ANL A,#immed
        this.op_anl(this.A, this.fetch_const())
    } else if (opcode.test(0x55)) {
        //ANL A,direct
        this.op_anl(this.A, this.fetch_direct())
    } else if (opcode.test(0x56, 0xFE)) {
        //ANL A,@Ri
        this.op_anl(this.A, opcode.get_Ri())
    } else if (opcode.test(0x58, 0xF8)) {
        //ANL A,Rn
        this.op_anl(this.A, opcode.get_Rn())
    }
}

_51cpu.prototype.__execute_decode_60_6F = function (opcode) {
    if (opcode.test(0x60)) {
        //JZ offset
        let offset_raw = this.fetch_const()
        if (this.A.get() == 0)
            this.op_add_offset(offset_raw)
    } else if (opcode.test(0x62)) {
        //XRL direct,A
        let direct = this.fetch_direct()
        this.op_xrl(direct, this.A)
    } else if (opcode.test(0x63)) {
        //XRL direct,#immed
        let direct = this.fetch_direct()
        let immed = this.fetch_const()
        this.op_xrl(direct, immed)
    } else if (opcode.test(0x64)) {
        //XRL A,#immed
        let immed = this.fetch_const()
        this.op_xrl(this.A, immed)
    } else if (opcode.test(0x65)) {
        //XRL A,direct
        this.op_xrl(this.A, this.fetch_direct())
    } else if (opcode.test(0x66, 0xFE)) {
        //XRL A,@Ri
        this.op_xrl(this.A, opcode.get_Ri())
    } else if (opcode.test(0x68, 0xF8)) {
        //XRL A,Rn
        this.op_xrl(this.A, opcode.get_Rn())
    }
}


_51cpu.prototype.__execute_decode_70_7F = function (opcode) {
    if (opcode.test(0x70)) {
        //JNZ offset
        let offset_raw = this.fetch_const()
        if (this.A.get() != 0)
            this.op_add_offset(offset_raw)
    } else if (opcode.test(0x72)) {
        //ORL C,bit
        this.op_orl_bit(this.fetch_bit())
    } else if (opcode.test(0x73)) {
        //JMP @A+DPTR
        this.PC.set(this.A.get() + this.DPTR.get())
    } else if (opcode.test(0x74)) {
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
    }
}


_51cpu.prototype.__execute_decode_80_BF = function (opcode) {

    if (opcode.value < 0xA0) {
        if (opcode.value < 0x90) {
            this.__execute_decode_80_8F(opcode)
        } else {
            this.__execute_decode_90_9F(opcode)
        }
    } else {
        if (opcode.value < 0xB0) {
            this.__execute_decode_A0_AF(opcode)
        } else {
            this.__execute_decode_B0_BF(opcode)
        }
    }
}


_51cpu.prototype.__execute_decode_80_8F = function(opcode){
    if (opcode.test(0x80)) {
        //SJMP offset
        this.op_add_offset(this.fetch_const())
    } else if (opcode.test(0x82)) {
        //ANL C,bit
        this.op_anl_bit(this.fetch_bit())
    } else if (opcode.test(0x83)) {
        //MOVC A, @A+PC
        this.op_move(this.A, this.get_ROM(this.A.get() + this.PC.get()))
    } else if (opcode.test(0x84)) {
        //DIV AB
        this.op_div()
    } else if (opcode.test(0x85)) {
        // MOV direct_dest, direct_src2
        let src = this.fetch_direct()
        let dest = this.fetch_direct()
        this.op_move(dest, src)
    } else if (opcode.test(0x86, 0xFE)) {
        // MOV direct,@Ri
        this.op_move(this.fetch_direct(), opcode.get_Ri())
    } else if (opcode.test(0x88, 0xF8)) {
        // MOV direct,Rn
        this.op_move(this.fetch_direct(), opcode.get_Rn())
    }
}


_51cpu.prototype.__execute_decode_90_9F = function(opcode){
    if (opcode.test(0x90)) {
        //MOV DPTR,#immed
        this.DPTR.set(this.fetch_const16())
    } else if (opcode.test(0x92)) {
        //MOV bit,C
        this.op_move(this.fetch_bit(), this.PSW.carry)
    } else if (opcode.test(0x93)) {
        //MOV A,@A+DPTR
        this.op_move(this.A, this.get_ROM(this.A.get() + this.DPTR.get()))
    } else if (opcode.test(0x94)) {
        //SUBB A,#immed
        this.op_subb(this.A, this.fetch_const())
    } else if (opcode.test(0x95)) {
        //SUBB A,direct
        this.op_subb(this.A, this.fetch_direct())
    } else if (opcode.test(0x96, 0xFE)) {
        //SUBB A,@Ri
        this.op_subb(this.A, opcode.get_Ri())
    } else if (opcode.test(0x98, 0xF8)) {
        //SUBB A,Rn
        this.op_subb(this.A, opcode.get_Rn())
    }
}


_51cpu.prototype.__execute_decode_A0_AF = function(opcode){
    if (opcode.test(0xA0)) {
        // ORL C,/bit
        this.op_orl_bit(this.fetch_bit(), true)
    } else if (opcode.test(0xA2)) {
        // MOV C,bit
        this.op_move(this.PSW.carry, this.fetch_bit())
    } else if (opcode.test(0xA3)) {
        // INC DPTR
        this.op_inc(this.DPTR)
    } else if (opcode.test(0xA4)) {
        // MUL AB
        this.op_mul()
    } else if (opcode.test(0xA5)) {
        // USER DEFINED 
        return 0
    } else if (opcode.test(0xA6, 0xFE)) {
        // MOV @Ri,direct 
        this.op_move(opcode.get_Ri(), this.fetch_direct())
    } else if (opcode.test(0xA8, 0xF8)) {
        // MOV Rn,direct 
        this.op_move(opcode.get_Rn(), this.fetch_direct())
    } 
}


_51cpu.prototype.__execute_decode_B0_BF = function(opcode){
    if (opcode.test(0xB0)) {
        //ANL C,/bit
        this.op_anl_bit(this.fetch_bit(), true)
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
        this.op_cjne(this.A, immed, offset_raw)
    } else if (opcode.test(0xB5)) {
        //CJNE A,direct,offset
        let direct = this.fetch_direct()
        let offset_raw = this.fetch_const()
        this.op_cjne(this.A, direct, offset_raw)
    } else if (opcode.test(0xB6, 0xFE)) {
        //CJNE @Ri,#immed,offset
        let immed = this.fetch_const()
        let offset_raw = this.fetch_const()
        this.op_cjne(opcode.get_Ri(), immed, offset_raw)
    } else if (opcode.test(0xB8, 0xF8)) {
        //CJNE Rn,#immed,offset
        let immed = this.fetch_const()
        let offset_raw = this.fetch_const()
        this.op_cjne(opcode.get_Rn(), immed, offset_raw)
    }
}


_51cpu.prototype.__execute_decode_C0_FF = function (opcode) {
    if (opcode.value < 0xE0) {
        if (opcode.value < 0xD0) {
            this.__execute_decode_C0_CF(opcode)
        } else {
            this.__execute_decode_D0_DF(opcode)
        }
    } else {
        if (opcode.value < 0xF0) {
            this.__execute_decode_E0_EF(opcode)
        } else {
            this.__execute_decode_F0_FF(opcode)
        }
    }

}

_51cpu.prototype.__execute_decode_C0_CF = function (opcode) {
    if (opcode.test(0xC0)) {
        //PUSH direct
        this.op_push(this.fetch_direct().get())
    } else if (opcode.test(0xC2)) {
        //CLR bit
        this.fetch_bit().set(0)
    } else if (opcode.test(0xC3)) {
        //CLR C
        this.PSW.carry.set(0)
    } else if (opcode.test(0xC4)) {
        //SWAP A
        let a = this.A.get()
        this.A.set(((a & 0xF0) >> 4) | ((a & 0x0F) << 4))
    } else if (opcode.test(0xC5)) {
        //XCH A,direct
        this.op_xch(this.A, this.fetch_direct())
    } else if (opcode.test(0xC6, 0xFE)) {
        //XCH A,@Ri
        this.op_xch(this.A, opcode.get_Ri())
    } else if (opcode.test(0xC8, 0xF8)) {
        //XCH A,Rn
        this.op_xch(this.A, opcode.get_Rn())
    }
}



_51cpu.prototype.__execute_decode_D0_DF = function (opcode) {
    if (opcode.test(0xD0)) {
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
    } else if (opcode.test(0xD6, 0xFE)) {
        // XCHD A,@Ri
        this.op_xchd(this.A, opcode.get_Ri())
    } else if (opcode.test(0xD8, 0xF8)) {
        // DJNZ Rn,offset
        let Rn = opcode.get_Rn()
        let offset_raw = this.fetch_const()
        this.op_dec(Rn)
        if (Rn.get() != 0)
            this.op_add_offset(offset_raw)
    }
}


_51cpu.prototype.__execute_decode_E0_EF = function (opcode) {

    if (opcode.test(0xE0)) {
        //MOVX A,@DPTR
        this.A.set(this.get_XRAM_cell(this.DPTR.get()).get())
    } else if (opcode.test(0xE2, 0xFE)) {
        //MOVX A,@Ri
        let Ri = opcode.get_XRi()
        this.op_move(this.A, Ri)
    } else if (opcode.test(0xE4)) {
        //CLR A
        this.A.set(0)
    } else if (opcode.test(0xE5)) {
        //MOV A,direct
        this.op_move(this.A, this.fetch_direct())
    } else if (opcode.test(0xE6, 0xFE)) {
        //MOV A,@Ri
        this.op_move(this.A, opcode.get_Ri())
    } else if (opcode.test(0xE8, 0xF8)) {
        //MOV A,Rn
        this.op_move(this.A, opcode.get_Rn())
    }
}


_51cpu.prototype.__execute_decode_F0_FF = function (opcode) {
    if (opcode.test(0xF0)) {
        //MOVX @DPTR,A
        this.get_XRAM_cell(this.DPTR.get()).set(this.A.get())
    } else if (opcode.test(0xF2, 0xFE)) {
        //MOVX @Ri,A
        let Ri = opcode.get_XRi()
        this.op_move(Ri, this.A)
    } else if (opcode.test(0xF4)) {
        //CPL A
        this.A.set((~this.A.get()) & 0xFF)
    } else if (opcode.test(0xF5)) {
        //MOV direct,A
        this.op_move(this.fetch_direct(), this.A)
    } else if (opcode.test(0xF6, 0xFE)) {
        //MOV @Ri,A
        this.op_move(opcode.get_Ri(), this.A)
    } else if (opcode.test(0xF8, 0xF8)) {
        //MOV Rn,A
        this.op_move(opcode.get_Rn(), this.A)
    }
}


// paramter : addr; addr that < 0x100
// get RAM value by addr , whne add < 0x80, 
// found value in IRAM, otherwise using SFR
// map to read register' vaule

_51cpu.prototype.get_ROM = function (addr) {
    r = this.IDATA[addr]
    if( r == null){
        this.error_info.code = CPU_ERROR_INVALID_ROM_ADDRESS
        this.error_info.addr = addr 
        return 0;
    }
    return r;
}

_51cpu.prototype.get_XRAM_cell = function (addr) {
    let cpu_ref = this
    if(addr >= this.XRAM.length)
    {
        this.error_info.code = CPU_ERROR_INVALID_XRAM_ADDRESS
        this.error_info.addr = addr
        return new reg;
    }
    return {
        set: function (val) {
            cpu_ref.XRAM[addr] = val
        },
        get: function () {
            return cpu_ref.XRAM[addr]
        }
    }
}

_51cpu.prototype.get_iram_cell = function (addr) {
    let cpu_ref = this
    if(addr >= this.IRAM.length)
    {
        this.error_info.code = CPU_ERROR_INVALID_IRAM_ADDRESS
        this.error_info.addr = addr
        return new reg()
    }
    return {
        set: function (val) {
            cpu_ref.IRAM[addr] = val
        },
        get: function () {
            return cpu_ref.IRAM[addr]
        }
    }
}

_51cpu.prototype.get_ram_cell = function (addr) {
    if (addr < 0x80)
        return this.get_iram_cell(addr)
    else {
        let sfrname = this.SFR[addr]
        let sfr_reg = this[sfrname]
        if (sfr_reg) {
            return sfr_reg
        } else {
            this.error_info.code = CPU_ERROR_INVALID_SFR_ADDRESS
            this.error_info.addr = addr
            return new reg()
        }
    }
}

_51cpu.prototype.fetch_opcode = function () {
    let pt = this.PC.get()
    let cpu_ref = this;
    let opcode = {
        value: cpu_ref.get_ROM(pt),
        test: function (target_opcode, mask = 0xFF) {
            return (this.value & mask) == target_opcode
        },
    }
    this.PC.inc()

    let Ri_addr = (this.PSW.get() & 0x18) + (0x01 & opcode.value);
    let Rn_addr = (this.PSW.get() & 0x18) + (0x07 & opcode.value);

    let Ri = this.get_iram_cell(Ri_addr).get()

    opcode.get_Ri = function () {
        return {
            set: function (val) {
                cpu_ref.get_iram_cell(Ri).set(val)
            },
            get: function () {
                return cpu_ref.get_iram_cell(Ri).get()
            }
        }
    }

    opcode.get_XRi = function () {
        return {
            set: function (val) {
                cpu_ref.get_XRAM_cell(Ri).set(val)
            },
            get: function () {
                return cpu_ref.get_XRAM_cell(Ri).get()
            }
        }
    }

    opcode.get_Rn = function () {
        return {
            set: function (val) {
                cpu_ref.get_iram_cell(Rn_addr).set(val)
            },
            get: function () {
                return cpu_ref.get_iram_cell(Rn_addr).get()
            }
        }
    }

    opcode.fetch_addr11 = function () {
        let comb = ((this.value & 0xE0) << 3) + cpu_ref.get_ROM(cpu_ref.PC.get())
        let next_PC = cpu_ref.PC.inc().get()
        comb += (next_PC & 0xF800)
        return comb
    }

    return opcode
}

_51cpu.prototype.fetch_const16 = function () {
    let pt = this.PC.get()
    let high8bit = this.get_ROM(pt)
    let low8bit = this.get_ROM(pt + 1)
    this.PC.set(pt + 2)
    return (high8bit << 8) + low8bit
}

_51cpu.prototype.fetch_const = function () {
    let value = this.get_ROM(this.PC.get())
    this.PC.inc()
    return value
}

_51cpu.prototype.fetch_direct = function () {
    let addr = this.get_ROM(this.PC.get())
    this.PC.inc()
    return this.get_ram_cell(addr)
}

_51cpu.prototype.fetch_bit = function () {
    let pt = this.PC.get()
    let bit_addr = this.get_ROM(pt)
    let addr = 0
    let bit_index = bit_addr & 0x07
    if (bit_addr < 0x80) {
        addr = 0x20 + (bit_addr >> 3)
    } else {
        addr = bit_addr & 0xF8
    }

    let cpu_ref = this
    let mem_reg = cpu_ref.get_ram_cell(addr)



    let mem_cell = {
        set: b => {
            let value = mem_reg.get()
            let set_value = (b << bit_index) | (value & (~(1 << bit_index)))
            mem_reg.set(set_value)
        },
        get: () => {
            let value = mem_reg.get()
            return (value >> bit_index) & 0x01
        }
    }
    this.PC.set(pt + 1)
    return mem_cell
}

/*
include all instruction opreation
*/


_51cpu.prototype.op_inc = function (value) {
    let val = value.get()
    let mask = 0xFF
    if (value.bitlen)
        mask = Math.pow(2, value.bitlen) - 1
    val = (val + 1) & mask
    value.set(val)
}

_51cpu.prototype.op_dec = function (value) {
    let val = value.get()
    let mask = 0xFF
    if (value.bitlen)
        mask = Math.pow(2, value.bitlen) - 1
    val = val <= 0 ? mask : val - 1
    value.set(val)
    return val
}
_51cpu.prototype.op_move = function (dest, src) {

    if (typeof (src) == "undefined")
        throw "fuck"
    if (typeof (src) == "number")
        dest.set(src)
    else
        dest.set(src.get())
}

_51cpu.prototype.op_rr = function (store_cell) {

}

_51cpu.prototype.op_rl = function (store_cell) {

}

_51cpu.prototype.op_add_offset = function (offset_raw) {
    let pt = this.PC.get()
    let offset = 0
    if (offset_raw >= 0x80) {
        offset = - (256 - offset_raw);
    } else {
        offset = offset_raw
    }
    this.PC.set(pt + offset)
}

_51cpu.prototype.op_push = function (value) {
    let sp = this.SP.inc().get()
    this.get_iram_cell(sp).set(value)

    return this
}

_51cpu.prototype.op_pop = function (store_cell) {
    let sp = this.SP.get()
    store_cell.set(this.get_iram_cell(sp).get())
    this.SP.dec()
    
    return this
}


_51cpu.prototype.op_call = function (addr) {
    this.op_push(this.PC.get() & 0xFF)
    this.op_push((this.PC.get() >> 8) & 0xFF)
    this.PC.set(addr)
    return this
}

_51cpu.prototype.op_ret = function () {
    let temp = new reg()
    let low8bit = 0
    let high8bit = 0
    this.op_pop(temp)
    high8bit = temp.get()
    this.op_pop(temp)
    low8bit = temp.get()
    this.PC.set((high8bit << 8) + low8bit)
    return this
}

_51cpu.prototype.op_add = function (mem_dest, mem_src, using_carry = false) {
    let psw_carry = 0
    let psw = this.PSW.get()
    if (using_carry) {
        psw_carry = (psw >> 7) & 0x01
    }
    let a = mem_dest.get()
    let b = typeof(mem_src) == "number" ? mem_src : mem_src.get()
    let sum = a + b + psw_carry

    let carry = 0
    let ac = 0
    let ov = 0

    if (sum > 0xFF) {
        carry = 1
    }
    if ((a & 0x0F) + (b & 0x0F) + psw_carry > 0x0F) {
        ac = 1
    }

    if ((((~a) & (~b) & sum) | (a & b & (~sum))) & 0x80) {
        ov = 1
    }
    mem_dest.set(sum & 0xFF)
    this.PSW.set((psw & 0x3B) + (carry << 7) + (ac << 6) + (ov << 2))

}


_51cpu.prototype.op_subb = function(dest,src){
    let a = dest.get()
    let b = typeof(src) == "number" ? src : src.get()
    let result = a - b - this.PSW.carry.get()
    let carry = 0
    let ac = 0
    let ov = 0
    if(result < 0){
        result = 0x100 + result //two's complement
        carry = 1
    }
    if( (a&0xF) - (b&0xF) - this.PSW.carry.get() < 0){
        ac = 1
    }
    if((((~a)&b&result)|(a&(~b)&(~result)))&0x80){
        ov = 1
    }
    dest.set(result)
    this.PSW.set((this.PSW.get() & 0x3B) + (carry << 7) + (ac << 6) + (ov << 2))
}

_51cpu.prototype.orl = function(dest,src){
    dest.set(dest.get() | (typeof(src) == "number" ? src : src.get()))
}

_51cpu.prototype.op_anl = function(dest,src){
    dest.set(dest.get() & (typeof(src) == "number" ? src : src.get()))
}

_51cpu.prototype.op_xrl = function(dest,src){
    dest.set(dest.get() ^ (typeof(src) == "number" ? src : src.get()))
}

_51cpu.prototype.op_orl_bit = function(b,invert=false){
    let psw = this.PSW.get()
    let bit = b.get()
    if(invert)
        bit = (~bit)
    bit &= 0x01
    this.PSW.set(psw   | (bit << 7))
}

_51cpu.prototype.op_anl_bit = function(b,invert=false){
    let psw = this.PSW.get()
    let bit = b.get()
    if(invert)
        bit = (~bit)
    bit &= 0x01
    bit <<= 7
    this.PSW.set(psw  & (bit + 0x7F))
}

_51cpu.prototype.op_div = function(){
    let a = this.A.get()
    let b = this.B.get()
    this.PSW.set(this.PSW.get() & 0x7B)
    if( b== 0)
    {
        this.PSW.set(this.PSW.get() | 0x04)
    }else{

    let quotient = Math.floor(a/b)
    let remainder = a % b
    this.A.set(quotient)
    this.B.set(remainder)
    }
}

_51cpu.prototype.op_mul = function(){
    let a = this.A.get()
    let b = this.B.get()
    this.PSW.set(this.PSW.get() & 0x7B)
    let product = a*b
    if( product > 0xFF)
    {
        this.PSW.set(this.PSW.get() | 0x04)
    }
    this.A.set(product & 0xFF)
    this.B.set((product >> 8) & 0xFF)
}

_51cpu.prototype.op_cpl = function(obj){
    obj.set((~obj.get()&0x01))
}


_51cpu.prototype.op_cjne = function(dest,src,offset_raw){
    let a = typeof(dest) == "number" ? dest: dest.get()
    let b = typeof(src) == "number" ? src: src.get()
    let result = a - b
    this.PSW.carry.set(0)
    if(result != 0){
        this.op_add_offset(offset_raw)
        if(result < 0){
            this.PSW.carry.set(1)
        }
    }
}

_51cpu.prototype.op_xch = function(dest,src){
    let tmp = dest.get()
    dest.set(src.get())
    src.set(tmp)
}

_51cpu.prototype.op_da = function(){
    let a = this.A.get()
    let carry = this.PSW.carry.get()
    if(((a&0x0F) > 9)||(this.PSW.get() & 0x40)){
        a += 6
    }
    if(a > 0xFF)
        carry = 1
    if(((a&0xF0) > 0x90)||(carry)){
        a += 0x60
    }
    if(a>0xFF)
        carry = 1
    if(carry)
        this.PSW.carry.set(1)
    this.A.set(a & 0xFF)
}

_51cpu.prototype.op_xchd = function(dest,src){
    let a = dest.get()
    let b =src.get()
    let al = a&0x0F
    let bl = b&0x0F
    a = (a&0xF0) | bl
    b = (b&0xF0) | al
    dest.set(a)
    src.set(b)
}

// file: from <input>
// callback: function(binary_data:Uin8Array)
function decode_ihex(text){
    let lines = text.split('\n')

    let IDATA = []
    for(let one of lines){
        let subp = one.trim()
        if(one[0] !== ':'){
            throw "unexcept start symbol '" + one[0] + "'"
        }
        subp = subp.substring(1)
        if(subp === "00000001FF"){
            //end of the file
            break;
        }

        //用字符表示的二进制，忽略第0个固定的':'字符，每两个字符作为一个byte
        //    :     |   03    |     00-00     |   00    |02-0A-58|   99
        //   开头    数据长度    开始地址(大端)    类型      数据     校验和
        //（不用管）                          （只要管00）         （不用管)
        //                                   (01 end of file, see line 11)
        let data_len = subp.subHex(0, 2);
        let start_addr = subp.subHex(2, 6);
        let data_type = subp.subHex(6, 8);

        if(data_type !== 0x00)
            throw "unexcept segment type" + data_type

        IDATA.extend_to(start_addr + data_len, null)
        for(let i = 0; i < data_len; ++i){
            let offset = 2*i + 8;
            IDATA[start_addr + i] = subp.subHex(offset, offset + 2)
        }
    }
    return IDATA;
}

Array.prototype.extend_to = function(end,fill = 0){
    while(this.length < end){
        this.push(fill)
    }
}

Array.prototype.extend = function(count,fill = 0){
    for(let i = 0; i < count ;++i)
        this.push(fill)
}

String.prototype.subHex = function(start, end){
    return parseInt(this.substring(start,end),16)
}

function get_serial() {
    return new Map([
        [0x98, "SCON"],
        [0x99, "SBUF"],
    ])
}
function get_interrupt() {
    return new Map([
        [0x88, "TCON"],
        [0xA8, "IE"],
        [0xB8, "IP"],
    ])
}

function get_ports() { 
    return new Map([
         [0x80, "P0"],
         [0x90, "P1"],
         [0xA0, "P2"],
         [0xB0, "P3"],
        ])
}
/**
 * install serial interrupt and p0 - p3 from _51cpu object.
 *  Add interrupt callback to cpu, support 5 interrupts
 * IE[4:0], IP[4:0], TCON[0],TCON[2], SCON[0], SCON[1]
 * @param {_51cpu} cpu
 * 
 * @returns {Map<String,reg>}
 * 
 * F8   |       |	    |       |	    |	    |	    |      |       |
 * F0   |(B)    |	    |       |	    |	    |	    |      |       |
 * E8   |       |	    |       |	    |	    |	    |      |       |
 * E0   |(ACC)  |	    |       |	    |	    |	    |      |       |
 * D8   |       |	    |       |	    |	    |	    |      |       |
 * D0   |(PSW)  |	    |       |	    |	    |	    |      |       |
 * C8   |       |	    |       |	    |	    |	    |      |       |
 * C0   |	    |	    |       |	    |	    |	    |      |       |
 * B8   |IP(P)  |	    |       |	    |	    |	    |      |       |
 * B0   |P3	    |	    |       |	    |	    |	    |      |       |
 * A8   |IE(P)  |	    |       |	    |	    |	    |      |       |
 * A0   |P2	    |	    |       |	    |	    |	    |      |       |
 * 98   |SCON(P)|SBUF   |       |	    |	    |	    |      |       |
 * 90   |P1	    |	    |       |	    |	    |	    |      |       |
 * 88   |TCON(P)|x TMOD |x TL0  |x TL0  |x TH0  |x TH1  |      |       |
 * 80   |P0	    |(SP)   |(DPL)  |(DPH)  |	    |	    |      |x PCON |
 
 */
function install_default_peripherals(cpu){
    let ret = new Map([
        ...cpu.sfr_extend(get_serial()),
        ...cpu.sfr_extend(get_interrupt()),
        ...cpu.sfr_extend(get_ports())
    ])

    
    let default_irq = function(){
        let vIE = ret.get("IE").get();
        if(!(vIE & 0x80))
            return -1
        let rTCON = ret.get("TCON")
        let rSCON = ret.get("SCON")
        let vTCON = rTCON.get();
        let vSCON = rSCON.get();

        let IRQ =  ((vTCON & 0x02) >> 1) // IE0 external interrupt 0
        IRQ |=  ((vTCON & 0x20) >> 4) //    TF0 Timer 0 over flow
        IRQ |=  ((vTCON & 0x08) >> 1) //    IE1  external interrupt 1
        IRQ |=  ((vTCON & 0x80) >> 4) //    TF0 Timer 1 over flow
        IRQ |=  ((((vSCON >> 1) | vSCON) & 1) << 4) //   serial


        let MAXIRQN = 5;
        let IRQMASK = (1 << MAXIRQN) - 1;

        let vIRQEM = IRQMASK & IRQ & vIE;        
        if (vIRQEM == 0)
            return -1
        let vIPM =   IRQMASK & ret.get("IP").get(); 


        let sel = (vIRQEM << MAXIRQN) | (vIRQEM &  vIPM) // priority have high priorty
        let IRQN = 0;
        for(IRQN; IRQN < 2*MAXIRQN; ++IRQN){
            if (sel & (1 << IRQN))
                break;
        }
        IRQN %= MAXIRQN;
        //hardware clear irq flag;
        if(IRQN == 0){
            rTCON.set(rTCON.get() & 0xFD)
        }else if(IRQN == 1){
            rTCON.set(rTCON.get() & 0xDF)
        }else if(IRQN == 2){
            rTCON.set(rTCON.get() & 0xF7)
        }else if(IRQN == 3){
            rTCON.set(rTCON.get() & 0x7F)
        }
        return IRQN;
    }
    cpu.irq = default_irq
    
}




module.exports.core51 = _51cpu
module.exports.decode_ihex = decode_ihex
module.exports.install_default_peripherals = install_default_peripherals
module.exports.CPU_NO_ERROR = CPU_NO_ERROR
module.exports.CPU_ERROR_INVALID_IRAM_ADDRESS   = CPU_ERROR_INVALID_IRAM_ADDRESS
module.exports.CPU_ERROR_INVALID_ROM_ADDRESS    = CPU_ERROR_INVALID_ROM_ADDRESS
module.exports.CPU_ERROR_INVALID_SFR_ADDRESS    = CPU_ERROR_INVALID_SFR_ADDRESS
module.exports.CPU_ERROR_INVALID_XRAM_ADDRESS   = CPU_ERROR_INVALID_XRAM_ADDRESS