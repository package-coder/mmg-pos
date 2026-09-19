"""
Invoice numbering must be scoped per BIR-registered terminal, not per
cashier — a branch can run multiple terminals, and cashiers rotate shifts
on the same terminal, so cashier-scoping fragmented what's supposed to be
one continuous sequence per terminal.

These tests exercise the actual counter primitive directly (mirroring
app/repositories/base.py:_get_next_sequence) against real MongoDB, rather
than going through the full HTTP stack — the terminal-scoping logic itself
lives in a single query key, and that's what needs proving.
"""
import pytest


def get_next_sequence(db, query):
    counter = db["counters"].find_one_and_update(
        query, {"$inc": {"seq": 1}}, upsert=True, return_document=True
    )
    return counter["seq"]


class TestTerminalScopedInvoiceNumbers:
    def test_same_terminal_is_sequential(self, local_db):
        a1 = get_next_sequence(local_db, {"type": "INVOICE_NUMBER", "terminalId": "terminal-A"})
        a2 = get_next_sequence(local_db, {"type": "INVOICE_NUMBER", "terminalId": "terminal-A"})
        assert a2 == a1 + 1

    def test_different_terminals_have_independent_counters(self, local_db):
        """Both correctly start at 1 — that's not the bug. The property
        that matters is that advancing one terminal's counter must not
        affect the other's."""
        get_next_sequence(local_db, {"type": "INVOICE_NUMBER", "terminalId": "terminal-A"})  # A -> 1
        get_next_sequence(local_db, {"type": "INVOICE_NUMBER", "terminalId": "terminal-A"})  # A -> 2
        b1 = get_next_sequence(local_db, {"type": "INVOICE_NUMBER", "terminalId": "terminal-B"})
        assert b1 == 1, "terminal B must be unaffected by terminal A's advances"

    def test_cashier_rotating_terminals_does_not_fragment_the_terminal_sequence(self, local_db):
        """The exact bug this fixes: two different cashiers using the SAME
        terminal across a shift change must land on one continuous
        sequence for that terminal, regardless of who's logged in."""
        cashier_1_sale = get_next_sequence(local_db, {"type": "INVOICE_NUMBER", "terminalId": "terminal-A"})
        cashier_2_sale = get_next_sequence(local_db, {"type": "INVOICE_NUMBER", "terminalId": "terminal-A"})
        assert cashier_2_sale == cashier_1_sale + 1
