/*
include all instruction opreation
*/

_51cpu.prototype.op_nop = () => { }
_51cpu.prototype.op_jump = function (value){ this.PC.set(value.get()) }



/************************ jump *************************/
_51cpu.prototype.op_sjump = function (offset_raw) {
    offset_raw = offset_raw.get()
    let pt = this.PC.get()
    let offset = 0
    if (offset_raw >= 0x80) {
        offset = - (256 - offset_raw);
    } else {
        offset = offset_raw
    }
    this.PC.set(pt + offset)
}

_51cpu.prototype.op_con_sjump = function (condition, offset_raw) {
    if (condition.get() != 0)
        this.op_sjump(offset_raw)
}


_51cpu.prototype.op_ncon_sjump = function (condition, offset_raw) {
    if (condition.get() == 0)
        this.op_sjump(offset_raw)
}

_51cpu.prototype.op_jbc = function (condition, offset_raw) {
    this.op_con_sjump(condition, offset_raw)
    condition.set(0)
}

_51cpu.prototype.op_jz = function (offset_raw) {
    if (this.A.get() === 0)
        this.op_sjump(offset_raw)
}

_51cpu.prototype.op_jnz = function (offset_raw) {
    if (this.A.get() !== 0)
        this.op_sjump(offset_raw)
}

_51cpu.prototype.op_jadptr = function () {
    this.PC.set(this.A.get() + this.DPTR.get())
}

_51cpu.prototype.op_cjne = function (dest, src, offset_raw) {
    let a = dest.get()
    let b = src.get()
    let result = a - b
    this.PSW.carry.set(0)
    if (result != 0) {
        this.op_sjump(offset_raw)
        if (result < 0) {
            this.PSW.carry.set(1)
        }
    }
}

_51cpu.prototype.op_djnz = function (value, offset_raw) {    
    //consider PSW = 0x02  and ACC = 0
    // when excute PSW dec step,
    // we consider PSW = 0x02 - 1 = 0x01
    // but ACC parity flag make PSW = 0x00
    // but! the standard CPU still using result 0x01 to make judgement
    let v = this.op_dec(value)
    if (v != 0)
        this.op_sjump(offset_raw)
}

/************************ about function *************************/
_51cpu.prototype.op_push = function (store_cell) {
    let sp = this.SP.inc().get()
    this.IRAM[sp] = store_cell.get()
    return this
}

_51cpu.prototype.op_pop = function (store_cell) {
    let sp = this.SP.get()
    store_cell.set(this.IRAM[sp])
    this.SP.dec()

    return this
}


_51cpu.prototype.op_call = function (addr) {
    this.op_push({get: ()=>this.PC.get() & 0xFF})
    this.op_push({get: ()=>(this.PC.get() >> 8) & 0xFF})
    this.PC.set(addr.get())
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

_51cpu.prototype.op_reti = function () {
    this.op_ret()
    for (let l of this.interrupt_end_linstener) {
        l()
    }
}
//=========================== arithmetic ================================
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
    if (value.max)
        mask = value.max
    val = val <= 0 ? mask : val - 1
    value.set(val)
    return val
}


