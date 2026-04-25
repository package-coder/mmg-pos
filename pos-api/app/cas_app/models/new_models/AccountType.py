from enum import Enum
from typing import Optional

from pydantic import BaseModel


class EditAccountType(BaseModel):
    name: str = None
    description: Optional[str] = None