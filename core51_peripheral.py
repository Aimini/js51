import mem

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

    ISR = mem.mem(0, 2)
    setattr(core,"ISR",ISR)

    def default_irq():
        core # for debug
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

        IRQN = 0
        IRQIP = 0
        while True:
            if ISR[1] == 1:
                return -1
            # is there any interrupt with IP == 1?
            sel = vIRQEM & vIPM 
            IRQN = bin(sel)[::-1].find('1')
            if IRQN != -1:
                IRQIP = 1
                break

            if ISR[0] == 1:
                return -1
            sel = vIRQEM
            IRQN = bin(sel)[::-1].find('1')
            if IRQN != -1:
                IRQIP = 0
                break

            return -1

        ISR[IRQIP] = 1

        # hardware clear irq flag;
        if IRQN == 0:
            rTCON.set(rTCON.get() & 0xFD) # CLR IE0
        elif IRQN == 1:
            rTCON.set(rTCON.get() & 0xDF) # CLR TF0
        elif IRQN == 2:
            rTCON.set(rTCON.get() & 0xF7) # CLR IE1
        elif IRQN == 3:
            rTCON.set(rTCON.get() & 0x7F) # CLR TF0
        
        return IRQN
    
    def interrupt_serviced_end():
        core # for debug
        s = bin(int(ISR))
        idx = s.find('1')
        if idx == -1:
            return
        sl = list(s)
        sl[idx] = '0'
        s = ''.join(sl)
        ISR.set(int(s,2))

    core.irq.append(default_irq)
    core.interrupt_end_linstener.append(interrupt_serviced_end)
