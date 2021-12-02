# Js51 documentation  <!-- omit in toc -->

---
## Table of Cotents  <!-- omit in toc -->
- [Introductions](#introductions)
- [How to use it](#how-to-use-it)
  - [Load an Intel Hex file](#load-an-intel-hex-file)
  - [SFR operation](#sfr-operation)
    - [add SFR](#add-sfr)
    - [get or set SFR's value](#get-or-set-sfrs-value)
    - [attach function to SFR](#attach-function-to-sfr)
  - [IRAM,XRAM,IDATA operation](#iramxramidata-operation)
  - [Interrupt Request Source](#interrupt-request-source)
  - [Checking Error](#checking-error)

## Introductions
This is js implementation of a 8051 emulator that makes you run binary or intel hex 8051 program on web page. by default, it's only have core SFR and doesn't have interrupt request source, so you need to add it if it's necessary. see how to [add SFR](#add-sfr) or how to [add interrupt request source](#interrupt-request-source)


## How to use it
 Here is an example of how to simply run a program

``` html
<!-- create a html file so that you can open it on browser -->

<!-- put bellow code into <head> -->
<!-- step.1  introduce all the script file that we need-->
<script src="51vm_core.js"></script>
<script src="51vm_operand.js"></script>
<script src="51vm_operation.js"></script>
<script src="51vm_opcode_decoder.js"></script>
<script src="51vm_ctl.js"></script>
<script src="51vm_peripheral.js"></script>
<script src="hex_decoder.js"></script>

<script>
    function readfile() {
        let file = null
        if (this.files.length > 0)
            file = this.files[0];
        else
            return
        
        // step.2 create a vm and reset
        let vm = new _51cpu();
        // step.3 load ROM
        let reader = new FileReader()
        reader.readAsText(file)
        reader.onloadend = function () {
            vm.IDATA = decode_ihex(reader.result);
        }

        // step.4 reset and run it
        vm.reset();
        while(1){
            vm.next(1);
        }
    }
</script>
<body>
    <input type="file" name="ROM file" id="file" onchange = "readfile.call(this)">
</body>
```

### Load an Intel Hex file
read the file as text, then use the function `decode_ihex` on the text to get expected ROM object.
``` js
let vm = new _51cpu();

let reader = new FileReader()
reader.readAsText(file)
reader.onloadend = function () {
    vm.IDATA = decode_ihex(reader.result);
}
```
###  SFR operation
#### add SFR
use member function `sfr_extend`, it'll accept a `Map<Number,String>` object(address is key and name is value) as argument, and return `Map<String,reg>` object, which you can get the register object by its name.

#### get or set SFR's value
Any installed SFR can be retived directly by its name, then you can use `get` to read the value and `set` to modify the value. SFR  for getting SFR A as an example:
```js
let vm = new _51cpu();  
vm.A.set(0x1);              // set A to 1
console.log(vm.A.get());  // print "1"

vm.PC.set(0x2100F);         // set PC to 1
console.log(vm.PC.get());  // print "4111", 0x100F in hex
```
 - `set` will process overflow automatcially.
 - `set` and `get` will invoke the listener, see [here](#attach-function-to-sfr) to know the usage of listener.

you can do this for `SP`, `DPL`,`DPH`,`PSW`,`A`,`B` and `PC`, as well as the SFRs that you added by memeber function `sfr_extend`.

#### attach function to SFR
`reg` object provides listener to let you know when the core is accessing the SFR, so you can attach functions to respond to these operations. 

For example, I wanna simulate a UART one the SFR `SBUF`, the input data is pre-stored in a array `input_buffer`. When core is reading `SBUF`, I pop out the data in the head of the  `input_buffer` and feed it to CPU. when core is writing `SBUF`, I'll append the output to the array `output_buffer`:
```js
let vm = new _51cpu(0x80, 0x100)
//test SFR set/get
let input_idx = 0
let input_buffer = [1,2,3,4,5,6]
let output_buffer = []

vm.sfr_extend(new Map([
    [0x98, "SCON"],
    [0x99, "SBUF"]
]));


vm.SBUF.setlistener.push(function (old_value, new_value) {
    output_buffer.push(new_value)
})

vm.SBUF.getlistener.push(function (current_value) {
    vm.SBUF._value = input_buffer[input_idx]
})


vm.SCON.getlistener.push(function (old_value, new_value) {
    // set RI if we haven't read all input_buffer
    if(input_idx != input_buffer.length){
        vm.SCON._value &= 0xFE
        vm.SCON._value |= 0x01
    }

    // sending is always available, so TI is always 1
    vm.SCON._value |= 0x02
})


//-------------------test code ------------------
vm.IDATA = [
    0xD2, 0x99,         // SETB TI 
    0x30, 0x98, 0xFD,   // S0:  JNB RI, $ ;wait RI
    0xE5, 0x99,         //      MOV A, SBUF
    0xC2, 0x98,         //      CLR RI
    0x04,               //      INC A
    0x30,0x99,0xFD,     //      JNB TI, $ ;wait TI
    0xF5,0x99,          //      MOV SBUF, A
    0xC2, 0x99,         //      CLR TI
    0x80,0xF3]          //      SJMP S0

vm.reset()
while(output_buffer.length != input_buffer.length){
    vm.next(1)
}
console.log(output_buffer) //(6) [2, 3, 4, 5, 6, 7]
]
```
That is not such intuitive, but under this case, you can treat the member `_value` as the interface between the core and the SFR.

When core is writing SFR, the core is driving the interface and is writing certain data to `_value`, then you can use `setlistener` to capture this operation.


When the core is reading SFR, the core is expecting you to put some data on the interface,so you can use `getlistener` to change the `_value` before the core read this 'interface'.


### IRAM,XRAM,IDATA operation
The IRAM, XRAM, IDATA(ROM) is a simple array, but notice that IDATA might contain `null` that indicate the invalid byte, that's usually caused by gap between the segment in the intel hex file.
```js
//create a emulator with 0x80 size IRAM, 0x10000 size XRAM, 
// IDATA is empty by default
let vm = new _51cpu(0x80,0x10000)

// get length of IRAM, XRAM, IDATA 
console.log(vm.IRAM.length) // 0x80
console.log(vm.XRAM.length) // 0x10000
console.log(vm.IDATA.length)// 0

vm.IRAM[0] = 0xFF
console.log(vm.IRAM[0])// print "255"

vm.XRAM[0x100] = 0x0A
console.log(vm.XRAM[0x100])// print "10"

//CLR A 
//LOOP: INC A
//      SJMP LOOP
vm.IDATA = [0xE4, 0x4, 0x80, 0xFD]
vm.next(100) //100 step, so A is increased 50
console.log(vm.A.get())// print "50"
```

### Interrupt Request Source
To send interrupt request to core, you can assign a function to the member `irq`. the function should return a integer to indicate if there is any interrupt request. 

If the `irq` return value is smaller that 0, it means not interrupt request.

If  the `irq` return value is bigger that 0, it should represent which interrupt vector that we should go to.

Core will use `(irq() << 3) + 3` to get destination interrupt vector address.

Here is an example to show how to use it to trigger interrupt 1, and then increase the `ACC`:
```js
let count = 4
let vm = new _51cpu()
vm.irq = function(){
if(count)
{
    --count;
    return 1

}
    else
        return -1
}
vm.IDATA = [
    0xE4,       // CLR A  
    0x80, 0xFE,  // SJMP $
    0x00,0x00,0x00,0x00,0x00,0x00,0x00,0x00,   // NOP x8    
    0x04,        // INC A  ; interrupt 1
    0x32        // RETI
]
vm.reset()
vm.next(10000)
console.log(vm.A._value) // should be 4
```

### Checking Error
when emulator find that the program is accessing a invalid address of the IRAM,XRAM,IDATA, it'll record the information in the member `error_info`. you can ignore it if you don't care. otherwise, you can use `error_info.code` to check after each step:
```js
let vm = new _51cpu()

//      SJMP NEXT
//      NEXT:
vm.IDATA = [0x80, 0x00, null]

while(vm.error_info.code == CPU_NO_ERROR)
    vm.next(1)

// should be CPU_ERROR_INVALID_ROM_ADDRESS
if(vm.error_info.code == CPU_ERROR_INVALID_ROM_ADDRESS)
    console.log(vm.error_info.addr) //should be "2"
else
    console.log("what???")
```
`error_info.code` should be one of the following type:
``` js
CPU_NO_ERROR // I'm fine
CPU_ERROR_INVALID_IRAM_ADDRESS //  access invalid IRAM address, might caused by small IRAM
CPU_ERROR_INVALID_ROM_ADDRESS  //  access invalid IDATA(ROM) address
CPU_ERROR_INVALID_SFR_ADDRESS  //  access invalid SFR address
CPU_ERROR_INVALID_XRAM_ADDRESS //  access invalid SFR address, might caused by small XRAM
```
> member function `reset` will set the `error_info.code` to `CPU_NO_ERROR`.
