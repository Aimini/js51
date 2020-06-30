# file: from <input>
# callback: function(binary_data:Uin8Array)
def decode_ihex(text):
    """
    convert intel hex file text to bytearray
        text: str
        ret: bytearray
    """
    lines = text.split('\n')

    data = bytearray()
    for lineno, one in enumerate(lines):
        e = SyntaxError()
        e.lineno = lineno + 1
        e.text = one

        subp = one.strip()
        if one[0] != ':':    
            e.msg = "unexcept start symbol '{}'.".format(one[0])
            e.offset = 0
            raise e
        
        subp = subp[1:]
        if subp == "00000001FF":
            #end of the file
            break
        

        # 用字符表示的二进制，忽略第0个固定的':'字符，每两个字符作为一个byte
        #     :     |   03    |     00-00     |   00    |02-0A-58|   99
        #    开头    数据长度    开始地址(大端)    类型      数据     校验和
        # （不用管）                          （只要管00）         （不用管)
        #                                    (01 end of file, see line 11)
        data_len =   int(subp[0:2],16)
        start_addr = int(subp[2:6],16)
        data_type =  int(subp[6:8],16)

        if data_type != 0x00:
            e.msg = "unexcept segment type {}.".format(data_type)
            e.offset = 6
            raise e

        for _ in range(len(data), start_addr + data_len):
            data.append(0)
    
        for i in range(data_len):
            offset = 2*i + 8
            data[start_addr + i] =  int(subp[offset:offset + 2], 16)
        
    return data