_51cpu.prototype.op_add = function (mem_dest, mem_src, using_carry = false) {
    let psw_carry = 0
    let psw = this.PSW.get()
    if (using_carry) {
        psw_carry = (psw >> 7) & 0x01
    }
    let a = mem_dest.get()
    let b = mem_src.get()
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

_51cpu.prototype.op_addc = function (mem_dest, mem_src) {
    this.op_add(mem_dest, mem_src)
}


_51cpu.prototype.op_subb = function (dest, src) {
    let a = dest.get()
    let b = src.get()
    let result = a - b - this.PSW.carry.get()
    let carry = 0
    let ac = 0
    let ov = 0
    if (result < 0) {
        result = 0x100 + result //two's complement
        carry = 1
    }
    if ((a & 0xF) - (b & 0xF) - this.PSW.carry.get() < 0) {
        ac = 1
    }
    if ((((~a) & b & result) | (a & (~b) & (~result))) & 0x80) {
        ov = 1
    }
    dest.set(result)
    this.PSW.set((this.PSW.get() & 0x3B) + (carry << 7) + (ac << 6) + (ov << 2))
}


_51cpu.prototype.op_da = function () {
    let a = this.A.get()
    let carry = this.PSW.carry.get()
    if (((a & 0x0F) > 9) || (this.PSW.get() & 0x40)) {
        a += 6
    }
    if (a > 0xFF)
        carry = 1
    if (((a & 0xF0) > 0x90) || (carry)) {
        a += 0x60
    }
    if (a > 0xFF)
        carry = 1
    if (carry)
        this.PSW.carry.set(1)
    this.A.set(a & 0xFF)
}


_51cpu.prototype.op_div = function () {
    let a = this.A.get()
    let b = this.B.get()
    this.PSW.set(this.PSW.get() & 0x7B)
    if (b == 0) {
        this.PSW.set(this.PSW.get() | 0x04)
    } else {

        let quotient = Math.floor(a / b)
        let remainder = a % b
        this.A.set(quotient)
        this.B.set(remainder)
    }
}

_51cpu.prototype.op_mul = function () {
    let a = this.A.get()
    let b = this.B.get()
    this.PSW.set(this.PSW.get() & 0x7B)
    let product = a * b
    if (product > 0xFF) {
        this.PSW.set(this.PSW.get() | 0x04)
    }
    this.A.set(product & 0xFF)
    this.B.set((product >> 8) & 0xFF)
}


//=========================== logic ================================
_51cpu.prototype.op_orl = function (dest, src) {
    dest.set(dest.get() | src.get())
}

_51cpu.prototype.op_anl = function (dest, src) {
    dest.set(dest.get() & src.get())
}

_51cpu.prototype.op_xrl = function (dest, src) {
    dest.set(dest.get() ^ src.get())
}



_51cpu.prototype.op_cpl = function (obj) {
    obj.set((~obj.get() & 0x01))
}

_51cpu.prototype.op_clr = function (obj) {
    obj.set(0)
}

_51cpu.prototype.op_setb= function (obj) {
    obj.set(1)
}


_51cpu.prototype.op_rr = function (value, use_cy = false) {
    let val = value.get()
    let b0 = val & 0x01
    if (use_cy) {    
        si = this.PSW.carry.get()
        this.PSW.carry.set(b0)
    }
    else{
        si = b0
    }
    val = (val >> 1) & 0x7F
    val |= (si << 7)
    value.set(val)
}

_51cpu.prototype.op_rrc = function (value) {
    this.op_rr(value, true)
}

_51cpu.prototype.op_rl = function (value, use_cy = false) {
    let val = value.get()
    let b7 = (val & 0x80) >> 7

    if (use_cy) {    
        si = this.PSW.carry.get()
        this.PSW.carry.set(b7)
    }
    else{
        si = b7
    }
    val = (val << 1) & 0xFE
    val |= si
    value.set(val)
}

_51cpu.prototype.op_rlc = function (value) {
    this.op_rl(value, true)
}

//=========================== data move ================================
_51cpu.prototype.op_swap = function (dest) {
    let tmp = dest.get()
    tmp = ((tmp >> 4) & 0xFF) | ((tmp & 0xFF) << 4)
    dest.set(tmp)
}
_51cpu.prototype.op_xch = function (dest, src) {
    let tmp = dest.get()
    dest.set(src.get())
    src.set(tmp)
}


_51cpu.prototype.op_xchd = function (dest, src) {
    let a = dest.get()
    let b = src.get()
    let al = a & 0x0F
    let bl = b & 0x0F
    a = (a & 0xF0) | bl
    b = (b & 0xF0) | al
    dest.set(a)
    src.set(b)
}

_51cpu.prototype.op_move = function (dest, src) {
    dest.set(src.get())
}

_51cpu.prototype.op_movcapc = function(){
    let addr = this.A.get() + this.PC.get()
    this.A.set(this.IDATA.get(addr)) 
}

_51cpu.prototype.op_movcadptr = function(){
    let addr = this.A.get() + this.DPTR.get()
    this.A.set(this.IDATA.get(addr)) 
}

_51cpu.prototype.op_reserved= function(){
    //TODO:
}