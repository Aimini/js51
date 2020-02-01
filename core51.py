import _core51_decoder_extend

#fh = open(R"C:\Users\startAI\Desktop\wrong.log","w")

class core51(_core51_decoder_extend._core51_decoder_extend):
    def __init__(self):
        super().__init__()
        self.addr_breakpoint = []
        self.count = 0

    def step(self, count = 1):
        for _ in range(count):
            #fh.write(self.text_snapshot())
            #fh.write('\n')
            opcode_PC = int(self.PC)

            self.count += 1
            try:
                self.execute_one()
            except Exception as e:
                raise Exception(str(e) + " at PC[0x{:0>4X}]".format(opcode_PC))

            if int(self.PC) in self.addr_breakpoint:
                return False
            if int(self.PC) >= len(self.ROM):
                return False
        return True

    def reset(self):
        super().reset()
        self.count = 0

    def run(self):
        while self.step(1000):
            pass

    def load_rom(self, data):
        """
            data: bytearray
        """
        self.ROM = data
        
