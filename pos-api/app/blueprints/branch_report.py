


from datetime import timedelta
from bson import ObjectId
from flask import Blueprint, jsonify, request,g
from pydantic import ValidationError
from pydash import omit
from pymongo.errors import DuplicateKeyError

from app.filters.date_filter import DateFilter
from app.middlewares.authorized_attribute import authorized
from app.new_models.AuditLog import AuditCode, AuditLog
from app.new_models.CashierReport import TimeInCashierReport, TimeOutCashierReport
from app.new_models.BranchReport import GenerateBranchReport, GetBranchReportQuery
from app.new_models.Transaction import TransactionStatus
from app.repositories.audit_log import AuditLogRepository
from app.repositories.branch_reports import BranchReportRepository
from app.repositories.cashier_report import CashierReportRepository
from app.repositories.transaction import TransactionRepository
from app.utils.utils import getLocalDateStr, getLocalTime, getLocalTimeStr

api = '/v2/branch-reports'
branch_report_bp = Blueprint('branch-reports', __name__)
reportRepository = BranchReportRepository()
transactionRepository = TransactionRepository()
cashierReportRepository = CashierReportRepository()
logger = AuditLogRepository()


@branch_report_bp.route(api)
@authorized
def get_reports(user_id):
    params = request.args.to_dict()
    branchIds = params.get('branchIds', '').split(',')

    try:
        model = GetBranchReportQuery(**omit(params, 'branchIds'), branchIds=branchIds)
        query = { 
            **omit(model.model_dump(exclude_none=True), 'branchIds'),  
            "branchId": { "$in": model.branchIds }
        }
        reports = reportRepository.find(query)
        return jsonify({ 'data': reports })
    except ValidationError as e:
        return jsonify({'message': 'Unable to get reports', 'error': e.errors(include_input=False)}), 500
    except Exception as e:
        return jsonify({'message': 'Unable to get reports', 'error': repr(e)}), 500

@branch_report_bp.post(api + '/generate')
@authorized
def generate_reports(user_id): 
    request_data = request.get_json()

    errorMessage = "Unable to generate reports"

    try:
        model = GenerateBranchReport(**request_data, cashierId=user_id)

        # Defense in depth on top of unique_cashier_report_per_day (app/database/indexes.py),
        # which should make this structurally impossible via the API: Z-report generation sums
        # fields like `withdraw` across every cashier_reports document for a branch+date with no
        # per-cashier grouping (BranchReportRepository._create_cashier_report_query), so if a
        # duplicate ever exists regardless — pre-migration data, a manual DB edit, a future bug —
        # generating anyway would silently double-count that cashier into the Z-report instead of
        # failing loudly. Block generation and name the affected cashier(s) rather than that.
        duplicate_cashiers = list(cashierReportRepository._db[cashierReportRepository._collection].aggregate([
            { '$match': { 'branchId': model.branchId, 'date': model.date } },
            { '$group': { '_id': '$cashierId', 'count': { '$sum': 1 } } },
            { '$match': { 'count': { '$gt': 1 } } },
        ]))
        if(len(duplicate_cashiers) > 0):
            cashier_ids = [d['_id'] for d in duplicate_cashiers]
            message = f"Cannot generate Z-Report: duplicate time-in records found for cashier(s) {cashier_ids} on {model.date} — resolve before closing the day."
            logger.insert_one(AuditLog(action=AuditCode.Z_REPORT_GENERATE_ERR, userId=user_id, message=message))
            return jsonify({ 'message': message }), 409

        # A cashier still clocked in has no ending cash count / final X-Reading yet, so their
        # shift's totals aren't final — closing the day now would either miss their sales entirely
        # or (once they eventually time out) leave a Z whose figures no longer match what was
        # actually printed. Block and name them so the operator knows who to chase.
        open_cashiers = list(cashierReportRepository._db[cashierReportRepository._collection].aggregate([
            { '$match': { 'branchId': model.branchId, 'date': model.date, 'timeOut': None } },
            {
                '$addFields': { 'cashierObjectId': { '$convert': { 'input': '$cashierId', 'to': 'objectId', 'onError': None, 'onNull': None } } }
            },
            { '$lookup': { 'from': 'users', 'localField': 'cashierObjectId', 'foreignField': '_id', 'as': 'cashier' } },
            { '$unwind': { 'path': '$cashier', 'preserveNullAndEmptyArrays': True } },
            { '$project': { '_id': 0, 'name': { '$concat': [{ '$ifNull': ['$cashier.first_name', 'Unknown'] }, ' ', { '$ifNull': ['$cashier.last_name', ''] }] } } },
        ]))
        if(len(open_cashiers) > 0):
            names = [c['name'] for c in open_cashiers]
            message = f"Cannot generate Z-Report: cashier(s) still timed in on {model.date} — {', '.join(names)}. Time them out first."
            logger.insert_one(AuditLog(action=AuditCode.Z_REPORT_GENERATE_ERR, userId=user_id, message=message))
            return jsonify({ 'message': message }), 409

        # One Z-Report per branch per day (defense in depth on top of unique_branch_report_per_day,
        # app/database/indexes.py) — a duplicate would double the day's figures in every downstream
        # aggregate that sums over branch_reports.
        existing_report = reportRepository._db[reportRepository._collection].find_one(
            { 'branchId': model.branchId, 'date': model.date }
        )
        if(existing_report is not None):
            message = f"A Z-Report for this branch on {model.date} has already been generated."
            logger.insert_one(AuditLog(action=AuditCode.Z_REPORT_GENERATE_ERR, userId=user_id, message=message))
            return jsonify({ 'message': message }), 409

        transactionRepository.update_many_bare(
            {
                **model.model_dump(exclude={'cashierId'}),
                "status": TransactionStatus.HOLD
            }, 
            { "status": TransactionStatus.CANCELLED }
        )

        previousDate = getLocalTime() - timedelta(days=1)
        # Persisted, sequential per-branch Z-Counter — never recomputed from a query result's list
        # position (that changes with whatever date filter happens to be applied) and never reset.
        zCounter = reportRepository._get_next_sequence({ "type": "Z_COUNTER", "branchId": model.branchId })
        try:
            reportRepository.insert_one({
                **model.model_dump(),
                "datetime": getLocalTimeStr(),
                "previousDate": str(previousDate.date()),
                "zCounter": zCounter
            })
        except DuplicateKeyError:
            # Closes the race the existence check above can't: two concurrent generate requests
            # for the same branch/date can both pass that check before either inserts.
            message = f"A Z-Report for this branch on {model.date} has already been generated."
            logger.insert_one(AuditLog(action=AuditCode.Z_REPORT_GENERATE_ERR, userId=user_id, message=message))
            return jsonify({ 'message': message }), 409

        message = "Z Report has been generated"
        logger.insert_one(
            AuditLog(
                action=AuditCode.Z_REPORT_GENERATE,  
                userId=user_id,
                message=message
            )
        )
        return jsonify({ 'message': message })
    except ValidationError as e:
        logger.insert_one(
            AuditLog(
                action=AuditCode.Z_REPORT_GENERATE_ERR,  
                userId=user_id,
                message=errorMessage
            )
        )
        return jsonify({'message': errorMessage, 'error': e.errors(include_input=False)}), 500
    except Exception as e:
        logger.insert_one(
            AuditLog(
                action=AuditCode.Z_REPORT_GENERATE_ERR,  
                userId=user_id,
                message=errorMessage
            )
        )
        return jsonify({'message': errorMessage, 'error': repr(e)}), 500

