from typing import Optional
from pydantic import BaseModel

from app.models.CashCount import CashCount


class TimeInReportDTO(BaseModel):
    branchId: str

class TimeOutReportDTO(BaseModel):
    branchId: str
    endingCashOnHand: CashCount