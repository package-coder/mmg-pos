from enum import Enum
from typing import Optional

from pydantic import BaseModel, Field, field_validator


class PaymentKind(str, Enum):
    """Decides how Checkout collects the payment and how reports count it."""
    CASH = "cash"              # tender amount + change; counts in the cash drawer
    CHEQUE = "cheque"          # retired: no longer offered, kept so old cheque sales still read correctly
    REFERENCE = "reference"    # card, e-wallet, bank transfer... a reference number is required
    ON_ACCOUNT = "on-account"  # charged / pay later via the Bill To panel; a receivable, not a payment


# Built in, always available even before the first sync from central. Admins can rename them or
# switch them off (except cash) but never delete them or change what they are, because tender
# codes/kinds are stored on every transaction and reports depend on them.
SYSTEM_METHODS = [
    {"code": "cash", "name": "Cash", "kind": PaymentKind.CASH.value, "sortOrder": 0},
    {"code": "on-account", "name": "On Account", "kind": PaymentKind.ON_ACCOUNT.value, "sortOrder": 1},
]
SYSTEM_CODES = {m["code"] for m in SYSTEM_METHODS}
ALWAYS_ACTIVE = {"cash"}
# Cheque was removed as a payment method. Its code stays reserved: old transactions carry it, and a
# leftover stored row for it must not resurface as a new method.
RETIRED_CODES = {"cheque"}


class PaymentMethod(BaseModel):
    code: str
    name: str
    kind: PaymentKind
    system: bool = False
    active: bool = True
    # Reference-number methods only: must the cashier enter a reference / approval number?
    requireReference: Optional[bool] = None


def _clean_name(value: Optional[str]) -> Optional[str]:
    if value is None:
        return None
    value = " ".join(value.split())
    if not value:
        raise ValueError("Name is required")
    return value


class CreatePaymentMethodRequest(BaseModel):
    # Admin-created methods are always the "reference number" kind (card, GCash, bank transfer...).
    name: str = Field(max_length=40)
    requireReference: bool = True

    @field_validator("name")
    @classmethod
    def clean(cls, value):
        return _clean_name(value)


class UpdatePaymentMethodRequest(BaseModel):
    name: Optional[str] = Field(default=None, max_length=40)
    active: Optional[bool] = None
    requireReference: Optional[bool] = None

    @field_validator("name")
    @classmethod
    def clean(cls, value):
        return _clean_name(value)
