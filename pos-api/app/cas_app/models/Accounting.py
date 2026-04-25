from bson import ObjectId

class Accounting:
    account_code_debit = None
    account_code_credit = None
    def __init__(self, account_code_debit, account_code_credit):
        self.account_code_debit = account_code_debit
        self.account_code_credit = account_code_credit

    @staticmethod
    def fromDict(data: dict):
        if data is None:
            return None
        
        return Accounting( 
            data.get('account_code_debit') or None,
            data.get('account_code_credit') or None,
        )


    def toDict(self): 
        return {
            "account_code_debit": self.account_code_debit,
            "account_code_credit": self.account_code_credit,
        } 