from enum import Enum
from typing import Optional

from pydantic import BaseModel


# class AccountType(str, Enum):
#     ASSET = "ASSET"
#     LIABILITY = "LIABILITY"
#     EXPENSE = "EXPENSE"
#     EQUITY = "EQUITY"
   
class EditChartAccount(BaseModel):
    accountNumber: int = None
    accountName: str = None
    accountType: Optional[str] = None
    accountGroup: Optional[str] = None
    description: Optional[str] = None
    