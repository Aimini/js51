// file from <input>
// callback : function(binary_data:Uin8Array)
function decode_hex(file,callback){
    let reader = new FileReader()
     reader.readAsText(file)
     reader.onloadend = function(){
        let lines = reader.result.split('\n')

        let IDATA = []
        for(let one of lines){
            if(one == ":00000001FF"){
                //end of the file
                break;
            }

            //用字符表示的二进制，忽略第0个固定的':'字符，每两个字符作为一个byte
            //    :     |   03    |     00-00     |   00    |02-0A-58|   99
            //   开头    数据长度    开始地址(大端)    类型      数据     校验和
            //（不用管）                          （只要管00）         （不用管)
            let data_len = parseInt(one.substring(1,3),16)
            let start_addr = parseInt(one.substring(3,7),16)
            IDATA.extend_to(start_addr + data_len,0)
            for(let i = 0; i < data_len; ++i){
                let offset = 9 + i*2
                let byte_str = one.substring(offset, offset + 2)
                IDATA[start_addr + i] = parseInt(byte_str,16)
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