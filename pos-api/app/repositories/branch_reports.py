


from datetime import datetime, timedelta
from itertools import groupby

from pydash import get
from app.filters.date_filter import DateFilter, compare_date_filter
from app.new_models.CashierReport import CashierReport
from app.new_models.Transaction import TenderType, TransactionStatus
from app.utils.sales_summary import summarize_sales
from app.features.payment_method.models import PaymentKind
from app.features.payment_method.service import payment_breakdown, tender_kind
from app.repositories.base import BackupRepository
from app.repositories.cashier_report import CashierReportRepository
from app.repositories.report_cash_count import CashCountRepository
from app.repositories.transaction import TransactionRepository
from app.new_models.CashCount import _cash_keys, CashCount
from app.utils.utils import getLocalDateStr, getLocalTime
import json

class BranchReportRepository(BackupRepository):
    _collection = 'branch_reports'
    _transaction_collection = TransactionRepository()._collection
    _cashier_report_collection = CashierReportRepository()._collection
    _cash_count_collection = CashCountRepository()._collection

    def _default_filter(self, include_dev_test=False):
        """Shared by the "transactions" (new_transactions) and "discounts" (transaction_discounts)
        lookups, and by the branch_reports/cashier_reports self-lookups (which don't carry
        isDevTest at all — the clause simply never matches anything there, harmless either way).
        Dev Test Mode sales must never count toward a real branch's Z-report UNLESS the browser
        generating/viewing it has Dev Test Mode on (see app/blueprints/branch_report.py)."""
        dev_test_filter = [] if include_dev_test else [{ "$ne": ["$isDevTest", True] }]
        return {
                "$match": {
                    "$expr": {
                        "$and": [
                            { "$eq": ["$branchId", "$$branchId"] },
                            { "$eq": ["$date", "$$date"] },
                            { "$eq": [{ "$ifNull": ["$ptuNumber", None] }, "$$ptuNumber"] },
                            *dev_test_filter,
                        ]
                    }
                }
            }


    def find(self, query={}, *args, include_dev_test=False):
        dev_test_match = {} if include_dev_test else { "isDevTest": { "$ne": True } }

        try:
            data = list(self._db[self._transaction_collection].aggregate([
                { '$match': query },
                { '$match': { "status": { "$in": [TransactionStatus.COMPLETED, TransactionStatus.REFUNDED] }, **dev_test_match } },
                {
                    "$group": {
                        "_id": { "branchId": "$branchId", "date": "$date", "ptuNumber": { "$ifNull": ["$ptuNumber", None] } },
                        'date': { '$first': '$date' },
                        'branchId': { '$first': '$branchId' },
                        'ptuNumber': { '$first': { "$ifNull": ["$ptuNumber", None] } },
                        # MIN/SN of the terminal that issued these sales, for the Z-report header
                        'min': { '$first': '$min' },
                        'sn': { '$first': '$sn' },
                        "totalGrossSales": { "$sum": "$totalGrossSales" },
                        "totalNetSales": { "$sum": "$totalNetSales" },
                        "totalDiscount": { "$sum": "$totalDiscount" },
                        "totalSalesWithoutMemberDiscount": { "$sum": '$totalSalesWithoutMemberDiscount' } ,
                        "totalMemberDiscount": { "$sum": '$totalMemberDiscount' } ,
                        "invoiceStartNumber": { '$min': "$invoiceNumber" },
                        "invoiceEndNumber": { '$max': "$invoiceNumber" }
                    }
                },
                *self._create_branch_query(),
                *self._create_cash_count_query("openingFund", "opening"),
                *self._create_cash_count_query("endingCashCount", "ending"),
                *self._create_serial_number_range_query("cancelledNumber", TransactionStatus.CANCELLED, include_dev_test),
                *self._create_serial_number_range_query("refundedNumber", TransactionStatus.REFUNDED, include_dev_test),

                *self._create_cashier_report_query(),
                *self._create_branch_report_query(),
                *self._create_this_report_query(),
                # *self._create_net_sales_query("previousAccumulatedSales", False),
                # *self._create_net_sales_query("presentAccumulatedSales"),
                {
                    "$lookup": {
                        "from": self._transaction_collection,
                        "let": {
                            "branchId": "$branchId",
                            "date": "$date",
                            "ptuNumber": "$ptuNumber"
                        },
                        "pipeline": [
                            self._default_filter(include_dev_test),
                            {
                                "$addFields": {
                                    "_id": { "$toString": "$_id" },
                                }
                            }
                        ],
                        "as": "transactions"
                    }
                },
                {
                    "$lookup": {
                        "from": 'transaction_discounts',
                        "let": {
                            "branchId": "$branchId",
                            "date": "$date",
                            "ptuNumber": "$ptuNumber"
                        },
                        "pipeline": [
                            self._default_filter(include_dev_test),
                            {
                                "$addFields": {
                                    "transactionId": {"$toObjectId": "$transactionId"}
                                }
                            },
                            { 
                                '$lookup': {
                                    'from': self._transaction_collection,
                                    'localField': 'transactionId',
                                    'foreignField': '_id',
                                    'as': 'transaction'
                                }, 
                            },
                            { "$unwind": "$transaction" },
                            # discount rows carry no PTU of their own — use the sale's
                            { "$match": { "$expr": { "$eq": [{ "$ifNull": ["$transaction.ptuNumber", None] }, "$$ptuNumber"] } } },
                            {
                                '$project': {
                                    "_id": 0,
                                    "transactionId": 0,
                                }
                            },
                        ],
                        "as": "discounts"
                    }
                },
                { "$sort": { "date": 1 }},
                {
                    '$project': {
                        "_id": 0,
                        'branchId': 0,
                        "discounts._id": 0,
                        # The discount row's own transactionId, converted to a real ObjectId
                        # earlier in this pipeline for the $lookup match — jsonify() has no
                        # encoder for ObjectId, so leaving it in the response 500s the endpoint
                        # whenever any discount is present.
                        "discounts.transactionId": 0,
                        "discounts.transaction._id": 0,
                        "discounts.transaction.transactionId": 0,
                        "discounts.transaction.transactionItems": 0,
                        "discounts.transaction._sync": 0,
                        "transactions._id": 0,
                        "transactions.transactionItems": 0,
                        # See the matching comment in cashier_report.py — the raw embedded
                        # transaction document's _sync.stamp_id is a real ObjectId with no
                        # jsonify() encoder.
                        "transactions._sync": 0,
                    }
                },
                {
                    "$addFields": {
                        "branch._id": { "$toString": "$branch._id" },
                    }
                }
            ]))

            reports = []
            for index, item in enumerate(data):
                discountSummary = {}
                # Only a still-completed discount row counts here. A cancelled/refunded sale's
                # discount must not stay counted — no offsetting discount row is ever created for
                # the void/refund mirror document (only the original's row has its status flipped),
                # so counting it regardless of status double-counts a reversed discount forever.
                discounts = filter(lambda i: i['memberType'] is not None and i['status'] == TransactionStatus.COMPLETED, item['discounts'])
                for key, value in groupby(discounts, lambda i: i['memberType']):
                    total = sum(map(lambda i: i['transaction']['totalMemberDiscount'], value))
                    total += discountSummary.get(key, 0)
                    discountSummary[key] = total
                item['discountSummary'] = discountSummary


                # Top-to-bottom breakdown that foots (Gross - Discount - Cancelled - Refunded = Net), see
                # app/utils/sales_summary.py. salesAdjustment now reports the voids processed in this window.
                item['salesSummary'] = summarize_sales(item['transactions'])
                item['salesAdjustment'] = {'cancelled': item['salesSummary']['cancelled'], 'refunded': item['salesSummary']['refunded']}

                # On-account sales are receivables, not money received: they are excluded from
                # "payments" here and taken out of the expected drawer total below.
                transactions = filter(lambda i: i['status'] == TransactionStatus.COMPLETED and tender_kind(i.get('tender')) not in (PaymentKind.CASH.value, PaymentKind.ON_ACCOUNT.value), item['transactions'])
                item['totalPayments'] = sum(map(lambda i: i['tender']['amount'], transactions))
                item['totalOnAccount'] = sum(i['totalNetSales'] for i in item['transactions'] if i['status'] == TransactionStatus.COMPLETED and tender_kind(i.get('tender')) == PaymentKind.ON_ACCOUNT.value)
                item['totalPayments'] += get(item, 'endingCashCount.total', 0)
                
                openingFundTotal = get(item, 'openingFund.total', 0)
                withdrawal = get(item, 'cashierReport.withdraw', 0)
                # Short/Over must add back what was legitimately withdrawn — expected cash in the
                # drawer is opening fund + net sales MINUS withdrawals, so without adding it back
                # here a withdrawal reads as a cash shortage instead of an accounted-for removal.
                difference = item['totalPayments'] - openingFundTotal - (item['totalNetSales'] - item['totalOnAccount']) + withdrawal
                item['cashDifference'] = difference

                item['totalPayments'] -= withdrawal

                transactionSummary = {}
                transactions = filter(lambda i: get(i, 'tender.type') is not None and i['status'] == 'completed', item['transactions'])
                for key, value in groupby(transactions, lambda i: get(i, 'tender.type')):
                    total = sum(map(lambda i: i['totalNetSales'], value))
                    total += transactionSummary.get(key, 0)
                    transactionSummary[key] = total
                item['transactionSummary'] = transactionSummary
                item['paymentBreakdown'] = payment_breakdown(item['transactions'])

                item['presentAccumulatedSales'] = self.calculate_accumulated_sales(item['branch']['_id'], datetime.strptime(item['date'], '%Y-%m-%d'), True, include_dev_test, item.get('ptuNumber'))
                item['previousAccumulatedSales'] = self.calculate_accumulated_sales(item['branch']['_id'], datetime.strptime(item['date'], '%Y-%m-%d'), False, include_dev_test, item.get('ptuNumber'))

                # item['presentAccumulatedSales'] = get(item, 'presentAccumulatedSales.totalSales', 0)
                # item['previousAccumulatedSales'] = get(item, 'previousAccumulatedSales.totalSales', 0)
                # Prefer the real, persisted per-branch Z-Counter stamped at generation time
                # (generate_reports -> Z_COUNTER sequence). index+1 is only a fallback for reports
                # generated before that field existed — it is NOT a real counter (it's the row's
                # position in whatever date-filtered result set this particular query happened to
                # return, so it changes with the filter and was never meant to be shown as-is).
                item['zCounter'] = get(item, 'thisReport.zCounter') or (index + 1)
                item.pop('thisReport', None)

                reports.append(item)
            return reports
        except Exception as e:
            raise e

    def find_by_date_and(self, date_filter: DateFilter, start_date=None, end_date=None, custom_date=None, query={}, include_dev_test=False):
        reports = self.find(query, include_dev_test=include_dev_test)

        if(date_filter == DateFilter.CUSTOM_DATE and custom_date is None):
            return []
        
        if(date_filter == DateFilter.CUSTOM_FILTER and start_date is None and end_date is None):
            return []


        filtered_reports = [
            report for report in reports 
            if compare_date_filter(
                date_filter, 
                report['date'],
                custom_date,
                start_date,
                end_date
            )
        ]

        return filtered_reports

    def calculate_accumulated_sales(self, branchId: str, date: datetime, present: bool = True, include_dev_test: bool = False, ptu_number=None):
        queryDate = date if present else (date - timedelta(days=1))
        dev_test_match = {} if include_dev_test else { "isDevTest": { "$ne": True } }

        try:
            data = list(self._db[self._transaction_collection].aggregate([
                {
                    '$match': {
                        "branchId": { "$eq": branchId },
                        # accumulated sales belong to one accredited machine (BIR grand total);
                        # None still matches legacy sales that carry no PTU
                        "ptuNumber": ptu_number if ptu_number else { "$in": [None, ""] },
                        "status": { "$in": [TransactionStatus.COMPLETED, TransactionStatus.REFUNDED] },
                        "date": { "$lte": str(queryDate.date()) },
                        **dev_test_match
                    }
                },
                {
                    "$group": {
                        "_id": None,
                        'date': { '$first': '$date' },
                        'branchId': { '$first': '$branchId' },
                        "totalNetSales": { "$sum": "$totalNetSales" },
                    }
                },
            ]))
            # print(f"Data: {json.dumps(data, indent=2)}")
            if(len(data) != 0):
                return data[0]['totalNetSales']
            return 0
        except Exception as e:
            raise e

    def _create_branch_query(self): 
        return [
            {
                    "$addFields": {
                        "branchId": {"$toObjectId": "$branchId"}
                    }
                },
                { 
                    '$lookup': {
                        'from': 'branches',
                        'localField': 'branchId',
                        'foreignField': '_id',
                        'as': 'branch'
                    }, 
                },
                { "$unwind": "$branch" },
                {
                    "$addFields": {
                        "branchId": {"$toString": "$branchId"}
                    }
                }
        ]
    
    def _create_net_sales_query(self, name, present: bool = True):
        startDate = getLocalTime().replace(day=1)
        endDate = getLocalTime()

        if(not present):
            endDate = (endDate - timedelta(days=1))
        
        # typeQuery = [
        #     {  "$gte": [ "$date", str(startDate.date()) ] },
        #     {  "$lte": [ "$date", str(endDate.date()) ] },
        # ]
        return [
            {
                "$lookup": {
                    "from": self._transaction_collection,
                    "let": {
                        "branchId": "$branchId",
                        "date": "$date",
                        "ptuNumber": "$ptuNumber"
                    },
                    "pipeline": [
                        {
                            "$match": {
                                "$expr": {
                                    "$and": [
                                        *self._default_filter()['$match']['$expr']['$and'],
                                        { "$eq": ["$status", TransactionStatus.COMPLETED] },
                                        { "$lte": [ "$date", "$$date" ] },
                                        # { "$gte": [ "$date", str(startDate.date()) ] },
                                    ],
                                }
                            }
                        },
                        {
                            "$group": {
                                "_id": None,
                                "totalSales": { "$sum": "$totalNetSales" }
                            }
                        },
                        {
                            "$project": {
                                "_id": 0
                            }
                        }
                    ],
                    "as": name
                }
            },
             { "$unwind": {
                'path': f"${name}",
                'preserveNullAndEmptyArrays': True    
            }}
        ]

    def _create_branch_report_query(self):
        now = getLocalDateStr()

        return [
            {
                "$lookup": {
                    "from": self._collection,
                    "let": {
                        "branchId": "$branchId",
                    },
                    "pipeline": [
                        {
                            "$match": {
                                "$expr": {
                                    "$and": [
                                        { "$eq": ["$branchId", "$$branchId"] },
                                        { "$lt": [ "date", now ] }
                                    ]
                                }
                            }
                        },
                        { "$sort": { "_id": -1 } },
                        { "$limit": 1 },
                        {
                            "$project": {
                                "_id": 0
                            }
                        }
                    ],
                    "as": "branchReport"
                }
            },
            { "$unwind": {
                'path': "$branchReport",
                'preserveNullAndEmptyArrays': True    
            }}
        ]

    def _create_this_report_query(self, name="thisReport"):
        """The actual generated branch_reports document for this exact (branchId, date) — as
        opposed to _create_branch_report_query's "most recent report before this date" lookup —
        used solely to surface its persisted zCounter field."""
        return [
            {
                "$lookup": {
                    "from": self._collection,
                    "let": {
                        "branchId": "$branchId",
                        "date": "$date",
                        "ptuNumber": "$ptuNumber"
                    },
                    "pipeline": [
                        self._default_filter(),
                        { "$project": { "_id": 0, "zCounter": 1 } }
                    ],
                    "as": name
                }
            },
            { "$unwind": {
                'path': f"${name}",
                'preserveNullAndEmptyArrays': True
            }},
        ]

    def _create_serial_number_range_query(self, name, type, include_dev_test=False):
        dev_test_filter = [] if include_dev_test else [{ "$ne": ["$isDevTest", True] }]
        return [
            {
                    "$lookup": {
                        "from": self._transaction_collection,
                        "let": {
                            "branchId": "$branchId",
                            "date": "$date",
                            "ptuNumber": "$ptuNumber"
                        },
                        "pipeline": [
                            {
                                "$match": {
                                    "$expr": {
                                        "$and": [
                                            { "$eq": ["$branchId", "$$branchId"] },
                                            { "$eq": ["$date", "$$date"] },
                                            { "$eq": [{ "$ifNull": ["$ptuNumber", None] }, "$$ptuNumber"] },
                                            {"$eq": ["$status", type]},
                                            *dev_test_filter,
                                        ]
                                    }
                                }
                            },
                           { 
                                '$group': {
                                    "_id": None,
                                    "beginning": { "$min": "$serialNumber" },
                                    "ending": { "$max": "$serialNumber" },
                                }
                            },
                        ],
                        "as": name
                    }
                },
                { "$unwind": {
                    'path': f"${name}",
                    'preserveNullAndEmptyArrays': True    
                }},
        ]
    
    def _create_cashier_report_query(self, name = "cashierReport"):
        return [
            {
                    "$lookup": {
                        "from": self._cashier_report_collection,
                        "let": {
                            "branchId": "$branchId",
                            "date": "$date",
                            "ptuNumber": "$ptuNumber"
                        },
                        "pipeline": [
                            self._default_filter(),
                           {
                                '$group': {
                                    "_id": None,
                                    "timeIn": { "$min": "$serialNumber" },
                                    "timeOut": { "$max": "$serialNumber" },
                                    "withdraw": { "$sum": "$withdraw" },
                                }
                            },
                        ],
                        "as": name
                    }
                },
                { "$unwind": {
                    'path': f"${name}",
                    'preserveNullAndEmptyArrays': True    
                }},
        ]

    def _create_cash_count_query(self, name, type):

        cashCountScript = [{ CashCount.formatKey(key): { "$sum": f'${CashCount.formatKey(key)}' } } for key in _cash_keys]
        cashCountQuery = {}
        for item in cashCountScript:
            cashCountQuery.update(item)

        return [
            {
                "$lookup": {
                    "from": self._cash_count_collection,
                        "let": {
                        "branchId": "$branchId",
                        "date": "$date",
                        "ptuNumber": "$ptuNumber"
                    },
                    "pipeline": [
                        {
                            "$match": {
                                "$expr": {
                                    "$and": [
                                        { "$eq": ["$branchId", "$$branchId"] },
                                        { "$eq": ["$date", "$$date"] },
                                        { "$eq": [{ "$ifNull": ["$ptuNumber", None] }, "$$ptuNumber"] },
                                        { "$eq": ["$type", type] },
                                    ]
                                }
                            }
                        },
                        { 
                            '$group': {
                                "_id": None,
                                **cashCountQuery,
                                "total": { '$sum': "$total" },
                            }
                        },
                    ],
                    "as": name
                }
            },
            { "$unwind": {
                'path': f"${name}",
                'preserveNullAndEmptyArrays': True    
            }},
        ]