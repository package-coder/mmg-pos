



from datetime import datetime
import io
from itertools import groupby
import os
from bson import ObjectId
import openpyxl
from pydash import get, start_case, upper_case

from app.new_models.Discount import MemberType
from app.database.config import users
from app.new_models.Transaction import TransactionStatus
from app.utils.app_info import software_line
from app.utils.utils import formatDateTime12h, getLocalTime
import json
import sys

def get_template_name(type: MemberType):
    return f'annex_{type.value}_template.xlsx'

def load_sheet(templateName: str):
    # templateName = get_template_name(type)
    fileName = os.path.join(os.getcwd(), 'app', 'templates', templateName)
    workbook = openpyxl.load_workbook(fileName)
    return workbook

def convert_to_bytes(workbook: openpyxl.Workbook):
    output = io.BytesIO()
    workbook.save(output)
    output.seek(0)
    return output

def append_base_header(worksheet, user_id, data):
    # No rows to report (a real, common case — e.g. no senior-citizen discounts fell in the
    # selected period) means there's no branch to read the address/TIN from; write the header
    # without those two cells rather than crashing the whole export over an empty result set.
    branch = data[0]['branch'] if len(data) > 0 else None

    worksheet.cell(1, 1, "MMG-ALBAY")
    if branch:
        worksheet.cell(2, 1, upper_case(branch['streetAddress']))
        worksheet.cell(3, 1, 'VAT REG TIN ' + branch['tin'])
    worksheet.cell(9, 1, formatDateTime12h(getLocalTime()))
    worksheet.cell(5, 1, software_line())

    user = users.find_one({ '_id': ObjectId(user_id) })
    worksheet.cell(10, 1, start_case(user['first_name'] + ' ' + user['last_name']))


def export_discount_reports(workbook: openpyxl.Workbook, type: MemberType, reports, user_id):
    worksheet = workbook.active

    append_base_header(worksheet, user_id, reports)
    append_terminal_header(worksheet, [(get(r, 'transaction.sn'), get(r, 'transaction.min'), get(r, 'transaction.ptuNumber')) for r in reports])

    if(type == MemberType.NAAC):
        append_naac_reports(worksheet, reports)
    elif(type == MemberType.SOLO_PARENT):
        append_solo_parent_reports(worksheet, reports)
    else:
        append_discount_reports(worksheet, reports)

    return convert_to_bytes(workbook)


def append_discount_reports(worksheet, reports):
    default_row = 17
    for index, report in enumerate(reports):
        default_col = 1
        worksheet.cell(column=default_col, row=default_row + index, value=formatDateTime12h(report['transaction']['transactionDate']))
        worksheet.cell(column=default_col + 1, row=default_row + index, value=report['customer']['name'])
        worksheet.cell(column=default_col + 2, row=default_row + index, value=report['customer'].get('customer_type_id'))
        worksheet.cell(column=default_col + 3, row=default_row + index, value=report['customer']['tin_number'])
        worksheet.cell(column=default_col + 4, row=default_row + index, value=report['transaction']['invoiceNumber'])
        worksheet.cell(column=default_col + 5, row=default_row + index, value=report['transaction']['totalSalesWithoutMemberDiscount'])
        # MMG is NON-VAT registered: no VAT amount, and VAT-Exempt Sales equals the sales figure.
        worksheet.cell(column=default_col + 6, row=default_row + index, value=0)
        worksheet.cell(column=default_col + 7, row=default_row + index, value=report['transaction']['totalSalesWithoutMemberDiscount'])
        worksheet.cell(column=default_col + 9, row=default_row + index, value=report['transaction']['totalMemberDiscount'])
        worksheet.cell(column=default_col + 10, row=default_row + index, value=report['transaction']['totalNetSales'])

def append_naac_reports(worksheet, reports):
    default_row = 16
    for index, report in enumerate(reports):
        default_col = 1
        worksheet.cell(column=default_col, row=default_row + index, value=formatDateTime12h(report['transaction']['transactionDate']))
        worksheet.cell(column=default_col + 1, row=default_row + index, value=report['customer']['name'])
        worksheet.cell(column=default_col + 2, row=default_row + index, value=report['customer'].get('customer_type_id'))
        worksheet.cell(column=default_col + 3, row=default_row + index, value=report['transaction']['invoiceNumber'])
        worksheet.cell(column=default_col + 4, row=default_row + index, value=report['transaction']['totalSalesWithoutMemberDiscount'])
        worksheet.cell(column=default_col + 5, row=default_row + index, value=report['transaction']['totalMemberDiscount'])
        worksheet.cell(column=default_col + 6, row=default_row + index, value=report['transaction']['totalNetSales'])

