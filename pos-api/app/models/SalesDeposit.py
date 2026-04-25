
from bson import ObjectId

class SalesDeposit:
    _id = None
    _cashier_id = None
    _branch_id = None
    _amount = None

    cashier_name = None
    reference_number = None
    bank_name = None
    bank_code = None
    bank_address = None
    date_deposited = None
    created_at = None
    
    @staticmethod
    def fromDict(data: dict):
        sales = SalesDeposit()
        
        sales.id = data.get('_id')
        sales.cashier_id = data.get('cashierId')
        sales.branch_id = data.get('branchId')
        sales.reference_number = data.get('referenceNumber')
        sales.bank_name = data.get('bankName')
        sales.bank_code = data.get('bankCode')
        sales.bank_address = data.get('bankAddress')
        sales.amount = data.get('amount')
        sales.date_deposited = data.get('dateDeposited')
        sales.created_at = data.get('createdAt')

        return sales
    
    def toDict(self):
        return {
            "id": self.id,
            "cashierId": self.cashier_id,
            "branchId": self.branch_id,
            "referenceNumber": self.reference_number,
            "bankName": self.bank_name,
            "bankCode": self.bank_code,
            "bankAddress": self.bank_address,
            "amount": self.amount,
            "dateDeposited": self.date_deposited,
            "createdAt": self.created_at
        }
    
    @property
    def id(self): 
        if(self._id is not None):
            return str(self._id)

    @id.setter
    def id(self, value): 
        if value is not None:
            self._id = ObjectId(value)

    @property
    def cashier_id(self): 
        if(self._cashier_id is not None):
            return str(self._cashier_id)

    @cashier_id.setter
    def cashier_id(self, value): 
        if value is not None:
            self._cashier_id = ObjectId(value)
    
    @property
    def branch_id(self): 
        if(self._branch_id is not None):
            return str(self._branch_id)

    @branch_id.setter
    def branch_id(self, value): 
        if value is not None:
            self._branch_id = ObjectId(value)

    @property
    def amount(self): 
        return self._amount

    @amount.setter
    def amount(self, value): 
        if value is not None:
            self._amount = float(value)
