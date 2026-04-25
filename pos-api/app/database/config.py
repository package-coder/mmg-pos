
from pymongo import MongoClient

from app.config import IS_INTERNAL_PRODUCTION, IS_PRODUCTION

from .database import (get_current_database, internal_prod_database,
                       remote_database)
from .indexes import ensure_indexes

database = get_current_database().connect()
ensure_indexes(database)
users = database.users
products = database.products
doctors = database.doctors
product_categories = database.product_categories
branches = database.branches
corporates = database.corporates
customers = database.customers
packages = database.packages
roles = database.roles
transactions = database.transactions
discounts = database.discounts
sales = database.sales
bookings = database.bookings
cashier_reports = database.cashier_reports
sales_deposits = database.sales_deposits  
branch_reports = database.branch_reports  
counters = database.counters
suppliers = database.suppliers
invoices = database.invoices
invoice_line_items  = database.invoice_line_items
purchase_orders = database.purchase_orders
purchase_order_items = database.purchase_order_items
goods_receipt = database.goods_receipt
goods_receipt_items = database.goods_receipt_items
dicrepancies = database.discrepancies
approvals = database.approvals
payments = database.payments
financial_records = database.financial_records
reports = database.reports

#CAS
items = database.items
inventories = database.inventories
categories = database.categories
suppliers = database.suppliers
purchase_orders = database.purchase_orders
purchase_order_receipt = database.purchase_order_receipt
accountsgroup = database.accountsgroup
accountstype = database.accountstype
payments = database.payments
chart_of_accounts = database.chart_of_accounts
receipts = database.receipts
sales_invoices = database.sales_invoices
purchase_invoices = database.purchase_invoices
journal_entries = database.journal_entries