


from itertools import groupby
from pydash import start_case, to_lower, upper_case
from app.new_models.Package import PackageType
from app.new_models.Transaction import Transaction


class TransactionService:
    def test(): 
        return ''
    # printer = Printer().printer

    # _companyDetail = {
    #     'name': '',
    #     'address': '',
    #     'tin': '',
    #     'accredNo': '',
    #     'dateIssued': '',
    #     'ptuNo': ''
    # }

    # def print(self, value: Transaction, forCompany: bool):
    #     printer = self.printer
    #     companyLabel = '(COMPANY\'S COPY)' if forCompany else ''
        
    #     try:
    #         printer.set(align='center', bold=True)
    #         printer.text(f'MMG-ALBAY {companyLabel}\n\n')
    #         printer.set(bold=False)
    #         printer.text(f'Operated By: \n')
    #         printer.set(bold=True)
    #         printer.text(f'MEDICAL MISSION GROUP MULTIPURPOSE COOPERATIVE-ALBAY\n')
    #         printer.set(bold=False)
    #         printer.text('NON-VAT REG TIN ' + value.branch['tin'] + '\n')
    #         printer.text(upper_case(value.branch['streetAddress']) + '\n\n')

    #         printer.set(align='center', bold=True)
    #         printer.text(f'INVOICE\n')

    #         printer.textln('-' * 40)
    #         printer.set(align='left', bold=False)

    #         printer.textln(f'{'Invoice No.: ':<13}{str(value.invoiceNumber).zfill(5):>27}')
    #         printer.textln(f'{'MIN: ':<5}{'---':>35}')
    #         printer.textln(f'{'SN: ':<4}{'---':>36}')
    #         printer.textln(f'{'Date & Time: ':<13}{value.transactionDateObject.strftime("%m-%d-%Y %I:%M:%S%p"):>27}')
    #         printer.textln(f'{'Cashier: ':<14}{upper_case(value.cashier['first_name'] + ' ' + value.cashier['last_name']):>26}')

    #         printer.textln('-' * 40)

    #         printer.set(align='center', bold=True)
    #         printer.text('SOLD TO\n')
    #         printer.set(align='left', bold=False)

    #         printer.textln(f'{'Name: ':<6}{upper_case(to_lower(value.customer['name'])):>34}')

    #         if(forCompany):
    #             printer.textln(f'{'Address: ':<9}{upper_case(to_lower(value.customer['address'])):>31}')
    #             printer.textln(f'{'TIN: ':<5}{value.customer['tin']:>35}')
    #             printer.textln(f'{'Age: ':<5}{value.customer['age']:>35}')
    #             printer.textln(f'{'Birth Date: ':<12}{value.customer['birthDate']:>28}')
    #         else:
    #             printer.textln(f'{'Address: ':<9}{'---':>31}')
    #             printer.textln(f'{'TIN: ':<5}{'---':>35}')
    #             printer.textln(f'{'Age: ':<5}{'---':>35}')
    #             printer.textln(f'{'Birth Date: ':<12}{'---':>28}')
                
    #         printer.textln(f'{'Requested By: ':<14}{value.referredBy['name']:>26}')

    #         printer.textln('-' * 40)
    #         printer.set(bold=True)
    #         printer.textln(f'{'ITEM DESCRIPTION':<24}| QTY |      SRP')
    #         printer.set(bold=False)
    #         printer.textln('-' * 40)

    #         transactionItems = groupby(value.transactionItems, lambda i: i.package.id)

    #         for _, groupItems in transactionItems:
    #             groupItems = list(groupItems)
    #             package = groupItems[0].package

    #             printer.set(align='left', bold=True)
    #             printer.text(f'> {package.name} \n')
            
    #             printer.set(bold=False)
    #             for test in groupItems:
    #                 indented = '    '
    #                 printer.textln(f'{(indented + start_case(test.name))[:23]:<24}{f'({test.quantity})':^7}{test.price:>9}')
                
    #         printer.textln('-' * 40)
    #         if (value['status'] == 'Cancelled'):
    #             printer.set(align='center', bold=True)
    #             printer.text('*** VOIDED TRANSACTION ***\n\n')
    #             printer.set(align='left', bold=False)
    #             printer.textln(f'{'Reason: ':<8}{value.get('reason') or '---':>32}')
    #         else:
    #             printer.set(align='left', bold=True)
    #             printer.textln(f'{'Total Sales: ':<20}{value.totalGrossSales:>20}')

    #             printer.set(bold=False)
    #             # for discount in value['discounts']:
    #             #     indented = '    '

    #             #     discountAmount = discount.get('value', '---') if discount.get('type') == 'fixed' else discount.get('totalDiscount', '---')
    #             #     p.textln(f'{(discount.get('name', '---') + ' Discount')[:29]:<30}{f'- {discountAmount}':<10}')
                
    #             printer.textln(f'{'Less: Discount(SC/PWD/NAAC/MOV/SP) ':<35}{f'- {value.totalMemberDiscount}':>5}')
    #             printer.textln(f'{'Less: Withholding Tax ':<22}{'0':>18}')
                
    #             printer.set(bold=True)
    #             printer.textln(f'{'TOTAL AMOUNT DUE: ':<20}{value.totalNetSales:>20}\n')
                
    #             printer.set(bold=False)
    #             printer.textln(f'{'Tender Amount: ':<20}{value.tenderAmount:>20}')
    #             printer.textln(f'{'Tender Type: ':<20}{upper_case(value.tenderType):>20}')
    #             printer.textln(f'{'Change: ':<20}{value.change:>20}')
    #             # printer.textln(f'{'Number of Items: ':<20}{value.get('totalQuantity', 0):>20}')

    #         printer.textln('-' * 40)

    #         printer.set(align='center', bold=True)
    #         printer.text('*THIS DOCUMENT IS NOT VALID FOR CLAIM OF INPUT TAX*\n')
    #         printer.textln('-' * 40)
    #         printer.textln()
    #         printer.set(align='left', bold=False)

    #         customerTypeId = None
    #         if(value.totalMemberDiscount > 0):
    #             customerTypeId = value.customer.get('customer_type_id') 
    #         printer.text(f'{'ID No. (SC/PWD/NAAC/MOV/SP): ':<29}{customerTypeId or ('_' * 8) :>11}\n\n')
    #         printer.text(f'{'Signature (SC/PWD/NAAC/MOV/SP): ':<32}{('_' * 8):>8}\n\n')
    #         printer.textln()

    #         printer.set(align="center", bold=True)
    #         printer.text('SUPPLIER\n')
    #         printer.text(self._companyDetail['name'].upper() + '\n')
    #         printer.set(bold=False)
    #         printer.text('Address' + self._companyDetail['address'] + '\n')
    #         printer.text('Vat Reg. TIN: ' + self._companyDetail['tin'] + '\n')
    #         printer.text('Accred No: ' + self._companyDetail['accredNo'] + '\n')
    #         printer.text('Date Issued: ' + self._companyDetail['dateIssued'] + '\n')
    #         printer.text('Valid Until: ' + '---' + '\n')
    #         printer.text('PTU No: ' + self._companyDetail.get('ptuNo', '---') + '\n\n')
    #         printer.cut()
    #         printer.close()
    #     except Exception as e: 
    #         printer.text('\n\n')
    #         printer.cut()
    #         printer.close()
    #         raise