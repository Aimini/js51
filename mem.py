import types

class mem:
    def __init__(self, value = 0, bitlen = 8):
        self.value = value
        self.bitlen = bitlen
        self.max = 2**bitlen - 1

        self.get_listener = []
        self.change_listener = []
        self.set_listener = []

    def _get_no_listened(self):
        return self.value

    def _set_no_listened(self,value):
        self.value = value & self.max

    def get(self):
        for l in self.get_listener:
            l(self) 
        return self._get_no_listened()

    def set(self,value):
        value = int(value) & self.max
        for l in self.set_listener:
            l(self, value)

        if value != self._get_no_listened():
            for l in self.change_listener:
                l(self, value)
        
        self._set_no_listened(value)
        return self

    def __setitem__(self, i, value):
        """
        set bit at <i> to <value>
            i: int
                bit index
            value: int
                using <value> & 1 to replace target bit.
        """
        if i < self.bitlen:
            mask = self.max - (1 << i)
            self.set((self._get_no_listened() & mask) | ((value & 1) << i))
        else:
            raise IndexError("index {} out of range {}.".format(i, self.bitlen))

    def __getitem__(self, i):
        """
        get bit value(0 or 1) at index i.
            i: int
                bit index
        """
        if i < self.bitlen:
            return (self.get() >> i) & 1
        else:
            raise IndexError("index {} out of range {}.".format(i, self.bitlen))

    def __int__(self):
        return self.get()

    def __iadd__(self, other):
        self.set(self._get_no_listened() + int(other))
        return self


    def __isub__(self, other):
        self.set(self._get_no_listened() - int(other))
        return self

    def __iand__(self, other):
        self.set(self._get_no_listened() & int(other))
        return self

    def __ixor__(self, other):
        self.set(self._get_no_listened() ^ int(other))
        return self

    def __ior__(self, other):
        self.set(self._get_no_listened() | int(other))
        return self

    def  __invert__(self):
        return ~self.get()
    
    def __str__(self):
        return "0x{:0>2X}".format(self._get_no_listened())
    
    def __repr__(self):
        return "mem({})".format(str(self))