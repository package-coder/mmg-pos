
from bson import ObjectId

from app.cas_app.models.Entry import Entry
from app.cas_app.models.Accounting import Accounting

class Receipt:
    _id = None
    paymentDate = None
    paymentMethod = None
    totalAmountPaid = None
    notes = None
    isAccountMode = None
    entries = []
    accounting = []
    refInvoiceNumber = None
    series = None
    contactName = None
    status = None
    @staticmethod
    def fromDict(data: dict):
        item = Receipt()
        if data.get('_id') is not None:
            item._id = str(data.get('_id'))
        if data.get('contactName') is not None:
            item.contactName = data.get('contactName')
        if data.get('status') is not None:
            item.status = data.get('status')
        item.paymentDate = data.get('paymentDate')
        item.paymentMethod = data.get('paymentMethod')
        item.totalAmountPaid = data.get('totalAmountPaid')
        item.notes = data.get('notes')
        item.isAccountMode = data.get('isAccountMode')
        item.refInvoiceNumber = data.get('refInvoiceNumber')
        e = []
        for entry in data.get('entries'):
            e.append(Entry.fromDict(entry))
        accounting = []
        if isinstance(data.get('accounting'), list):  # Check if 'accounting' is an array
            for entry in data['accounting']:
                accounting.append(Accounting.fromDict(entry))    
        item.accounting = accounting
        item.entries = e
        return item
        
    def toDict(self):
        dict = {
            "_id": self._id,
            "paymentDate": self.paymentDate,
            "contactName": self.contactName,
            "paymentMethod": self.paymentMethod,
            "totalAmountPaid": self.totalAmountPaid,
            "notes": self.notes,
            "isAccountMode": self.isAccountMode,
            "accounting": self.accounting,
            "refInvoiceNumber": self.refInvoiceNumber,
            "contactName": self.contactName,
            "refInvoiceNumber": self.refInvoiceNumber,
            "status": self.status
        }   
        e = []
        for entry in self.entries:
            e.append(entry.toDict())
        dict['entries'] = e
        dict['accounting'] = [account.toDict() for account in self.accounting]
        return dict
