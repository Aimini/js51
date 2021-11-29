
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