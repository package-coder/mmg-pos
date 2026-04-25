import datetime
from itertools import groupby
import numbers
import os
import platform
import time
from flask import Flask, request, Response
from flask_cors import CORS
from pydash import get, start_case, upper_case
import pytz
import requests
import socket
from pydash.strings import to_lower
import serial
from escpos.printer import Network
from serial.tools import list_ports

MAX_CHAR_PER_ROW = 40
app = Flask(__name__)

from dotenv import load_dotenv

load_dotenv('../.env')
# Replace with your local and cloud server URLs
LOCAL_SERVER_URL = os.getenv('LOCAL_SERVER_URL')
CLOUD_SERVER_URL = os.getenv('CLOUD_SERVER_URL')

print('LOCAL_SERVER_URL', LOCAL_SERVER_URL)
print('CLOUD_SERVER_URL', CLOUD_SERVER_URL)


def list_serial_ports():
  """Lists available serial ports on the system."""
  ports = list_ports.comports()
  if ports:
    for port in ports:
      print(f"Port: {port.device}")
      print(f"  Description: {port.description}")
      print(f"  Manufacturer: {port.manufacturer}")
      print("-" * 20)
  else:
    print("No serial ports found.")

list_serial_ports()

def get_local_time():
    return datetime.datetime.now(pytz.timezone('Asia/Manila'))

def check_os_windows():
  system = platform.system()
  return system == 'Windows'

def get_display_device():
    if(check_os_windows()):
        return serial.Serial(port='COM3', baudrate=9600)
    else:
        return serial.Serial(port='/dev/ttyACM1', baudrate=9600)
   
def display_welcome():
    vfd = None
    try:
        vfd = get_display_device()
    except:
        pass
    
    if(vfd is None):
        return

    vfd.write("\x0C".encode())
    vfd.write('WELCOME TO'.center(20).encode())
    vfd.write("MMG-ALBAY!!".center(20).encode())

display_welcome()

def is_internet_connected():
    # return False
    try:
        socket.create_connection(("www.google.com", 80))
        return True
    except OSError:
        return False

cors = CORS(app, origins=["*", "*"])
@app.before_request
def hook():
    if request.method.lower() == 'options':
      return Response()

@app.route('/', defaults={'path': ''}, methods=['GET', 'POST', 'PUT', 'DELETE'])
@app.route('/<path:path>', methods=['GET', 'POST', 'PUT', 'DELETE'])
def proxy(path):
    connected = is_internet_connected()

    print('Connection: ', connected)
    path = request.full_path

    # if connected:
    #     target_url = CLOUD_SERVER_URL + path
    # else:
    target_url = LOCAL_SERVER_URL + path
    # target_url = LOCAL_SERVER_URL + path
    # print('Target URL: ', target_url)

    print('Request: ', target_url)

    try:
        response = requests.request(
            method=request.method,
            url=target_url,
            headers={key: value for (key, value) in request.headers.items() if key != 'Host'},
            data=request.get_data(),
            cookies=request.cookies,
            allow_redirects=False
        )
        excluded_headers = ['content-encoding', 'content-length', 'transfer-encoding', 'connection']
        resp = Response(response.content, response.status_code)
        for key, value in response.headers.items():
            if key not in excluded_headers:
                resp.headers[key] = value
        return resp
    except requests.exceptions.RequestException as e:
        return f"Error proxying request: {e}", 500
    
@app.route('/check-connection', methods=['GET'])
def check_connection():
    connection = is_internet_connected()
    return { 'is_connected': connection }

def clip(value):
    return "{:.2f}".format(value)

def row(p, label: str, value, transform=True):
    if(transform and isinstance(value, numbers.Number) and not isinstance(value, bool)):
        value = clip(value)

    if(not isinstance(value, str)):
        value = str(value)

    p.textln(label + value.rjust(MAX_CHAR_PER_ROW - len(label)))

def line(p):
    p.textln('-' * MAX_CHAR_PER_ROW)

