from bson import ObjectId
from datetime import datetime

class PurchaseOrderReceipt:
    def __init__(self):
        self.purchaseOrderID = None 
        self.purchaseOrderItemID = None
        self.quantity = 0
        self.price = 0.0
        self.officialReceipt = None
        self.userReceiverID = None  # Reference to the user schema (ObjectId)
        self.createdBy = None  # Reference to the user schema (ObjectId)
        self.createdAt = datetime.now()
        self.updatedAt = datetime.now()
        self.status = None
        self.notes = None

    @staticmethod
    def fromDict(data: dict):
        item = PurchaseOrderReceipt()
        item.purchaseOrderID = ObjectId(data.get('purchaseOrderID') ) # Should be an ObjectId referencing purchase_orders
        item.quantity = data.get('quantity', 0)
        item.price = data.get('price', 0.0)
        item.notes =  data.get("notes")
        item.status = data.get("status")
        item.purchaseOrderItemID = ObjectId(data.get('purchaseOrderItemID'))
        item.officialReceipt = data.get('officialReceipt')
        item.userReceiverID = ObjectId(data.get('userReceiverID'))  # Should be an ObjectId referencing users
        item.createdBy = ObjectId(data.get('createdBy'))  # Should be an ObjectId referencing users
        item.createdAt = data.get('createdAt', datetime.now())
        item.updatedAt = data.get('updatedAt', datetime.now())
        return item

    def toDict(self):
        return {
            "purchaseOrderID": self.purchaseOrderID if self.purchaseOrderID is not None else None,
            "quantity": self.quantity,
            "price": self.price,
            "notes":self.notes,
            "status": self.status,
            "purchaseOrderItemID": self.purchaseOrderItemID,
            "officialReceipt": self.officialReceipt,
            "userReceiverID": self.userReceiverID if self.userReceiverID is not None else None,
            "createdBy": self.createdBy if self.createdBy is not None else None,
            "createdAt": self.createdAt.isoformat(),  # Format datetime to ISO string
            "updatedAt": self.updatedAt.isoformat(),  # Format datetime to ISO string
        }
