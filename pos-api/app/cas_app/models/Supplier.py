
from bson import ObjectId


class ContactInformation:
    address = None
    phone = None
    email = None

    def __init__(self, address, phone, email):
        self.address = address
        self.phone = phone
        self.email = email

    @staticmethod
    def fromDict(data: dict):
        if data is None:
            return None
        
        return ContactInformation( 
            data.get('address'),
            data.get('phone'),
            data.get('email')
        )

    def toDict(self): 
        return {
            "address": self.address,
            "phone": self.phone,
            "email": self.email,
        } 
class Supplier:
    _id = None
    name = None
    contactInformation = None
    notes = None
    paymentHistory = []
    tinNumber = None
    @staticmethod
    def fromDict(data: dict):
        item = Supplier()
        if data.get('_id') is not None:
            item._id = str(data.get('_id'))
        if data.get('paymentHistory') is not None:
            item.paymentHistory = data.get('paymentHistory')
        item.name = data.get('name')
        item.contactInformation = ContactInformation.fromDict(data.get('contactInformation'))
        item.notes = data.get('notes')
        item.tinNumber = data.get('tinNumber') or ""
      
        return item
    
    def toDict(self):
        return {
            "_id": self._id,
            "name": self.name,
            "contactInformation": self.contactInformation.toDict(),
            "notes": self.notes,
            "paymentHistory": self.paymentHistory,
            "tinNumber": self.tinNumber or ""
        }
