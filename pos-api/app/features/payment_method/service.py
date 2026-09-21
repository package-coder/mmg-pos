import re
from datetime import datetime
from typing import List, Optional

from app.features.payment_method.models import (
    ALWAYS_ACTIVE, RETIRED_CODES, SYSTEM_CODES, SYSTEM_METHODS, CreatePaymentMethodRequest, PaymentKind, UpdatePaymentMethodRequest,
)


class PaymentMethodError(Exception):
    """A rule was broken (unknown code, duplicate name...). Routes turn it into a 4xx."""

    def __init__(self, message: str, status: int = 400):
        super().__init__(message)
        self.status = status


def tender_kind(tender: Optional[dict]) -> str:
    """Kind of a stored transaction tender. Older transactions carry only `type`; the three
    original types map to themselves and anything else counts as a plain payment."""
    if not tender:
        return PaymentKind.CASH.value
    kind = tender.get('kind')
    if kind:
        return kind
    legacy = tender.get('type')
    return legacy if legacy in (PaymentKind.CASH.value, PaymentKind.CHEQUE.value, PaymentKind.ON_ACCOUNT.value) else PaymentKind.CASH.value


def list_methods(repo, include_inactive: bool = False) -> List[dict]:
    stored = repo.find_all()
    by_code = {d.get('code'): d for d in stored}

    methods = []
    for base in SYSTEM_METHODS:
        override = by_code.get(base['code'], {})
        methods.append({
            'code': base['code'],
            'name': override.get('name') or base['name'],
            'kind': base['kind'],
            'system': True,
            'active': True if base['code'] in ALWAYS_ACTIVE else override.get('active', True),
            'requireReference': None,
        })

    custom = sorted(
        (d for d in stored if d.get('code') and d['code'] not in SYSTEM_CODES and d['code'] not in RETIRED_CODES),
        key=lambda d: (d.get('created_at') or datetime.min, d.get('name', '')),
    )
    for d in custom:
        methods.append({
            'code': d['code'],
            'name': d['name'],
            'kind': d.get('kind') or PaymentKind.REFERENCE.value,
            'system': False,
            'active': d.get('active', True),
            # Older rows were created before this setting existed and always asked for one.
            'requireReference': d.get('requireReference', True),
        })

    return methods if include_inactive else [m for m in methods if m['active']]


def get_active_method(repo, code: Optional[str]) -> Optional[dict]:
    if not code:
        return None
    return next((m for m in list_methods(repo) if m['code'] == code), None)


def _slug(name: str) -> str:
    return re.sub(r'[^a-z0-9]+', '-', name.lower()).strip('-') or 'method'


def create_method(repo, request: CreatePaymentMethodRequest) -> dict:
    existing = list_methods(repo, include_inactive=True)
    if any(m['name'].lower() == request.name.lower() for m in existing):
        raise PaymentMethodError(f"A payment method named '{request.name}' already exists.", 409)

    taken = {m['code'] for m in existing} | RETIRED_CODES
    base = _slug(request.name)
    code, n = base, 2
    while code in taken:
        code, n = f'{base}-{n}', n + 1

    repo.create({
        'code': code,
        'name': request.name,
        'kind': PaymentKind.REFERENCE.value,
        'active': True,
        'requireReference': request.requireReference,
        'created_at': datetime.utcnow(),
    })
    return next(m for m in list_methods(repo, include_inactive=True) if m['code'] == code)


def update_method(repo, code: str, request: UpdatePaymentMethodRequest) -> dict:
    methods = {m['code']: m for m in list_methods(repo, include_inactive=True)}
    method = methods.get(code)
    if method is None:
        raise PaymentMethodError('Payment method not found.', 404)

    fields = {}
    if request.name is not None and request.name != method['name']:
        if any(m['code'] != code and m['name'].lower() == request.name.lower() for m in methods.values()):
            raise PaymentMethodError(f"A payment method named '{request.name}' already exists.", 409)
        fields['name'] = request.name
    if request.active is not None:
        if code in ALWAYS_ACTIVE and not request.active:
            raise PaymentMethodError(f"{method['name']} cannot be switched off.", 400)
        fields['active'] = request.active

    if request.requireReference is not None and request.requireReference != method['requireReference']:
        if method['kind'] != PaymentKind.REFERENCE.value:
            raise PaymentMethodError('Only reference-number payment methods have this setting.', 400)
        fields['requireReference'] = request.requireReference

    if fields:
        repo.upsert_by_code(code, fields)
    return next(m for m in list_methods(repo, include_inactive=True) if m['code'] == code)


def ensure_admin(repo, user_id: str) -> None:
    if repo.get_role_name(user_id) != 'admin':
        raise PaymentMethodError('Only an admin can manage payment methods.', 403)


def payment_breakdown(transactions) -> List[dict]:
    """Completed sales grouped by payment method, for the X/Z readings: one row per method that
    was used (name, kind and the net sales paid that way). Uses the name/kind stamped on the
    tender when the sale was made."""
    rows = {}
    for t in transactions:
        tender = t.get('tender')
        if t.get('status') != 'completed' or not tender:
            continue
        code = tender.get('type') or 'cash'
        row = rows.setdefault(code, {
            'code': code,
            'name': tender.get('name') or code.replace('-', ' ').title(),
            'kind': tender_kind(tender),
            'amount': 0.0,
        })
        row['amount'] += t.get('totalNetSales') or 0
    return [{**r, 'amount': round(r['amount'], 2)} for r in rows.values()]
