
from bson import ObjectId


class PurchaseInvoice:
    _id = None
    issueDate = None
    dueDate = None
    supplierId = None
    totalAmount = None
    isAccountMode = None
    accounting = []
    items = []
    invoiceDate = None
    status = None
    refInvoiceNumber = None
    notes = None
    series = None
    
    @staticmethod
    def fromDict(data: dict):
        item = PurchaseInvoice()
        if data.get('_id') is not None:
            item._id = str(data.get('_id'))
        item.issueDate = data.get('issueDate')
        item.dueDate = data.get('dueDate')
        item.supplierId = data.get('supplierId')
        item.totalAmount = data.get('totalAmount')
        item.isAccountMode = data.get('isAccountMode')
        item.accounting = data.get('accounting')
        item.invoiceDate = data.get('invoiceDate')
        item.status = data.get('status')
        item.refInvoiceNumber = data.get('refInvoiceNumber')
        item.notes = data.get('notes')
        item.items = data.get('items')
        return item
    
    def toDict(self):
        ret = {
            "_id": self._id,
            "issueDate": self.issueDate,
            "dueDate": self.dueDate,
            "supplierId": self.supplierId,
            "totalAmount": self.totalAmount,
            "isAccountMode": self.isAccountMode,
            "accounting": self.accounting,
            "items": self.items,
            "invoiceDate": self.invoiceDate,
            "status": self.status,
            "refInvoiceNumber": self.refInvoiceNumber,
            "notes": self.notes
        }
        return ret
