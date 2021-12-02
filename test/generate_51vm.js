const fs = require("fs");
const core_filelist = ["51vm_core", "51vm_ctl","51vm_opcode_decoder", "51vm_operand","51vm_operation","hex_decoder","51vm_peripheral"];
const file_output = "51vm.js"
let  str = "";

fs.open(file_output, "w", (err, fd) => {
    if(err)
     console.log(err);
    else {

        core_filelist.forEach((v, i)=> {
            let data = fs.readFileSync("../" + v +".js");
            fs.writeFileSync(fd, data);
            fs.writeFileSync(fd, "\n\n");
        });
    }
    fs.writeFileSync(fd, 
    "\n\n"
    +"\nmodule.exports.core51 = _51cpu"
    +"\nmodule.exports.decode_ihex = decode_ihex"
    +"\nmodule.exports.install_default_peripherals = install_default_peripherals"
    +"\nmodule.exports.CPU_NO_ERROR = CPU_NO_ERROR"
    +"\nmodule.exports.CPU_ERROR_INVALID_IRAM_ADDRESS   = CPU_ERROR_INVALID_IRAM_ADDRESS"
    +"\nmodule.exports.CPU_ERROR_INVALID_ROM_ADDRESS    = CPU_ERROR_INVALID_ROM_ADDRESS"
    +"\nmodule.exports.CPU_ERROR_INVALID_SFR_ADDRESS    = CPU_ERROR_INVALID_SFR_ADDRESS"
    +"\nmodule.exports.CPU_ERROR_INVALID_XRAM_ADDRESS   = CPU_ERROR_INVALID_XRAM_ADDRESS");
    fs.close(fd, err => console.log( err))
})
