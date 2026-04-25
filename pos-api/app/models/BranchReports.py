
from bson import ObjectId

class BranchReport:
    _id = None
    _cashier_id = None
    _branch_id = None
    _ending_cash_balance = None

    sales_deposits = None
    total_beginning_cash = None
    total_ending_cash = None
    total_cash_sales = None
    total_cash_gain = None
    total_cash_loss = None
    date = None
    created_at = None
    
    @staticmethod
    def fromDict(data: dict):
        report = BranchReport()
        
        report.id = data.get('_id')
        report.cashier_id = data.get('cashierId')
        report.branch_id = data.get('branchId')
        report.sales_deposits = data.get('salesDeposits')
        report.total_beginning_cash = data.get('totalBeginningCash')
        report.total_ending_cash = data.get('totalEndingCash')
        report.total_cash_sales = data.get('totalCashSales')
        report.total_cash_loss = data.get('totalCashLoss')
        report.total_cash_gain = data.get('totalCashGain')
        report.ending_cash_balance = data.get('endingCashBalance')
        report.date = data.get('date')

        return report
    
    def toDict(self):

        return {
            "id": self.id,
            "cashierId": self.cashier_id,
            "branchId": self.branch_id,
            "salesDeposits": self.sales_deposits,
            "totalBeginningCash": self.total_beginning_cash,
            "totalEndingCash": self.total_ending_cash,
            "totalCashSales": self.total_cash_sales,
            "totalCashLoss": self.total_cash_loss,
            "totalCashGain": self.total_cash_gain,
            "endingCashBalance": self.ending_cash_balance,
            "date": self.date,
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
    
    # @property
    # def sales_deposits(self): 
    #     if(self._sales_deposits is not None):
    #         return str(self._sales_deposits)

    # @sales_deposits.setter
    # def sales_deposits(self, value): 
    #     if value is not None:
    #         self._sales_deposits = ObjectId(value)
    
    @property
    def ending_cash_balance(self): 
        return self._ending_cash_balance

    @ending_cash_balance.setter
    def ending_cash_balance(self, value): 
        if value is not None:
            self._ending_cash_balance = float(value)
