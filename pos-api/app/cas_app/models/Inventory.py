
from bson import ObjectId


class Inventory:
    _id = None
    itemId = None
    quantityOnHand = None
    reorderPoint = None
    expirationDate = None
    expirationWarningDays = None
    expirationStatus = None
    lotNumber = None
    
    @staticmethod
    def fromDict(data: dict):
        item = Inventory()
        if data.get('_id') is not None:
            item._id = str(data.get('_id'))
        item.itemId = data.get('itemId')
        item.quantityOnHand = data.get('quantityOnHand')
        item.reorderPoint = data.get('reorderPoint')
        item.expirationDate = data.get('expirationDate')
        item.expirationWarningDays = data.get('expirationWarningDays')
        item.expirationStatus = data.get('expirationStatus')
        item.lotNumber = data.get('lotNumber')
    
        return item
    
    def toDict(self):
        return {
            "_id": self._id,
            "itemId": self.itemId,
            "quantityOnHand": self.quantityOnHand,
            "reorderPoint": self.reorderPoint,
            "expirationDate": self.expirationDate,
            "expirationWarningDays": self.expirationWarningDays,
            "expirationStatus": self.expirationStatus,
            "lotNumber": self.lotNumber,
        }
