
from datetime import datetime
from typing import Optional
from pydantic import BaseModel

from app.utils.utils import getTimeZone


class SavePrinterSetting(BaseModel):
    ipAddress: str
    vendorId: Optional[str]
    productId: Optional[str]
    userId: str
    date: Optional[str] = str(datetime.now(getTimeZone()).date())
    