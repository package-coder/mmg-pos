import json

MAX_CHAR_PER_ROW = 40

def write_to_sample(text: str):
    if text is None:
        return
    if not isinstance(text, str):
        text = str(text)
    
    with open("sample_ejournal.txt", "a", encoding="utf-8") as f:
        f.write(text[:MAX_CHAR_PER_ROW].ljust(MAX_CHAR_PER_ROW))

def writeln_to_sample(text: str = ""):
    write_to_sample(text)
    write_to_sample('\n')

def row_to_sample(label: str, value):
    val_str = str(value)
    writeln_to_sample(label + val_str.rjust(MAX_CHAR_PER_ROW - len(label)))

def line_to_sample():
    writeln_to_sample('-' * MAX_CHAR_PER_ROW)

def simulate_transaction(id, name, amount):
    write_to_sample(f'MMG-ALBAY\n\n')
    write_to_sample('Operated By:\n')
    write_to_sample('MEDICAL MISSION GROUP MULTIPURPOSE\n')
    writeln_to_sample('COOPERATIVE-ALBAY')
    writeln_to_sample('VAT REG TIN 000-111-222-000')
    line_to_sample()
    row_to_sample("Invoice #: ", str(id).zfill(6))
    row_to_sample("Name: ", name)
    line_to_sample()
    row_to_sample("TOTAL AMOUNT DUE: ", f"{amount:.2f}")
    line_to_sample()
    writeln_to_sample("\n")

# Clear file
with open("sample_ejournal.txt", "w") as f:
    pass

simulate_transaction(1, "JUAN DELA CRUZ", 1500.00)
simulate_transaction(2, "MARIA CLARA", 2450.50)
simulate_transaction(3, "JOSE RIZAL", 300.75)
