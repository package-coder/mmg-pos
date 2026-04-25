
from bson import ObjectId


class PurchaseOrder:
    _id = None
    supplierId = None
    supplierName = None
    supplierEmail = None
    items = []
    totalAmount = 0
    status = "Pending Approval"
    notes = None
    approverUserID = None
    isOrderCompleted = None
    logs= []
    @staticmethod
    def fromDict(data: dict):
        item = PurchaseOrder()
        if data.get('_id') is not None:
            item._id = str(data.get('_id'))
        item.supplierId = data.get('supplierId')
        item.items = data.get('items')
        item.totalAmount = data.get('totalAmount')
        item.status = data.get('status')
        item.supplierName = data.get('supplierName')
        item.supplierEmail = data.get('supplierEmail')
        item.notes = data.get('notes')
        item.approverUserID = data.get('approverUserID')
        if data.get('isOrderCompleted') is not None:
            item.isOrderCompleted = data.get('isOrderCompleted')
        item.logs = data.get('logs') or []
        return item
       
    
    def toDict(self):
        return {
            "_id": self._id,
            "isOrderCompleted": self.isOrderCompleted,
            "supplierId": self.supplierId,
            "items": self.items,
            "totalAmount": self.totalAmount,
            "status": self.status,
            "supplierEmail": self.supplierEmail,
            "supplierName": self.supplierName,
            "notes": self.notes,
            "approverUserID": self.approverUserID,
            "logs": self.logs or []
        }
