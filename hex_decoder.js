// file: from <input>
// callback: function(binary_data:Uin8Array)
function decode_hex(file,callback){
    let reader = new FileReader()
     reader.readAsText(file)
     reader.onloadend = function(){
        let lines = reader.result.split('\n')

        let IDATA = []
        for(let one of lines){
            let subp = one.trim()
            if(one[0] !== ':'){
                throw "unexcept start symbol '" + one[0] + "'"
            }
            subp = subp.substring(1)
            if(subp === "00000001FF"){
                //end of the file
                break;
            }

            //用字符表示的二进制，忽略第0个固定的':'字符，每两个字符作为一个byte
            //    :     |   03    |     00-00     |   00    |02-0A-58|   99
            //   开头    数据长度    开始地址(大端)    类型      数据     校验和
            //（不用管）                          （只要管00）         （不用管)
            //                                   (01 end of file, see line 11)
            let data_len = subp.subHex(0, 2);
            let start_addr = subp.subHex(2, 6);
            let data_type = subp.subHex(6, 8);

            if(data_type !== 0x00)
                throw "unexcept segment type" + data_type

            IDATA.extend_to(start_addr + data_len,0)
            for(let i = 0; i < data_len; ++i){
                let offset = 2*i + 8;
                IDATA[start_addr + i] = subp.subHex(offset, offset + 2)
            }
        }
        callback(IDATA)
     }
}
Array.prototype.extend_to = function(end,fill = 0){
    while(this.length < end){
        this.push(fill)
    }
}

Array.prototype.extend = function(count,fill = 0){
    for(let i = 0; i < count ;++i)
        this.push(fill)
}

String.prototype.subHex = function(start, end){
    return parseInt(this.substring(start,end),16)
}