def title(p, name):
    p.set(align='center')
    p.textln(name)
    p.set(align='left')

@app.post('/print')
def print_receipt():
    request_data = request.get_json()
    p = None
    try:
        p = Network("192.168.192.168")

    except Exception as e:
        return {
            'message': 'Unable to print the request',
            'error': repr(e)
        }, 500
    
    # p = escpos.printer(Usb(0x04b8, 0x0202))  # For USB connection
    # p = escpos.Network("192.168.1.100")  # For network connection
    
    print(f'PRINTING... {repr(p)}')

    transaction = request_data['transaction']
    branch = transaction['branch']
    cashier = transaction['cashier']
    dvote = request_data['dvoteDetails'][0]
    customer = transaction['customer']
    reprint = request_data.get('reprint') 
    reprintLabel = '(RE-PRINT)' if reprint else ''

    companyCopy = request_data.get('companyCopy')
    companyLabel = '(COMPANY\'S COPY)' if companyCopy else ''

    dt = datetime.datetime.fromisoformat(transaction['transactionDate'])
    dateNow = get_local_time()

    try:
        p.set(align='center', bold=True)
        p.text(f'MMG-ALBAY {companyLabel}\n\n')
        p.set(align='center', bold=False)
        p.text('Operated By:\n')
        p.set(align='center', bold=True)
        p.text('MEDICAL MISSION GROUP MULTIPURPOSE COOPERATIVE-ALBAY\n')
        p.set(align='center', bold=False)
        p.text('NON-VAT REG TIN ' + branch['tin'] + '\n')
        p.text(upper_case(branch['streetAddress']) + '\n\n')

        p.set(align='center', bold=True)
        if(transaction['status'] == 'completed'):
            p.text(f'INVOICE {reprintLabel}\n')
        else:
            p.text(f'{transaction["status"].upper()} DOCUMENT\n')

        p.set(align='left', bold=False)
        # p.textln('-' * MAX_CHAR_PER_ROW)
        line(p)

        if(reprint):
            row(p, "Reprint Date: ", dateNow.strftime("%Y-%m-%d %I:%M%p"))

        
        row(p, "MIN: ", "---")
        row(p, "SN: ", "---")
        row(p, "Date & Time: ", dt.strftime("%Y-%m-%d %I:%M%p"))
        row(p, "Cashier: ", start_case(cashier["first_name"] + " " + cashier["last_name"]))
        if(transaction['status'] == 'completed'):
            row(p, "Invoice #: ", str(transaction["invoiceNumber"]).zfill(6))
        else:
            # row(p, "Serial #: ", str(transaction["serialNumber"]).zfill(6))
            row(p, "Reference #: ", str(transaction["invoiceNumber"]).zfill(6))

        line(p)
        p.set(align='center', bold=True)
        p.text('SOLD TO\n')
        p.set(align='left', bold=False)

        row(p, "Name: ", start_case(to_lower(customer["name"])))
        row(p, "Address: ", start_case(to_lower(customer["address"])))
        row(p, "TIN: ", customer.get("tin_number") or "---")

        if(companyCopy):
            row(p, "Age: ", customer["age"], transform=False)
            row(p, "Birth Date: ", str(customer["birthDate"]).split("T")[0])
        else:
            row(p, "Age: ", "---")
            row(p, "Birth Date: ", "---")
            
        row(p, "Requested By: ", transaction.get("requestedByName", "---"))

        line(p)
        p.set(align='center', bold=True)
        row(p, "ITEM ", "|QTY|PRICE|AMOUNT")
        p.set(align='left', bold=False)
        line(p)

        for key, items in groupby(transaction['transactionItems'], lambda i: i.get('package')):
            package = key

            indented = ''
            if(package is not None):
                indented = '  '
                p.text(f'> {package["name"]} \n')

            for item in list(items):
                amount = item['price'] if transaction['status'] != 'refunded' else item['price'] * -1
                p.textln(str((indented + item["name"])[:22]).ljust(23) + f'({item["quantity"]})'.center(5) + str(amount).center(6) + str(amount).rjust(6))
            
            if(package is not None):
                discounts = list(filter(lambda i: i.get('packageId') == package['_id'] and i['memberType'] is None, transaction['discounts']))
                if(len(discounts) > 0):
                    discount = discounts[0]
                    totalDiscount = discount['value'] if discount['type'] == 'fixed' else (transaction['totalGrossSales'] * (discount['value'] / 100))
                    row(p, f'  - Less: {discount["name"]}', f'- {"{:.2f}".format(totalDiscount)}')

        line(p)
        p.set(align='left', bold=True)
        totalSales = transaction['totalSalesWithoutMemberDiscount'] if transaction['status'] != 'refunded' else transaction['totalSalesWithoutMemberDiscount'] * -1
        row(p, "Total Sales: ", totalSales)
        p.set(bold=False)

        row(p, "Less: SC/PWD/NAAC/MOV/SP ", f'({clip(transaction["totalMemberDiscount"])})')
        row(p, "Less: Withholding Tax ", "(0.00)")
        
        p.set(bold=True)
        totalNetSales = transaction['totalNetSales'] if transaction['status'] != 'refunded' else transaction['totalNetSales'] * -1
        row(p, "TOTAL AMOUNT DUE: ", totalNetSales)
        
        p.set(bold=False)
        row(p, "Tender Amount: ", get(transaction, 'tender.amount'))
        row(p, "Tender Type: ", upper_case(get(transaction, 'tender.type')))
        row(p, "Change: ", transaction["change"])



        line(p)

        p.set(align='center', bold=True)
        p.text('*THIS DOCUMENT IS NOT VALID FOR CLAIM OF INPUT TAX*\n')
        line(p)
        p.textln()
        p.set(align='left', bold=False)

        customerTypeId = customer.get('customer_type_id') or ('_' * 10) 

        row(p, "ID (SC/PWD/NAAC/MOV/SP): ", f'{customerTypeId}\n')
        row(p, "Signature: ", f'{("_" * 10)}\n')

        p.set(align="center")
        p.textln('Supplier:')
        p.set(align="center", bold=True)
        p.text(dvote['name'].upper() + '\n')
        p.set(align="center", bold=False)
        p.textln('VAT REG TIN ' + dvote['tin'])
        p.textln(upper_case(dvote['address']))
        p.text('Accred No: ' + dvote['accredNo'] + '\n')
        p.text('Date Issued: ' + dvote['dateIssued'] + '\n')
        p.text('Valid Until: ' + '---' + '\n')
        p.text('PTU No: ' + dvote.get('PTUno', '---') + '\n\n\n\n')
        p.cut()
        p.close()
    except Exception as e: 
        p.text('\n\n')
        p.cut()
        p.close()
        return {
            'message': 'Unable to print the request',
            'error': repr(e)
        }, 500
    return { 'message': 'Printed successfully' }, 200

