
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

