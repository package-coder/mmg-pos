
from bson import ObjectId


class Payment:
    _id = None
    paymentDate = None
    paymentMethod = None
    notes = None
    entries = []
    isAccountMode = None
    totalAmountPaid = None
    contactName = None
    accounting = []
    refInvoiceNumber = None
    series = None
    status = None
    @staticmethod
    def fromDict(data: dict):
        item = Payment()
        if data.get('_id') is not None:
            item._id = str(data.get('_id'))
        item.paymentDate = data.get('paymentDate')
        item.paymentMethod = data.get('paymentMethod')
        item.notes = data.get('notes')
        item.entries = data.get('entries')
        item.isAccountMode = data.get('isAccountMode')
        item.totalAmountPaid = data.get('totalAmountPaid')
        item.contactName = data.get('contactName')
        item.accounting = data.get('accounting')
        item.refInvoiceNumber = data.get('refInvoiceNumber')
        item.status = data.get('status')
        return item
    
    def toDict(self):
        return {
            "_id": self._id,
            "paymentDate": self.paymentDate,
            "paymentMethod": self.paymentMethod,
            "notes": self.notes,
            "entries": self.entries,
            "isAccountMode": self.isAccountMode,
            "accounting": self.accounting,
            "refInvoiceNumber": self.refInvoiceNumber,
            "status": self.status, 
            "contactName": self.contactName,
            "totalAmountPaid": self.totalAmountPaid
        }