@app.post('/print-report')
def print_report():
    data = request.get_json()
    p = None
    try:
        p = Network("192.168.192.168")
        if p is None:
            raise
    except Exception as e:
        return {
            'message': 'Unable to print the request',
            'error': repr(e)
        }, 500

    
    print('printing...')

    branch = data['branch']
    dvote = data['dvoteDetails'][0]
    type = data['type']

    timeInDate = None
    timeOutDate = None
    if(type == 'X_REPORT'):
        timeInDate = datetime.datetime.fromisoformat(data['timeIn'])
        if(data.get('timeOut') is not None):
            timeOutDate = datetime.datetime.fromisoformat(data['timeOut'])

    cashierReport = data if type == 'X_REPORT' else data['cashierReport']
    withdraw = get(cashierReport, 'withdraw', 0)
    sales = data if type == 'Z_REPORT' else data['sales']
    
    salesAdjustment = data['salesAdjustment']
    discountSummary = data['discountSummary']
    transactionSummary = data['transactionSummary']

    reprint = data.get('reprint') 
    reprintLabel = '(RE-PRINT)' if reprint else ''
    dateNow = get_local_time()

    try:
        p.set(align='center', bold=True)
        p.text(f'MMG-ALBAY\n\n')
        p.set(align='center', bold=False)
        p.text(f'Operated By: \n')
        p.set(align='center', bold=True)
        p.text(f'MEDICAL MISSION GROUP MULTIPURPOSE COOPERATIVE-ALBAY\n')
        p.set(align='center', bold=False)
        p.text('NON-VAT REG TIN ' + branch['tin'] + '\n')
        p.text(upper_case(branch['streetAddress']) + '\n\n')

        p.set(align='center', bold=True)

        if(type == 'X_REPORT'):
            p.textln(f'X-READING REPORT {reprintLabel}')
        else:
            p.textln(f'Z-READING REPORT {reprintLabel}')

        p.set(align='left', bold=False)
        line(p)

        if(reprint):
            row(p, "Reprint: ", dateNow.strftime("%Y-%m-%d %I:%M%p"))

        row(p, "MIN: ", "---")
        row(p, "SN: ", "---")

        
        if(type == 'X_REPORT'):
            cashier = data['cashier']
            row(p, "Cashier: ", start_case(cashier["first_name"] + " " + cashier["last_name"]))
            
        row(p, "Report Date: ", data["date"])
        if(type == 'X_REPORT'):
            timeOutDate = timeOutDate.strftime("%I:%M%p") if timeOutDate is not None else ''
            row(p, "Time In: ", timeInDate.strftime("%I:%M%p"))
            row(p, "Time Out: ", timeOutDate)
            
        row(p, "Beg. Invoice #: ", str(sales["invoiceStartNumber"]).zfill(6))
        row(p, "End. Invoice #: ", str(sales["invoiceEndNumber"]).zfill(6))
        if(type == 'Z_REPORT'):
            refund = sales.get('refundedNumber', {})
            cancel = sales.get('cancelledNumber', {})
            row(p, "Beg. Cancel #: ", str(cancel.get('beginning', 0)).zfill(6))
            row(p, "End. Cancel #: ", str(cancel.get('ending', 0)).zfill(6))
            row(p, "Beg. Refund #: ", str(refund.get('beginning', 0)).zfill(6))
            row(p, "End. Refund #: ", str(refund.get('ending', 0)).zfill(6))
            row(p, "Z-Counter #: ", str(1))
            row(p, "Reset Counter: ", "0")

            line(p)
            row(p, "Present Accumulated Sales: ", sales['presentAccumulatedSales'])
            row(p, "Previous Accumulated Sales: ", sales['previousAccumulatedSales'])
            row(p, "Sales for the Day: ", sales['totalSalesWithoutMemberDiscount'])
            
        line(p)
        row(p, "Gross Sales: ", sales['totalSalesWithoutMemberDiscount'])
        row(p, "Less Discount: ", sales["totalMemberDiscount"])
        row(p, "Less Cancelled: ", salesAdjustment.get('cancelled', 0))
        row(p, "Less Refunded: ", salesAdjustment.get('refunded', 0))
        # row(p, "Less VAT Adjustment: ", 0)
        row(p, "Net Sales: ", sales["totalNetSales"])

        if(type == 'Z_REPORT'):
            line(p)
            title(p, "DISCOUNT SUMMARY")
            row(p, "SC Discount: ", discountSummary.get('senior_citizen', 0))
            row(p, "PWD Discount: ", discountSummary.get('pwd', 0))
            row(p, "NAAC Discount: ", discountSummary.get('naac', 0))
            row(p, "Solo Parent Discount: ", discountSummary.get('solo_parent', 0))
            
        line(p)
        title(p, "SALES ADJUSTMENT")
        row(p, "Cancel: ", salesAdjustment.get('cancelled', 0))
        row(p, "Refund: ", salesAdjustment.get('refunded', 0))

        endingCashCount = data.get('endingCashCount')

        line(p)
        title(p, "CASH IN DRAWER COUNT")
        if(endingCashCount is not None):

            def toFloat(i):
                val = str(i).split('M')
                if(len(val) >= 1):
                    val = val[1].replace('P', '.')
                    return float(val)
                return 0.00
                

            keys = list(endingCashCount.keys())
            keys = list(filter(lambda i: i.startswith('M'), keys))
            keys = list(map(toFloat, keys))
            keys = list(sorted(keys, reverse=True))

            for key in keys:
                formattedKey = f'M{int(key)}' if key >= 1 else f'M{key}'.replace('.', 'P')
                value = endingCashCount[formattedKey]
                result = clip(value * key)
                key = f'{clip(key)}:'
                length = MAX_CHAR_PER_ROW - len(key) - len(result)
                p.textln(key + str(value).center(length) + result)

        line(p)
        title(p, "TRANSACTION SUMMARY")
        row(p, "Cash In Drawer: ", get(data, 'endingCashCount.total', 0))
        row(p, "Cheque: ", transactionSummary.get('cheque', 0))
        row(p, "Credit Card: ", 0)
        row(p, "Gift Certificate: ", 0)
        row(p, "Opening Fund: ", get(data, 'openingFund.total', 0))
        row(p, "Less Withdrawal: ", withdraw)
        row(p, "Payments Received: ", data.get('totalPayments', 0))
        row(p, "Short/Over: ", sales.get('cashDifference', 0))

        p.textln()
        p.set(align="center")
        p.textln('Supplier:')
        p.set(align="center", bold=True)
        p.text(dvote['name'].upper() + '\n')
        p.set(align="center", bold=False)
        p.textln('VAT REG TIN ' + dvote['tin'])
        p.textln(upper_case(dvote['address']))
        p.text('Accred No: ' + dvote['accredNo'] + '\n')
        p.text('Date Issued: ' + dvote['dateIssued'] + '\n')
        p.text('Valid Until: ' + '---' + '\n')
        p.text('PTU No: ' + dvote.get('PTUno', '---') + '\n\n\n\n')
        p.cut()
        p.close()
    except Exception as e: 
        p.text('\n\n')
        p.cut()
        p.close()
        return {
            'message': 'Unable to print the request',
            'error': repr(e)
        }, 500
    return { 'message': 'Printed successfully' }, 200

