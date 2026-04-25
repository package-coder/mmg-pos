
from escpos import printer

from abc import ABC, abstractmethod

# class Exporter(ABC):

#     @abstractmethod
#     def set(self, *kwargs, **args):
#         pass
    
#     @abstractmethod
#     def set(self, *kwargs, **args):
#         pass

class Printer:
    printer = None
    def __init__(self):
        try:
            self._printer = printer.Usb(0x04B8,0x0202, 0, profile="TM-U220")
        except Exception as e:
            print(e)
            try:
                self._printer = printer.Network("192.168.5.200")
            except Exception:
                raise
            raise

    # def print(self):
    #     pass