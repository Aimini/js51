
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