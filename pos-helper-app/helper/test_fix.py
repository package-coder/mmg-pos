import escpos.exceptions
import sys

print("Before:", dir(escpos.exceptions))

if not hasattr(escpos.exceptions, 'DeviceNotFoundError'):
    print("Patching DeviceNotFoundError...")
    class DeviceNotFoundError(Exception): pass
    escpos.exceptions.DeviceNotFoundError = DeviceNotFoundError

print("After:", dir(escpos.exceptions))

try:
    from escpos.printer import Usb, Network
    print("Import successful!")
except Exception as e:
    print(f"Import failed: {e}")
    import traceback
    traceback.print_exc()
