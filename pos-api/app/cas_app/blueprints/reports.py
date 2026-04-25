
from bson import ObjectId
from flask import Blueprint

from app.cas_app.models.AccountsType import AccountsType
from app.cas_app.models.ChartAccount import ChartAccount

from app.database.config import (accountstype, chart_of_accounts, payments,
                                 purchase_invoices, receipts, sales_invoices, journal_entries)
from app.middlewares.authorized_attribute import authorized

api = '/api/cas/reports'
reports_bp = Blueprint('reports', __name__)

def toArray(list, totalKey):
    ret = []
    for l in list:
        try:
            ret.append({
                'accounting': l['accounting'],
                'totalAmountPaid': l[totalKey],
                '_id': l['_id'],
            })
        except Exception as e:
            print(repr(e))
    
    return ret

@reports_bp.get(api + '/trial-balance')
@authorized
def get_trial_balance(user_id):
    account_code_credit = 'account_code_credit'
    account_code_debit = 'account_code_debit'
    ret = []
    try:

        chart_of_accounts_data = chart_of_accounts.find()
        for chart_of_account_data in chart_of_accounts_data:
            chart = ChartAccount.fromDict(chart_of_account_data).toDict()
            ret.append({
                '_id': chart['_id'],
                'account_number': chart['accountNumber'],
                'account_name': chart['accountName'],
                'debit': 0,
                'credit': 0
            })
        

        merged_sources = toArray(receipts.find(), 'totalAmountPaid') + toArray(payments.find(), 'totalAmountPaid')  + toArray(sales_invoices.find(), 'total')  + toArray(purchase_invoices.find(), 'totalAmount') + toArray(journal_entries.find(), 'total')
        
        for data in merged_sources:
            accounting = data['accounting']
            totalAmountPaid = data['totalAmountPaid']
            print(accounting)
            for accounting_item in accounting:
                try:
                    code_credit = accounting_item[account_code_credit]
                    code_debit = accounting_item[account_code_debit]
                    for chart_of_account_data in ret:
                        try:
                            if chart_of_account_data['_id'] == code_credit:
                                chart_of_account_data['credit'] += totalAmountPaid
                            if chart_of_account_data['_id'] == code_debit:
                                chart_of_account_data['debit'] += totalAmountPaid
                        except: 
                            print('source of error1', data)
                            print('except1', chart_of_account_data)
                            
                except:
                    print('source of error2', data)
                    print('except2', accounting_item)

        return {'data': ret }

    except Exception as e:
        print(e)
        return {'message': repr(e) }, 500


@reports_bp.get(api + '/balance-sheet')
@authorized
def get_balance_sheet(user_id):
    account_code_credit = 'account_code_credit'
    account_code_debit = 'account_code_debit'
    groups = ['liabilities', 'member-equity', 'assets']
    ret = {
        'assets': [],
        'liabilities': [],
        'member-equity': []
    }
    try:

        chart_of_accounts_data = chart_of_accounts.find()
        for chart_of_account_data in chart_of_accounts_data:
            chart = ChartAccount.fromDict(chart_of_account_data).toDict()
            if chart.get('accountType') != 'none' and chart.get('accountType') is not None and chart.get('accountType') != "":
                accounttype = AccountsType.fromDict(accountstype.find_one({'_id': ObjectId(chart.get('accountType'))})).toDict()
                if accounttype['name'].lower() in groups:
                    ret[accounttype['name'].lower()].append({
                        '_id': chart['_id'],
                        'account_number': chart['accountNumber'],
                        'account_name': chart['accountName'],
                        'debit': 0,
                        'credit': 0
                    })
        
        merged_sources = toArray(receipts.find(), 'totalAmountPaid') + toArray(payments.find(), 'totalAmountPaid')  + toArray(sales_invoices.find(), 'total')  + toArray(purchase_invoices.find(), 'totalAmount') + toArray(journal_entries.find(), 'total')
        
        for data in merged_sources:
            accounting = data['accounting']
            totalAmountPaid = data['totalAmountPaid']
            for accounting_item in accounting:
                code_credit = accounting_item[account_code_credit]
                code_debit = accounting_item[account_code_debit]
                for group in groups:
                    for chart_of_account_data in ret[group]:
                        if chart_of_account_data['_id'] == code_credit:
                            chart_of_account_data['credit'] += totalAmountPaid
                        if chart_of_account_data['_id'] == code_debit:
                            chart_of_account_data['debit'] += totalAmountPaid

        return {'data': ret }

    except Exception as e:
        return {'message': repr(e) }, 500


@reports_bp.get(api + '/profit-and-loss')
@authorized
def get_profit_loss(user_id):
    account_code_credit = 'account_code_credit'
    account_code_debit = 'account_code_debit'
    groups = ['less:expense', 'net profit(loss)', 'income']
    ret = {
        'less:expense': [],
        'net profit(loss)': [],
        'income': []
    }
    try:

        chart_of_accounts_data = chart_of_accounts.find()
        for chart_of_account_data in chart_of_accounts_data:
            chart = ChartAccount.fromDict(chart_of_account_data).toDict()
            if chart.get('accountType') != 'none' and chart.get('accountType') is not None and chart.get('accountType') != "":
                accounttype = AccountsType.fromDict(accountstype.find_one({'_id': ObjectId(chart.get('accountType'))})).toDict()
                if accounttype['name'].lower() in groups:
                    ret[accounttype['name'].lower()].append({
                        '_id': chart['_id'],
                        'account_number': chart['accountNumber'],
                        'account_name': chart['accountName'],
                        'debit': 0,
                        'credit': 0
                    })
        
        merged_sources = toArray(receipts.find(), 'totalAmountPaid') + toArray(payments.find(), 'totalAmountPaid')  + toArray(sales_invoices.find(), 'total')  + toArray(purchase_invoices.find(), 'totalAmount') + toArray(journal_entries.find(), 'total')
        
        for data in merged_sources:
            accounting = data['accounting']
            totalAmountPaid = data['totalAmountPaid']
            for accounting_item in accounting:
                code_credit = accounting_item[account_code_credit]
                code_debit = accounting_item[account_code_debit]
                for group in groups:
                    for chart_of_account_data in ret[group]:
                        if chart_of_account_data['_id'] == code_credit:
                            chart_of_account_data['credit'] += totalAmountPaid
                        if chart_of_account_data['_id'] == code_debit:
                            chart_of_account_data['debit'] += totalAmountPaid

        return {'data': ret }

    except Exception as e:
        return {'message': repr(e) }, 500
