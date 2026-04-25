
from datetime import date, datetime
from typing import Optional
from bson import ObjectId
from pydantic import BaseModel, Field, computed_field
from pydash import omit

from app.new_models.CashCount import CashCount
from app.utils.utils import getLocalDateStr, getLocalTimeStr


class RecordBranchReportGeneration(BaseModel):
    branchId: str
    timeOut: Optional[str] = None
    openingFund: Optional[CashCount] = None
    # endingCashCount: Optional[str] = None
    cashierId: str = None
    timeIn: str = Field(default_factory=getLocalTimeStr)
    datetime: str = Field(default_factory=getLocalDateStr)

class GetBranchReportQuery(BaseModel): 
    startDate: Optional[date] = None
    endDate: Optional[date] = None
    branchIds: Optional[list[str]] = None
    
class GenerateBranchReport(BaseModel): 
    date: str = Field(default_factory=getLocalDateStr)
    cashierId: str
    branchId: str