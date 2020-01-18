import mem


class mem_bit_ref():
    """
        reference a bit in mem
    """

    def __init__(self, mem_obj, idx = 0):
        self.mem_obj = mem_obj
        self.idx = idx

    def get(self):
        return self.mem_obj[self.idx]

    def set(self,value):
        self.mem_obj[self.idx] = value

    def __int__(self):
        return self.get()


    def __iand__(self, other):
        self.set(self.get() & int(other))
        return self

    def __ixor__(self, other):
        self.set(self.get() ^ int(other))
        return self

    def __ior__(self, other):
        self.set(self.get()| int(other))
        return self