get_serial = function () {
    return new Map([
        [0x98, "SCON"],
        [0x99, "SBUF"],
    ])
}
get_interrupt = function () {
    return new Map([
        [0x88, "IP"],
        [0xA8, "IE"],
        [0xB8, "TCON"],
    ])
}

get_ports = function() { 
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
        IRQ |=  ((((vSCON >> 1) & vSCON) & 1) << 4) //   serial
        if (IRQ == 0)
            return -1;

        let MAXIRQN = 5;
        let IRQMASK = (1 << MAXIRQN) - 1;

        let vIRQEM = IRQMASK & IRQ & vIE;
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
    cpu.irq.push(default_irq)
    
}