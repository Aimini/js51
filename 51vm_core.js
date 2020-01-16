function reg(value = 0, bitlen = 8) {
    this._value = value;
    this.bitlen = bitlen
    this.max = Math.pow(2, bitlen) - 1

    this.getlistener = []
    this.changedlistener = []
    this.setlistener = []
}

reg.prototype.set = function (val) {
    for (let one of this.setlistener) {
        one(this._value, val);
    }
    let oldval = this._value;
    this._value = val & this.max;
    
    if (oldval !== val){
        for (let one of this.changedlistener) {
            one(this._value, val);
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
    

function _51cpu() {
    this.A = new reg()
    this.B = new reg()
    this.PSW = new reg()
    this.SP = new reg()
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
    this.irq = []
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
    this.A.set(0)
    this.B.set(0)
    this.PSW.set(0)
    this.SP.set(7)
    this.PC.set(0)
    this.DPTR.set(0)
}
