
from bson import ObjectId

from app.models.CashCount import CashCount


class CashierReport:
    _id = None
    _cashier_id = None
    _branch_id = None

    beginning_cash_on_hand: None = None
    ending_cash_on_hand: None = None
    time_in = None
    time_out = None
    cash_sales = None
    date = None
    
    @staticmethod
    def fromDict(data: dict):
        report = CashierReport()
        
        report.id = data.get('_id')
        report.cashier_id = data.get('cashierId')
        report.branch_id = data.get('branchId')
        report.time_in = data.get('timeIn')
        report.time_out = data.get('timeOut')
        report.cash_sales = data.get('cashSales')
        report.date = data.get('date')
        report.beginning_cash_on_hand = CashCount.fromDict(data.get('beginningCashOnHand'))
        report.ending_cash_on_hand = CashCount.fromDict(data.get('endingCashOnHand'))

        return report
    
    def toDict(self):

        beginning_cash_on_hand = None
        ending_cash_on_hand = None

        if(self.beginning_cash_on_hand is not None):
            beginning_cash_on_hand = self.beginning_cash_on_hand.toDict()
        if(self.ending_cash_on_hand is not None):
            ending_cash_on_hand = self.ending_cash_on_hand.toDict()

        return {
            "id": self.id,
            "timeIn": self.time_in,
            "timeOut": self.time_out,
            "cashierId": self.cashier_id,
            "branchId": self.branch_id,
            "beginningCashOnHand": beginning_cash_on_hand,
            "endingCashOnHand": ending_cash_on_hand,
            "cashSales": self.cash_sales,
            "cashGain": self.cash_gain,
            "cashLoss": self.cash_loss,
            "date": self.date
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
    def cash_gain(self):
        diff = self.compute_diff()
        
        if diff is None: 
            return

        if diff < 0: 
            return 0
        
        return diff
    
    @property
    def cash_loss(self):
        diff = self.compute_diff()

        if diff is None: 
            return

        if diff > 0: 
            return 0
        
        return diff * -1
    
    def compute_diff(self): 
        if self.beginning_cash_on_hand is None or self.ending_cash_on_hand is None or self.cash_sales is None:
            return None

        beginning_total = self.beginning_cash_on_hand.total
        ending_total = self.ending_cash_on_hand.total
        return ending_total - (beginning_total + self.cash_sales)