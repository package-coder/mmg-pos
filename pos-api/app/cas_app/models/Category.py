
from bson import ObjectId


class Category:
    _id = None
    name = None
    
    @staticmethod
    def fromDict(data: dict):
        item = Category()
        if data.get('_id') is not None:
            item._id = str(data.get('_id'))
        item.name = data.get('name')
    
        return item
    
    def toDict(self):
        return {
            "_id": self._id,
            "name": self.name,
        }
