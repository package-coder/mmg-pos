from enum import Enum, IntEnum
from typing import List

from pydantic import BaseModel, Field, computed_field

# from app.cas_app.models.new_models.Supplier import Supplier
from app.utils.utils import getLocalTimeStr


class PurchaseOrderTransactionStatus(str, Enum):
    PENDING_APPROVAL = "PENDING_APPROVAL"
    APPROVED = "APPROVED"
    REJECTED = "REJECTED"
    PENDING_INSPECTION = "PENDING_INSPECTION"
    PENDING_ACTION = "PENDING_ACTION"
    COMPLETED = "COMPLETED"
    STOCKED = "STOCKED"
    RECEIVED = "RECEIVED"

class PurchaseOrderItemCondition(str, Enum):
    GOOD = "GOOD"
    DAMAGE = "DAMAGE"

class PurchaseOrderDiscrepancyType(str, Enum):
    QUANTITY_MISMATCH = "QUANTITY_MISMATCH"
    MISSING = "MISSING"
    
class PurchaseOrderAction(str, Enum):
    ACCEPTED = "ACCEPTED"
    REJECTED = "REJECTED"


class PurchaseOrderItem(BaseModel):
    # id: str = Field(alias="_id", default=None)
    itemId: str = None
    purchaseOrderId: str = None
    name: str
    quantity: float
    unitPrice: float
    description: str = None
    unit: str = None
    condition: PurchaseOrderItemCondition = None
    quantityReceived: float = None
    inspection: PurchaseOrderAction = None
    inspectionReason: str = None

    @computed_field
    @property  
    def totalPrice(self) -> float:
        return self.unitPrice * self.quantity

class CreatePurchaseOrder(BaseModel):
    # id: str = Field(alias="_id", default=None)
    userId: str
    # supplier: Supplier = None
    status: PurchaseOrderTransactionStatus = PurchaseOrderTransactionStatus.PENDING_APPROVAL
    items: list[PurchaseOrderItem] = Field(min_items=1)
    action: PurchaseOrderAction = None
    actionReason: PurchaseOrderAction = None
    notes: str = None
    approverId: str = None
    createdAt: str = Field(default_factory=getLocalTimeStr)
    
    @computed_field
    @property  
    def totalAmount(self) -> float:
        sum = 0
        for item in self.items:
            sum += item.totalPrice
        return sum



class ReceivePurchaseOrderItem(BaseModel):
    id: str
    condition: PurchaseOrderItemCondition
    quantityReceived: float

class ReceivePurchaseOrder(BaseModel):
    id: str
    dateReceived: str = Field(default_factory=getLocalTimeStr)
    receiverId: str = None
    status: PurchaseOrderTransactionStatus = PurchaseOrderTransactionStatus.PENDING_INSPECTION
    items: list[ReceivePurchaseOrderItem] = Field(min_items=1)


class ApprovePurchaseOrder(BaseModel):
    id: str
    dateApproved: str = Field(default_factory=getLocalTimeStr)
    status: PurchaseOrderTransactionStatus
    approverId: str



class InspectPurchaseOrderItem(BaseModel):
    id: str
    inspection: PurchaseOrderAction
    inspectionReason: str = None

class InspectPurchaseOrder(BaseModel):
    id: str
    dateInspected: str = Field(default_factory=getLocalTimeStr)
    inspectorId: str = None
    items: list[InspectPurchaseOrderItem] = Field(min_items=1)
    status: PurchaseOrderTransactionStatus = PurchaseOrderTransactionStatus.PENDING_ACTION

class ActionPurchaseOrder(BaseModel):
    id: str
    dateCompleted: str = Field(default_factory=getLocalTimeStr)
    action: PurchaseOrderAction
    actionReason: str = None
