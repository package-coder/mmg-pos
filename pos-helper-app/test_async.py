import sys
import os
import types
import asyncio
import json
import datetime
from unittest.mock import MagicMock, patch

# --- MOCKING SETUP ---
# We need to mock 'escpos' and its submodules BEFORE importing app
m_escpos = types.ModuleType("escpos")
m_printer = types.ModuleType("escpos.printer")
m_printer.Usb = MagicMock()
m_printer.Network = MagicMock()
m_escpos.printer = m_printer
m_escpos.exceptions = types.ModuleType("escpos.exceptions")
sys.modules["escpos"] = m_escpos
sys.modules["escpos.printer"] = m_printer
sys.modules["escpos.exceptions"] = m_escpos.exceptions

# Mock pydash
m_pydash = types.ModuleType("pydash")
m_pydash.get = lambda obj, path, default=None: default
m_pydash.start_case = lambda x: x
m_pydash.to_lower = lambda x: x
m_pydash.upper_case = lambda x: x
sys.modules["pydash"] = m_pydash

# Mock pytz
sys.modules["pytz"] = MagicMock()

# Mock serial
sys.modules["serial"] = MagicMock()

# Mock websockets
m_ws = types.ModuleType("websockets.asyncio.server")
m_ws.serve = MagicMock()
sys.modules["websockets.asyncio.server"] = m_ws

# Add helper to path
sys.path.append(os.path.join(os.getcwd(), 'helper'))

# Import app functions
import app

# Overwrite the actual logic functions with mocks to verify they are called
app.print_receipt = MagicMock(return_value={"message": "Mocked Receipt"})
app.print_test = MagicMock(return_value={"message": "Mocked Test"})
app.print_report = MagicMock(return_value={"message": "Mocked Report"})
app.display_message = MagicMock(return_value={"message": "Mocked Display"})
app.display_item = MagicMock(return_value={"message": "Mocked Item"})
app.display_total = MagicMock(return_value={"message": "Mocked Total"})
app.display_next = MagicMock(return_value={"message": "Mocked Next"})
app.display_welcome = MagicMock()

# --- ASYNC TEST HARNESS ---

class MockWebsocket:
    def __init__(self, messages):
        self.messages = messages
        self.remote_address = ("127.0.0.1", 12345)
        self.sent_messages = []

    def __aiter__(self):
        return self

    async def __anext__(self):
        if self.messages:
            return self.messages.pop(0)
        raise StopAsyncIteration

    async def send(self, message):
        self.sent_messages.append(message)

async def test_handler():
    print("Testing async handler...")
    
    # Test Data
    test_msg = json.dumps({
        "device": "printer",
        "type": "receipt",
        "transaction": {}
    })
    
    ws = MockWebsocket([test_msg])
    
    # Run handler
    await app.handler(ws)
    
    # Verify print_receipt was called
    # Since it's run in a thread, we can check if the Mock was called
    if app.print_receipt.called:
        print("SUCCESS: print_receipt was called.")
    else:
        print("FAILURE: print_receipt was NOT called.")
        exit(1)
        
    # Verify response was sent
    if len(ws.sent_messages) > 0:
        response = json.loads(ws.sent_messages[0])
        print(f"Response received: {response}")
        if response["message"] == "Mocked Receipt":
            print("SUCCESS: Correct response received.")
        else:
            print("FAILURE: Incorrect response content.")
            exit(1)
    else:
        print("FAILURE: No response sent to websocket.")
        exit(1)

    print("\nAll async tests passed!")

if __name__ == "__main__":
    asyncio.run(test_handler())
