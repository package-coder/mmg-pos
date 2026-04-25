import datetime

MAX_CHAR_PER_ROW = 40

def clip(value):
    return "{:.2f}".format(value)

def write_to_sample(text: str):
    with open("sample_ejournal_full.txt", "a", encoding="utf-8") as f:
        f.write(text)

def writeln_to_sample(text: str = ""):
    write_to_sample(text)
    write_to_sample('\n')

def row_to_sample(label: str, value):
    if isinstance(value, (int, float)):
        value = clip(value)
    val_str = str(value)
    writeln_to_sample(label + val_str.rjust(MAX_CHAR_PER_ROW - len(label)))

def line_to_sample():
    writeln_to_sample('-' * MAX_CHAR_PER_ROW)

def simulate_full_receipt():
    with open("sample_ejournal_full.txt", "w") as f:
        pass

    # Header
    writeln_to_sample('           MMG-ALBAY            \n')
    writeln_to_sample('          Operated By:          ')
    writeln_to_sample('  MEDICAL MISSION GROUP MULTIPURPOSE   ')
    writeln_to_sample('           COOPERATIVE-ALBAY          ')
    writeln_to_sample('      VAT REG TIN 000-111-222-000     ')
    writeln_to_sample('        LEGAZPI CITY, ALBAY       \n')
    
    writeln_to_sample('           SERVICE INVOICE          ')
    line_to_sample()
    
    # Details
    row_to_sample("MIN: ", "123456789")
    row_to_sample("SN: ", "ABC-123")
    row_to_sample("Date & Time: ", "2026-01-04 10:15AM")
    row_to_sample("Cashier: ", "Juan Dela Cruz")
    row_to_sample("Invoice #: ", "000456")
    line_to_sample()
    
    # Customer
    writeln_to_sample('           SOLD TO            ')
    row_to_sample("Name: ", "Maria Clara")
    row_to_sample("Address: ", "Legazpi City")
    row_to_sample("TIN: ", "---")
    line_to_sample()
    
    # Items
    row_to_sample("ITEM ", "|QTY|PRICE|AMOUNT")
    line_to_sample()
    
    # Item 1
    name = "CONSULTATION FEES"
    writeln_to_sample(name.ljust(23) + "(1)".center(5) + "500.00".center(6) + "500.00".rjust(6))
    
    # Item 2
    name = "LABORATORY TEST A"
    writeln_to_sample(name.ljust(23) + "(2)".center(5) + "250.00".center(6) + "500.00".rjust(6))
    
    line_to_sample()
    row_to_sample("Total Sales: ", 1000.00)
    row_to_sample("Less MEMBER DISCOUNT: ", "(200.00)")
    row_to_sample("TOTAL AMOUNT DUE: ", 800.00)
    line_to_sample()
    
    row_to_sample("Tender Amount: ", 1000.00)
    row_to_sample("Tender Type: ", "CASH")
    row_to_sample("Change: ", 200.00)
    line_to_sample()
    
    writeln_to_sample(' *THIS DOCUMENT IS NOT VALID FOR CLAIM* ')
    writeln_to_sample('             *OF INPUT TAX*             ')
    line_to_sample()
    
    # Footer
    writeln_to_sample('\n           Supplier:           ')
    writeln_to_sample('             DVOTE              ')
    writeln_to_sample('      VAT REG TIN 111-222-333     ')
    writeln_to_sample('Accred No: 123-456-789-000')
    writeln_to_sample('PTU No: 987-654-321-000')

simulate_full_receipt()
