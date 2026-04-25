

from typing import Optional
from pydantic import BaseModel, ValidationError, field_validator, validator

_cash_keys = ['1000', '500', '200', '100', '50', '20', '10', '5', '1', '0.25', '0.05', '0.1']
class CashCount(BaseModel):
    count: object
    total: Optional[float] = None

    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self.set_count(kwargs['count'])

    def set_count(self, value):
        if value is None:
            return None
        
        _new_count = {}
        for key in _cash_keys:
            formattedKey = self.formatKey(key)
            try: 
                count = value[key]
                if(count is None):
                    raise
                _new_count[formattedKey] = count
            except:
                _new_count[formattedKey] = 0

        self.count = _new_count
        self.total = self._compute_cash_count_total(self.count)

    def _compute_cash_count_total(self, cash_count: dict | None): 
        if cash_count is None: 
            return 0.0
        
        sum = 0.0
        for key, count in cash_count.items():
            key = self.keyToFloat(key)
            sum += float(key) * count
        return sum

    @staticmethod
    def formatKey(key):
        return f'M{key}'.replace('.', 'P')   
    
    @staticmethod
    def keyToFloat(key):
        return str(key).split('M')[1].replace('P', '.')