from enum import Enum
from typing import Optional

from pydantic import BaseModel

class EditPurchaseInvoice(BaseModel):
    issueDate: Optional[str]
    dueDate: Optional[str]
    supplierId: Optional[str]
    totalAmount: float = None
    isAccountMode: bool = None
    accounting: object = []
    items: object = []
    invoiceDate: Optional[str]
    status: Optional[str]
    refInvoiceNumber: Optional[str]
    notes: Optional[str]
    series: Optional[str]