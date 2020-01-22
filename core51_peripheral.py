def get_serial():
    return {
        0x98: "SCON",
        0x99: "SBUF",
    }


def get_interrupt():
    return {
        0x88: "TCON",
        0xA8: "IE",
        0xB8: "IP"
    }


def get_ports():
    return {
        0x80: "P0",
        0x90: "P1",
        0xA0: "P2",
        0xB0: "P3"
    }

 

def install_default_peripherals(core):
    """
    install serial interrupt and p0 - p3 from _51cpu object.
    Add interrupt callback to cpu, support 5 interrupts
    IE[4:0], IP[4:0], TCON[0],TCON[2], SCON[0], SCON[1]
    @param {_51cpu} cpu

    @returns {Map<String,reg>}

    F8   |       |	    |       |	    |	    |	    |      |       |
    F0   |(B)    |	    |       |	    |	    |	    |      |       |
    E8   |       |	    |       |	    |	    |	    |      |       |
    E0   |(ACC)  |	    |       |	    |	    |	    |      |       |
    D8   |       |	    |       |	    |	    |	    |      |       |
    D0   |(PSW)  |	    |       |	    |	    |	    |      |       |
    C8   |       |	    |       |	    |	    |	    |      |       |
    C0   |	     |	    |       |	    |	    |	    |      |       |
    B8   |IP(P)  |	    |       |	    |	    |	    |      |       |
    B0   |P3	 |	    |       |	    |	    |	    |      |       |
    A8   |IE(P)  |	    |       |	    |	    |	    |      |       |
    A0   |P2	 |      |       |	    |	    |	    |      |       |
    98   |SCON(P)|SBUF  |       |	    |	    |	    |      |       |
    90   |P1	 |	    |       |	    |	    |	    |      |       |
    88   |TCON(P)|x TMOD|x TL0  |x TL0  |x TH0  |x TH1  |      |       |
    80   |P0	 |(SP)  |(DPL)  |(DPH)  |	    |	    |      |x PCON |
    """
    ret = {
        **core.sfr_extend(get_serial()),
        **core.sfr_extend(get_interrupt()),
        **core.sfr_extend(get_ports())
        }
    
    def default_irq():
        vIE = int(ret["IE"])
        if vIE & 0x80 == 0:
            return -1
        rTCON = ret["TCON"]
        rSCON = ret["SCON"]
        vTCON = int(rTCON)
        vSCON = int(rSCON)

        IRQ =   ((vTCON & 0x02) >> 1) #    IE0 external interrupt 0
        IRQ |=  ((vTCON & 0x20) >> 4) #    TF0 Timer 0 over flow
        IRQ |=  ((vTCON & 0x08) >> 1) #    IE1  external interrupt 1
        IRQ |=  ((vTCON & 0x80) >> 4) #    TF0 Timer 1 over flow
        IRQ |=  ((((vSCON >> 1) | vSCON) & 1) << 4) # serial


        MAXIRQN = 5
        IRQMASK = (1 << MAXIRQN) - 1
        vIRQEM = IRQMASK & IRQ & vIE
        if vIRQEM == 0:
            return -1
        vIPM =   IRQMASK & int(ret["IP"])


        sel = (vIRQEM << MAXIRQN) | (vIRQEM & vIPM) # priority have high priorty
        IRQN = 0
        for i in range(2*MAXIRQN):
            if sel & (1 << i):
                IRQN = i
                break

        IRQN %= MAXIRQN
        # hardware clear irq flag;
        if IRQN == 0:
            rTCON.set(rTCON.get() & 0xFD)
        elif IRQN == 1:
            rTCON.set(rTCON.get() & 0xDF)
        elif IRQN == 2:
            rTCON.set(rTCON.get() & 0xF7)
        elif IRQN == 3:
            rTCON.set(rTCON.get() & 0x7F)
        
        return IRQN
    
    core.irq.append(default_irq)

