

function reg(value = 0, bitlen = 8) {
    this._value = value;
    this.bitlen = bitlen
    this.max = Math.pow(2, bitlen) - 1

    this.getlistener = []
    this.setlistener = []
}
reg.prototype.set = function (val) {
    for (let one of this.setlistener) {
        one(this._value, val);
    }
    this._value = val;
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
    

function _51cpu() {
    this.A = new reg()
    this.B = new reg()
    this.PSW = new reg()
    this.SP = new reg(7)
    this.PC = new reg(0, 16)
    this.DPTR = new reg(0, 16)
    this.DPL = new reg()
    this.DPH = new reg()
    this.ERAM = []
    this.IRAM = []
    this.IDATA = new memory()
    this.SFR = {
        0x81: "SP",
        0x82: "DPL",
        0x83: "DPH",
        0xD0: "PSW",
        0xE0: "A",
        0xF0: "B",
    }

    for (let i = 0; i < 128; ++i)
        this.IRAM.push(0);

    let cpu_ref = this;
    this.DPL.get = function () {
        this.__proto__.get.call(this)
        return (cpu_ref.DPTR.get() & 0xFF)
    }

    this.DPL.set = function (val_new) {
        cpu_ref.DPL.__proto__.set.call(this, val_new)
        let val = cpu_ref.DPTR.get()
        val &= 0xFF00
        val += val_new
        cpu_ref.DPTR.set(val)
    }


    this.DPH.get = function () {
        this.__proto__.get.call(this)
        return (cpu_ref.DPTR.get() & 0xFF00) >> 8
    }
    this.DPH.set = function (val_new) {
        this.__proto__.set.call(this, val_new)
        let val = cpu_ref.DPTR.get()
        val &= 0x00FF
        val += (val_new << 8)
        cpu_ref.DPTR.set(val)
    }

    //-------Parity Flag: PSW.0 specialization--------
    this.PSW.set = function (value_new) {
        let a = cpu_ref.A.get()
        let parity = cpu_ref.parity()
        this.__proto__.set.call(this, ((value_new & 0xFE) + parity))
    }

    this.A.set = function (value_new) {
        this.__proto__.set.call(this, value_new)
        let parity = cpu_ref.parity()
        cpu_ref.PSW.set(cpu_ref.PSW.get())
    }

    //------PSW flag specification---------------
    let psw_ref =this.PSW
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
}

//------------------break point -----------------
_51cpu.prototype.set_addr_break = function(addr){
    this.addr_breakpoint.push(addr)
}

_51cpu.prototype.remove_addr_break = function(addr){
   this.addr_breakpoint = this.addr_breakpoint.filter(value => value != addr)
}




//return parity flag generate by A
_51cpu.prototype.parity = function () {
    let a = this.A.get()
    return (a ^ (a >> 1) ^ (a >> 2) ^ (a >> 3) ^ (a >> 4) ^ (a >> 5) ^ (a >> 6) ^ (a >> 7)) & 0x01
}

_51cpu.prototype.extend = function (ext_package) {
    for(let addr in ext_package.SFR){
        if(this.SFR[addr]){
            console.warn("overwrite SFR at address " + addr.toString(16))
        }
        this.SFR[addr] = ext_package.SFR[addr]
    }
    for(let name in ext_package['regs']){
        if(this[name])
        console.warn("overwrite register with name " + name)
        this[name] = ext_package['regs'][name]
    }
}

_51cpu.prototype.reset = function () {
    this.A.set(0)
    this.B.set(0)
    this.PSW.set(0)
    this.SP.set(7)
    this.PC.set(0)
    this.DPTR.set(0)
}


    //--------interrupt service implement------
_51cpu.prototype.start_interrupt = function(order){
        //TODO : according order to excute a call operation to
        // corresponding interrupt vector
}

// paramter : addr; addr that < 0x100
// get RAM value by addr , whne add < 0x80, 
// found value in IRAM, otherwise using SFR
// map to read register' vaule
_51cpu.prototype.get_iram_cell = function (addr) {
    let cpu_ref = this
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
            err = "invalid SFR address: 0x" + addr.toString(16)
            if (strict = 0)
                throw new RangeError(err)
            else {
                console.log(err)
                return new reg()
            }
        }
    }
}


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

_51cpu.prototype.op_push = function (store_cell) {
    let sp = this.SP.inc().get()
    this.IRAM[sp] = typeof (store_cell) == "number" ? store_cell : store_cell.get()
    return this
}

_51cpu.prototype.op_pop = function (store_cell) {
    let sp = this.SP.get()
    store_cell.set(this.IRAM[sp])
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
    if ((a & 0x0F) + (b & 0x0F) > 0x0F) {
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

_51cpu.prototype.fetch_opcode = function () {
    let pt = this.PC.get()
    let cpu_ref = this;
    let opcode = {
        value: cpu_ref.IDATA.get(pt),
        test: function (target_opcode, mask = 0xFF) {
            return (this.value & mask) == target_opcode
        },
    }
    this.PC.inc()

    let Ri_addr = (this.PSW.get() & 0x18) + (0x01 & opcode.value);
    let Rn_addr = (this.PSW.get() & 0x18) + (0x07 & opcode.value);

    let Ri = this.IRAM[Ri_addr]

    opcode.get_Ri = function () {
        return {
            set: function (val) {
                this.ram[Ri] = val
            },
            get: function () {
                return this.ram[Ri]
            },
            ram:cpu_ref.IRAM
        }
    }

    opcode.get_Rn = function () {
        return {
            set: function (val) {
                cpu_ref.IRAM[Rn_addr] = val
            },
            get: function () {
                return cpu_ref.IRAM[Rn_addr]
            }
        }
    }

    opcode.fetch_addr11 = function () {
        let comb = ((this.value & 0xE0) << 3) + cpu_ref.IDATA[cpu_ref.PC.get()]
        let next_PC = cpu_ref.PC.inc().get()
        comb += (next_PC & 0xF800)
        return comb
    }

    return opcode
}

_51cpu.prototype.fetch_const16 = function () {
    let pt = this.PC.get()
    let high8bit = this.IDATA.get(pt)
    let low8bit = this.IDATA.get(pt + 1)
    this.PC.set(pt + 2)
    return (high8bit << 8) + low8bit
}

_51cpu.prototype.fetch_const = function () {
    let value = this.IDATA.get(this.PC.get())
    this.PC.inc()
    return value
}

_51cpu.prototype.fetch_direct = function () {
    let addr = this.IDATA.get(this.PC.get())
    this.PC.inc()
    return this.get_ram_cell(addr)
}

_51cpu.prototype.fetch_bit = function () {
    let pt = this.PC.get()
    let bit_addr = this.IDATA.get(pt)
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
}


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

_51cpu.prototype.step = function (count = 1) {

}



_51cpu.prototype.coutinue = function () {
    while(true){
        this.execute_one()
        if(this.addr_breakpoint.includes(this.PC.get()))
            break;
    }
}