def append_solo_parent_reports(worksheet, reports):
    default_row = 17
    for index, report in enumerate(reports):
        default_col = 1
        worksheet.cell(column=default_col, row=default_row + index, value=formatDateTime12h(report['transaction']['transactionDate']))
        worksheet.cell(column=default_col + 1, row=default_row + index, value=report['customer']['name'])
        worksheet.cell(column=default_col + 2, row=default_row + index, value=report['customer'].get('customer_type_id'))
        worksheet.cell(column=default_col + 6, row=default_row + index, value=report['transaction']['invoiceNumber'])
        worksheet.cell(column=default_col + 7, row=default_row + index, value=report['transaction']['totalSalesWithoutMemberDiscount'])
        worksheet.cell(column=default_col + 9, row=default_row + index, value=report['transaction']['totalMemberDiscount'])
        worksheet.cell(column=default_col + 10, row=default_row + index, value=report['transaction']['totalNetSales'])

def append_terminal_header(worksheet, terminals):
    """Fills the template's Serial No. / Machine Identification Number / POS Terminal No. lines
    (rows 6-8) when the export covers a single terminal — always the case for a per-row export.
    A mixed export leaves them alone rather than print one terminal's numbers over another's."""
    terminals = set(terminals)
    if len(terminals) != 1:
        return
    sn, min_, ptu = terminals.pop()
    worksheet.cell(6, 1, f'Serial No.: {sn or "---"}')
    worksheet.cell(7, 1, f'Machine Identification Number: {min_ or "---"}')
    worksheet.cell(8, 1, f'POS Terminal No.: {ptu or "---"}')


def export_sales_reports(workbook, sales, user_id):
    worksheet = workbook.active
    
    append_base_header(worksheet, user_id, sales)
    append_sales_reports(worksheet, sales)
    append_terminal_header(worksheet, [(s.get('sn'), s.get('min'), s.get('ptuNumber')) for s in sales])
    return convert_to_bytes(workbook)

def append_sales_reports(worksheet, sales):
    default_row = 17
    def clip(value):
        return "{:.2f}".format(value)
    
    totalSales = sum(get(i, 'salesSummary.netSales', i['totalNetSales']) for i in sales)
    worksheet.cell(11, 1, f'Total: {clip(totalSales)}')


    for index, sale in enumerate(sales):
        default_col = 0
        col = default_col
        row = default_row + index

        worksheet.cell(row, col + 1, sale['date'])
        worksheet.cell(row, col + 2, str(sale['invoiceStartNumber']).zfill(6))
        worksheet.cell(row, col + 3, str(sale['invoiceEndNumber']).zfill(6))
        worksheet.cell(row, col + 4, clip(get(sale, 'endingCashCount.total', 0)))
        worksheet.cell(row, col + 5, clip(get(sale, 'openingFund.total', 0)))
        summary = sale.get('salesSummary') or {}
        # Same top-to-bottom breakdown as the Z-report screen (app/utils/sales_summary.py), so the
        # sheet foots: Gross - total deductions = Net.
        gross = summary.get('grossSales', sale['totalSalesWithoutMemberDiscount'])
        worksheet.cell(row, col + 7, clip(gross))
        # MMG is NON-VAT registered: every sale is VAT-exempt, so VAT-Exempt Sales equals Gross.
        worksheet.cell(row, col + 8, clip(0))
        worksheet.cell(row, col + 10, clip(gross))
        worksheet.cell(row, col + 11, clip(0))

        discountSummary = sale['discountSummary']
        worksheet.cell(row, col + 12, clip(discountSummary.get(MemberType.SENIOR_CITIZEN.value, 0)))
        worksheet.cell(row, col + 13, clip(discountSummary.get(MemberType.PWD.value, 0)))
        worksheet.cell(row, col + 14, clip(discountSummary.get(MemberType.NAAC.value, 0)))
        worksheet.cell(row, col + 15, clip(discountSummary.get(MemberType.SOLO_PARENT.value, 0)))

        returns = summary.get('refunded', 0)
        voids = summary.get('cancelled', 0)
        worksheet.cell(row, col + 17, clip(returns))
        worksheet.cell(row, col + 18, clip(voids))

        # Member discounts are the ones broken down by type above; returns and voids complete
        # the deductions, matching the Z-report's Gross - Discount - Cancelled - Refunded = Net.
        totalDeductions = summary.get('discount', sum(discountSummary.values())) + returns + voids
        worksheet.cell(row, col + 19, clip(totalDeductions))

        worksheet.cell(row, col + 27, clip(summary.get('netSales', sale['totalNetSales'])))
        worksheet.cell(row, col + 28, clip(sale['cashDifference']))
        worksheet.cell(row, col + 30, 0)
        worksheet.cell(row, col + 31, 1)