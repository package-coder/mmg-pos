from bson import ObjectId

class Entry:
    id = None
    name = None
    quantity = None
    unitPrice = None
    total = None

    def __init__(self, id, name, quantity, unitPrice, total):
        self.id = str(id)
        self.name = name
        self.quantity = quantity
        self.unitPrice = unitPrice
        self.total = total
   

    @staticmethod
    def fromDict(data: dict):
        if data is None:
            return None
        return Entry( 
            data.get('id') or None,
            data.get('name'),
            data.get('quantity'),
            data.get('unitPrice'),
            data.get('total')
        )


    def toDict(self): 
        return {
            "id": self.id,
            "name": self.name,
            "quantity": self.quantity,
            "unitPrice": self.unitPrice,
            "total": self.total,
        } 