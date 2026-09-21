from datetime import datetime
import os
from bson import ObjectId
from flask import Blueprint, jsonify, request, send_file
import openpyxl
import io
from pydantic import ValidationError
from pydash import omit, start_case

from app.filters.date_filter import DateFilter, compare_date_filter
from app.middlewares.authorized_attribute import authorized
from app.new_models.Transaction import TransactionDiscountQuery
from app.repositories.branch_reports import BranchReportRepository
from app.repositories.transaction import TransactionRepository
from app.repositories.transaction_discount import TransactionDiscountRepository
from app.database.config import users
from app.utils.reports import export_discount_reports, export_sales_reports, get_template_name, load_sheet


api = '/v2/reports'
discount_reports_bp = Blueprint('v2-reports', __name__)
discountRepository = TransactionDiscountRepository()
branchReportRepository = BranchReportRepository()
transactionRepository = TransactionRepository()


NO_PTU = '-'


def _terminal_filter():
    """Optional admin filters: one branch and/or one terminal (PTU)."""
    terminal = {
        k: v for k, v in {
            'branchId': request.args.get('branchId'),
            'ptuNumber': request.args.get('ptuNumber'),
        }.items() if v
    }
    # '-' = rows from before terminal scoping (no PTU), so their per-row export stays exact
    if terminal.get('ptuNumber') == NO_PTU:
        terminal['ptuNumber'] = { '$in': [None, ''] }
    return terminal


def _only_terminal(discounts, terminal):
    # discount rows carry no PTU of their own — it lives on the sale they belong to
    ptu = terminal.get('ptuNumber')
    discount_id = request.args.get('discountId')  # per-row export: exactly one discount row
    if discount_id:
        discounts = [d for d in discounts if str(d.get('_id')) == discount_id]
    if not ptu:
        return discounts
    if isinstance(ptu, dict):
        return [d for d in discounts if not (d.get('transaction') or {}).get('ptuNumber')]
    return [d for d in discounts if (d.get('transaction') or {}).get('ptuNumber') == ptu]


@discount_reports_bp.get(api + '/terminals')
@authorized
def get_report_terminals(user_id):
    include_dev_test = request.args.get('includeDevTest') == 'true'
    try:
        return jsonify({'data': transactionRepository.list_terminals(include_dev_test=include_dev_test)})
    except Exception as e:
        return jsonify({'message': 'Unable to get terminals', 'error': repr(e)}), 500



@discount_reports_bp.get(api + '/discounts')
@authorized
def get_discount_reports(user_id):
    date_filter = int(request.args.get('dateFilter', DateFilter.ALL))
    custom_date = request.args.get('customDate')
    start_date = request.args.get('startDate')
    end_date = request.args.get('endDate')
    # Dev Test Mode (mmg-app) is a per-browser toggle the server can't see on its own — the
    # frontend sends this explicitly while it's on. Off by default, matching every other report.
    include_dev_test = request.args.get('includeDevTest') == 'true'

    try:
        query = TransactionDiscountQuery(**omit(request.args.to_dict(), 'includeDevTest'))
        terminal = _terminal_filter()
        discount = _only_terminal(discountRepository.find({
            'memberType': {"$ne": None},
            **query.model_dump(exclude_unset=True),
            **omit(terminal, 'ptuNumber'),
        }, include_dev_test=include_dev_test), terminal)

        filtered_reports = [
            transaction for transaction in discount 
            if compare_date_filter(
                date_filter, 
                transaction['date'],
                custom_date,
                start_date,
                end_date
            )
        ]

        return jsonify({'data': filtered_reports})
    except ValidationError as e:
        return jsonify({'message': 'Unable to get discount reports', 'error': e.errors(include_input=False)}), 500
    except Exception as e:
        return jsonify({'message': 'Unable to get discount reports', 'error': repr(e)}), 500
    
@discount_reports_bp.route(api + '/discounts/download')
@authorized
def download_discount_reports(user_id):
    date_filter = int(request.args.get('dateFilter', DateFilter.ALL))
    custom_date = request.args.get('customDate')
    start_date = request.args.get('startDate')
    end_date = request.args.get('endDate')
    include_dev_test = request.args.get('includeDevTest') == 'true'

    try:
        query = TransactionDiscountQuery(**omit(request.args.to_dict(), 'includeDevTest'))
        terminal = _terminal_filter()
        discount = _only_terminal(discountRepository.find({
            **query.model_dump(exclude_unset=True),
            **omit(terminal, 'ptuNumber'),
        }, include_dev_test=include_dev_test), terminal)

        filtered_reports = [
            transaction for transaction in discount 
            if compare_date_filter(
                date_filter, 
                transaction['date'],
                custom_date,
                start_date,
                end_date
            )
        ]

        type = query.memberType
        templateName = get_template_name(type)
        workbook = load_sheet(templateName)
        output = export_discount_reports(workbook, type, filtered_reports, user_id)

        return send_file(
            output, 
            download_name=templateName, 
            as_attachment=True, 
            mimetype=workbook.mime_type
        )
    
    except ValidationError as e:
        return jsonify({'message': 'Unable to get download reports', 'error': e.errors(include_input=False)}), 500
    except Exception as e:
        return jsonify({'message': 'Unable to get download reports', 'error': repr(e)}), 500
    
@discount_reports_bp.route(api + '/sales')
@authorized
def get_sales_reports(user_id):
    date_filter = int(request.args.get('dateFilter', DateFilter.ALL))
    custom_date = request.args.get('customDate')
    start_date = request.args.get('startDate')
    end_date = request.args.get('endDate')
    include_dev_test = request.args.get('includeDevTest') == 'true'

    try:
        reports = branchReportRepository.find_by_date_and(date_filter, start_date, end_date, custom_date, query=_terminal_filter(), include_dev_test=include_dev_test)

        return jsonify({ 'data': reports })
    except ValidationError as e:
        return jsonify({'message': 'Unable to get reports', 'error': e.errors(include_input=False)}), 500
    except Exception as e:
        return jsonify({'message': 'Unable to get reports', 'error': repr(e)}), 500

@discount_reports_bp.route(api + '/sales/download')
@authorized
def download_sales_reports(user_id):
    date_filter = int(request.args.get('dateFilter', DateFilter.ALL))
    custom_date = request.args.get('customDate')
    start_date = request.args.get('startDate')
    end_date = request.args.get('endDate')
    include_dev_test = request.args.get('includeDevTest') == 'true'

    try:
        reports = branchReportRepository.find_by_date_and(date_filter, start_date, end_date, custom_date, query=_terminal_filter(), include_dev_test=include_dev_test)
        workbook = load_sheet('annex_template.xlsx')
        output = export_sales_reports(workbook, reports, user_id)

        return send_file(
            output, 
            download_name='annex_sales_summary.xlsx', 
            as_attachment=True, 
            mimetype=workbook.mime_type
        )
    except ValidationError as e:
        return jsonify({'message': 'Unable to download sales', 'error': e.errors(include_input=False)}), 500
    except Exception as e:
        return jsonify({'message': 'Unable to download sales', 'error': repr(e)}), 500
