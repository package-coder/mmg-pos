
from bson import ObjectId


class Branch:
    _id = None

    name = None
    city = None
    tin = None
    state = None
    postal_code = None
    contact_number = None
    email_address = None
    street_address = None
    is_active = None
    created_by = None
    created_at = None
    
    @staticmethod
    def fromDict(data: dict):
        branch = Branch()
        
        branch.id = data.get('id')
        branch.name = data['name']
        branch.city = data.get('city')
        branch.tin = data.get('tin')
        branch.state = data.get('state')
        branch.postal_code = data.get('postalCode')
        branch.contact_number = data.get('contactNumber')
        branch.email_address = data.get('emailAddress')
        branch.street_address = data.get('streetAddress')
        branch.is_active = data.get('isActive')
    
        return branch
    
    def toDict(self):
        return {
            "id": self.id,
            "name": self.name,
            "tin": self.tin,
            "city": self.city,
            "state": self.state,
            "postalCode": self.postal_code,
            "contactNumber": self.contact_number,
            "emailAddress": self.email_address,
            "streetAddress": self.street_address,
            "isActive": self.is_active,
        }

    @property
    def id(self): 
        if(self._id is not None):
            return str(self._id)

    @id.setter
    def id(self, value): 
        if value is not None:
            self._id = ObjectId(value)