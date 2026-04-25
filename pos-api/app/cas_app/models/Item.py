
from bson import ObjectId


class Item:
    _id = None
    name = None
    description = None
    categoryId = None
    uom = None
    reorderLevel = None
    criticalLevel = None
    supplierId = None
    purchasePrice = None
    chartAccountId = None
    chartAccountName = None
    @staticmethod
    def fromDict(data: dict):
        item = Item()
        if data.get('_id') is not None:
            item._id = str(data.get('_id'))
        item.name = data.get('name')
        item.description = data.get('description')
        item.categoryId = data.get('categoryId')
        item.uom = data.get('uom')
        item.reorderLevel = data.get('reorderLevel')
        item.criticalLevel = data.get('criticalLevel')
        item.supplierId = data.get('supplierId')
        item.purchasePrice = data.get('purchasePrice')
        item.chartAccountId = data.get('chartAccountId') or None
        item.chartAccountName = data.get('chartAccountName') or None
        return item
    
    def toDict(self):
        return {
            "_id": self._id,
            "name": self.name,
            "description": self.description,
            "categoryId": self.categoryId,
            "uom": self.uom,
            "reorderLevel": self.reorderLevel,
            "criticalLevel": self.criticalLevel,
            "supplierId": self.supplierId,
            "purchasePrice": self.purchasePrice,
            "chartAccountId": self.chartAccountId or None,
            "chartAccountName": self.chartAccountName or None
        }