@app.post('/display')
def display_message():
    vfd = get_display_device()
    vfd.write("\x0C".encode())
    vfd.write('WELCOME TO'.center(20).encode())
    vfd.write("MMG-ALBAY!!".center(20).encode())

    return { 'message': 'Displayed successfully' }, 200

@app.post('/display/item')
def display_item():
    data = request.get_json()
    item = data
    
    vfd = get_display_device()
    vfd.write("\x0C".encode())
    vfd.write('MMG-ALBAY'.ljust(20).encode())
    vfd.write(f'{item["name"][:11]:<12}{"{:.2f}".format(item["price"])[:8]:>8}'.encode())

    return { 'message': 'Displayed successfully' }, 200

@app.post('/display/total')
def display_total():
    data = request.get_json()
    total = data['total']
        
    vfd = get_display_device()
    vfd.write("\x0C".encode())
    vfd.write('TOTAL'.ljust(20).encode())
    vfd.write("{:.2f}".format(total).rjust(20).encode())

    return { 'message': 'Displayed successfully' }, 200

@app.post('/display/next')
def display_next():
    vfd = get_display_device()
    vfd.write("\x0C".encode())
    vfd.write('THANK YOU!'.center(20).encode())
    vfd.write('COME AGAIN!'.center(20).encode())
    time.sleep(5)

    vfd.write('WELCOME TO'.center(20).encode())
    vfd.write("MMG-ALBAY!!".center(20).encode())

    return { 'message': 'Displayed successfully' }, 200

if __name__ == '__main__':
    app.run(host="0.0.0.0", port=5001)
