"""Software identification printed on BIR reports (the "Software Name and Version No. plus
Release No./Release Date" line of every annex template).

The release number and date are only known once the software is submitted to and approved by BIR.
Until APP_RELEASE_NO and APP_RELEASE_DATE are set in the environment, the line carries a clearly
marked TEMPORARY placeholder so nobody mistakes it for approved details."""
import os

NAME = os.getenv('APP_SOFTWARE_NAME', 'MMG POS')
VERSION = os.getenv('APP_VERSION', '0.1.0').lstrip('vV')
RELEASE_NO = os.getenv('APP_RELEASE_NO')
RELEASE_DATE = os.getenv('APP_RELEASE_DATE')


def software_line() -> str:
    approved = bool(RELEASE_NO and RELEASE_DATE)
    return (
        f'{NAME} v{VERSION} / Release No.: {RELEASE_NO or "TBD"} / Release Date: {RELEASE_DATE or "TBD"}'
        + ('' if approved else ' [TEMPORARY - FOR BIR APPROVAL]')
    )
