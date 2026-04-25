
from bson import ObjectId


class Item:
    itemId = None
    name = None
    quantity = None
    unitPrice = None
    total = None

    def __init__(self, itemId, name, quantity, unitPrice, total):
        self.itemId = itemId
        self.name = name
        self.quantity = quantity
        self.unitPrice = unitPrice
        self.total = total

    @staticmethod
    def fromDict(data: dict):
        if data is None:
            return None
        
        return Item( 
            data.get('itemId'),
            data.get('name'),
            data.get('quantity'),
            data.get('unitPrice'),
            data.get('total')
        )


    def toDict(self): 
        return {
            "itemId": self.itemId,
            "name": self.name,
            "quantity": self.quantity,
            "unitPrice": self.unitPrice,
            "total": self.total,
        } 

class SalesInvoice:
    _id = None
    invoiceDate = None
    dueDate = None
    contactId = None
    items = []
    subtotal = None
    total = None
    notes = None
    termsAndConditions = None
    isAccountMode = None
    refInvoiceNumber = None
    accounting = []
    series = None
    
    @staticmethod
    def fromDict(data: dict):
        item = SalesInvoice()
        if data.get('_id') is not None:
            item._id = str(data.get('_id'))
        item.invoiceDate = data.get('invoiceDate')
        item.dueDate = data.get('dueDate')
        item.contactId = data.get('contactId')
        item.subtotal = data.get('subtotal')
        item.total = data.get('total')
        item.notes = data.get('notes')
        item.termsAndConditions = data.get('termsAndConditions')
        item.isAccountMode = data.get('isAccountMode')
        item.accounting = data.get('accounting')
        item.refInvoiceNumber = data.get('refInvoiceNumber')
        e = []
        for _item in data.get('items'):
            e.append(Item.fromDict(_item))
        item.items = e
        return item
    
    def toDict(self):
        ret = {
            "_id": self._id,
            "invoiceDate": self.invoiceDate,
            "dueDate": self.dueDate,
            "contactId": self.contactId,
            "dueDate": self.dueDate,
            "subtotal": self.subtotal,
            "total": self.total,
            "notes": self.notes,
            "termsAndConditions": self.termsAndConditions,
            "isAccountMode": self.isAccountMode,
            "accounting": self.accounting,
            "refInvoiceNumber": self.refInvoiceNumber,
        }
        e = []
        for _item in self.items:
            e.append(_item.toDict())
        ret['items'] = e
        return ret
