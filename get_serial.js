get_serial = function() { return {
    SFR: {
         0x98: "SCON",
         0x99: "SBUF",
     },
     regs: {
         "SBUF": new reg(),
         "SCON": new reg()
     }
 }}
