



from datetime import datetime
from app.utils.utils import getTimeZone

def is_valid_number(value):
    if value is None or value == "":
        return False

    try:
        int(value)
        return True
    except ValueError:
        return False

def generate_invoice_str(prefix, postfix):
    date = str(datetime.now(getTimeZone()).date())
    new_date_string = date.replace("-", "")

    trailing = f"{postfix:0>9}" if postfix is not None else ""
    return f'N{trailing}'