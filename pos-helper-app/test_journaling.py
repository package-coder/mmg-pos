import os
import sys

# Mocking the pydash, pytz, serial, and escpos modules as they might not be in the environment
# or we just want to test the logic in app.py without dependencies.
class MockPrinter:
    def __init__(self):
        self.output = []
    def text(self, t):
        self.output.append(("text", t))
    def set(self, **kwargs):
        self.output.append(("set", kwargs))
    def cut(self):
        self.output.append("cut")
    def close(self):
        self.output.append("close")

# Add the helper directory to sys.path
sys.path.append(os.path.join(os.getcwd(), 'helper'))

# Simplified version of the functions to test if they work as intended
MAX_CHAR_PER_ROW = 40

def clip(value):
    return "{:.2f}".format(value)

def writeln(p, text: str = ""):
    write(p, text)
    write(p, '\n')

def write(p, text: str):
    if(text is None):
        return
    if(not isinstance(text, str)):
        text = str(text)
    
    with open("ejournal_test.txt", "a", encoding="utf-8") as f:
        f.write(text[:MAX_CHAR_PER_ROW].ljust(MAX_CHAR_PER_ROW))

    if p is not None:
        try:
            if hasattr(p, 'text'):
                p.text(text[:MAX_CHAR_PER_ROW].ljust(MAX_CHAR_PER_ROW))
        except Exception as e:
            print(f"Printer error: {e}")

def test_journaling():
    # Clear test file
    if os.path.exists("ejournal_test.txt"):
        os.remove("ejournal_test.txt")
    
    print("Testing with printer=None...")
    writeln(None, "Line 1: No Printer")
    writeln(None, "Line 2: Still No Printer")
    
    with open("ejournal_test.txt", "r") as f:
        content = f.read()
        print(f"Journal content:\n{content}")
        assert "Line 1: No Printer" in content
        assert "Line 2: Still No Printer" in content
    print("Success: Journaled without printer!")

    print("\nTesting with MockPrinter...")
    p = MockPrinter()
    writeln(p, "Line 3: With Printer")
    
    with open("ejournal_test.txt", "r") as f:
        content = f.read()
        assert "Line 3: With Printer" in content
    
    print(f"Printer output: {p.output}")
    assert any(cmd[0] == "text" and "Line 3: With Printer" in cmd[1] for cmd in p.output if isinstance(cmd, tuple))
    print("Success: Journaled and Printed!")

if __name__ == "__main__":
    test_journaling()
