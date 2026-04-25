
from datetime import datetime
from typing import Optional
from bson import ObjectId
from pydantic import BaseModel, Field, computed_field
from pydash import omit

from app.new_models.CashCount import CashCount
from app.utils.utils import getLocalDateStr, getLocalTimeStr


class TimeInCashierReport(BaseModel):
    branchId: str
    timeOut: Optional[str] = None
    openingFund: Optional[CashCount] = None
    # endingCashCount: Optional[str] = None
    cashierId: str = None
    timeIn: str = Field(default_factory=getLocalTimeStr)
    date: str = Field(default_factory=getLocalDateStr)

    
class TimeOutCashierReport(BaseModel):
    id: str
    branchId: str
    endingCashCount: CashCount
    withdraw: Optional[float] = 0.0
    timeOut: str = Field(default_factory=getLocalTimeStr)
    date: str = Field(default_factory=getLocalDateStr)


class CashierReport(BaseModel):
    id: Optional[str] = Field(alias="_id", default=None)
    branch: object
    cashier: object
    sales: Optional[object] = None
    beginningCashOnHand: CashCount = None
    endingCashOnHand: CashCount = None
    timeIn: str
    timeOut: str
    date: str
    transactions: list[object]

    # @computed_field
    # def transacs(self) -> list[object]:
    #     ret: list = []
    #     for transaction in self.transactions:
    #         ret.append(omit(transaction, '_id'))
    #     return ret

    @computed_field
    def discounts(self) -> list[object]:
        ret = []
        for transaction in self.transactions:
            for service in transaction.get('services', []):
                    discount = service.get('discount')
                    if(discount == None):
                        continue
                    # exists = list(filter(lambda i: i['_id'] == discount['_id'], ret))
                    # if(exists is None or len(exists) > 0):
                    #     continue

                    ret.append(omit(discount, '_id'))
        return ret

    # @computed_field
    def difference(self) -> float:
        if(self.sales is None):
            return 0
        
        totalSales = self.sales['totalNetSales'] if self.sales is not None else 0
        cashOnHand = self.endingCashOnHand['total'] if self.endingCashOnHand is not None else 0
        return cashOnHand - totalSales
    
    @computed_field
    def cashGain(self) -> float:
        diff = self.difference()
        return diff if diff > 0 else 0
    
    @computed_field
    def cashLoss(self) -> float:
        diff = self.difference()
        return diff * -1 if diff < 0 else 0