import sys
import os
import types
import json
import datetime

# Mock modules that are failing or missing
m = types.ModuleType("escpos")
m.printer = types.ModuleType("escpos.printer")
m.printer.Usb = type("Usb", (), {})
m.printer.Network = type("Network", (), {})
sys.modules["escpos"] = m
sys.modules["escpos.printer"] = m.printer

# Mock pydash
pd = types.ModuleType("pydash")
def get(obj, path, default=None):
    parts = path.split('.')
    for part in parts:
        if isinstance(obj, dict): obj = obj.get(part, default)
        else: return default
    return obj
pd.get = get
pd.start_case = lambda s: s.title()
pd.to_lower = lambda s: s.lower()
pd.upper_case = lambda s: s.upper()
sys.modules["pydash"] = pd

# Add helper to path
sys.path.append(os.path.join(os.getcwd(), 'helper'))

# Import app functions AFTER mocking
import app

# Mock transaction data
transaction_data = {
    "device": "printer",
    "type": "receipt",
    "settings": {"connection": "network", "url": "127.0.0.1"},
    "dvoteDetails": [{
        "name": "DVOTE",
        "tin": "111-222-333",
        "address": "DVOTE HQ",
        "accredNo": "AC-123",
        "accredDateIssued": "2025-01-01",
        "PTUno": "PTU-456",
        "ptuDateIssued": "2025-01-01"
    }],
    "transaction": {
        "status": "completed",
        "branch": {
            "tin": "000-111-222-000",
            "streetAddress": "Legazpi City, Albay"
        },
        "cashier": {
            "first_name": "Juan",
            "last_name": "Dela Cruz"
        },
        "customer": {
            "name": "Maria Clara",
            "address": "Legazpi City",
            "tin_number": "---",
            "age": "25",
            "birthDate": "2000-01-01T00:00:00",
            "customer_type_id": "12345"
        },
        "transactionDate": "2026-01-04T10:20:00",
        "invoiceNumber": 12345,
        "transactionItems": [
            {
                "name": "CONSULTATION FEES",
                "quantity": 1,
                "price": 1000.00,
                "package": None
            }
        ],
        "discounts": [
            {
                "name": "MEMBER DISCOUNT",
                "value": 20,
                "type": "percentage",
                "memberType": "member",
                "packageId": None
            }
        ],
        "totalSalesWithoutMemberDiscount": 1000.00,
        "totalMemberDiscount": 200.00,
        "totalNetSales": 800.00,
        "tender": {
            "amount": 1000.00,
            "type": "cash"
        },
        "change": 200.00
    }
}

# Override get_printer_device to return None (so it only journals)
app.get_printer_device = lambda settings: None

# Clear journal
if os.path.exists("ejournal.txt"):
    os.remove("ejournal.txt")

print("Simulating transaction...")
result = app.print_receipt(transaction_data)
print(f"Result: {result}")

if os.path.exists("ejournal.txt"):
    with open("ejournal.txt", "r") as f:
        content = f.read()
        print("\n--- EJOURNAL.TXT CONTENT ---")
        print(content)
        print("--- END OF CONTENT ---")
else:
    print("Error: ejournal.txt was not created.")
