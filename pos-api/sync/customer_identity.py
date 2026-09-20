"""
Who is "the same customer"?

One rule, shared by the API (stops duplicates being created) and the sync service
(merges duplicates created at different branches). No third-party or app imports:
it ships in the `sync` container image and is also imported by pos-api.

Rule
----
1. If an ID number is present (`customer_type_id`: senior/PWD/solo-parent card),
   the ID identifies the person, whatever the name says.
2. Otherwise the person is identified by first name + middle name + last name +
   birth date. All four are compared after normalising (case, spacing,
   punctuation, accents ignored; birth date reduced to YYYY-MM-DD). A missing
   middle name only matches another missing middle name.
3. If neither rule can be applied (no ID, and no first name, last name or birth
   date) the customer has no identity key and is never treated as a duplicate.
"""
import re
import unicodedata


def _norm_text(value):
    if value is None:
        return ''
    text = unicodedata.normalize('NFKD', str(value))
    text = ''.join(ch for ch in text if not unicodedata.combining(ch))
    return re.sub(r'[^a-z0-9]+', ' ', text.lower()).strip()


def _norm_id(value):
    return re.sub(r'[^a-z0-9]', '', str(value or '').lower())


def _norm_date(value):
    if value is None:
        return ''
    text = str(value).strip()
    match = re.match(r'^(\d{4})-(\d{1,2})-(\d{1,2})', text)   # 2001-02-03 or 2001-02-03T00:00:00Z
    if match:
        return f'{int(match.group(1)):04d}-{int(match.group(2)):02d}-{int(match.group(3)):02d}'
    match = re.match(r'^(\d{1,2})/(\d{1,2})/(\d{4})$', text)  # month/day/year
    if match:
        return f'{int(match.group(3)):04d}-{int(match.group(1)):02d}-{int(match.group(2)):02d}'
    return _norm_text(text)


def identity_key_from_fields(first_name=None, middle_name=None, last_name=None, birth_date=None, id_number=None):
    """Returns the identity key string, or None when the customer cannot be identified."""
    id_part = _norm_id(id_number)
    if id_part:
        return f'id:{id_part}'
    first, last, birth = _norm_text(first_name), _norm_text(last_name), _norm_date(birth_date)
    if not (first and last and birth):
        return None
    return f'name:{first}|{_norm_text(middle_name)}|{last}|{birth}'


def identity_key(customer_doc):
    """Identity key of a stored customer document (snake_case fields as saved by /customer/create)."""
    return identity_key_from_fields(
        customer_doc.get('first_name'),
        customer_doc.get('middle_name'),
        customer_doc.get('last_name'),
        customer_doc.get('birthDate'),
        customer_doc.get('customer_type_id'),
    )
