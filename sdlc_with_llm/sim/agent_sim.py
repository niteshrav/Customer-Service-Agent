"""
Customer service agent simulation for inquiry handling and CRM context.
Implements user stories US-1 (handle inquiries), US-2 (retrieve CRM), US-3 (use CRM while responding), US-4 (issue resolution).
"""
from __future__ import annotations

from dataclasses import dataclass, field
from typing import Dict, List, Optional


class InquiryError(Exception):
    """Raised when inquiry handling rules are violated."""
    pass


class CRMError(Exception):
    """Raised when CRM retrieval fails."""
    pass


@dataclass(frozen=True)
class Customer:
    """CRM customer/account record used as context for inquiry handling."""
    customer_id: str
    name: str
    email: str
    account_status: str


@dataclass
class Inquiry:
    """A customer inquiry with status, messages, and resolution flags."""
    inquiry_id: str
    received: bool
    accessible: bool
    customer_id: str
    issue_identified: bool
    issue_addressed: bool
    status: str = "open"  # open | resolved
    messages: List[str] = field(default_factory=list)


class CRMService:
    """
    Minimal CRM interface used only for:
    - retrieving customer/account info needed to address an inquiry
    """

    def __init__(self, customers: Dict[str, Customer], *, mode: str = "ok") -> None:
        self._customers = customers
        self._mode = mode  # ok | not_found | fail

    def set_mode(self, mode: str) -> None:
        """Switch CRM behavior for testing scenarios."""
        self._mode = mode

    def get_customer(self, customer_id: str) -> Optional[Customer]:
        """Return customer context, None for not found, or raise on CRM failure."""
        if self._mode == "fail":
            raise CRMError("CRM retrieval failed")
        if self._mode == "not_found":
            return None
        return self._customers.get(customer_id)


class InquiryStore:
    """Store of inquiries keyed by inquiry_id; used to open and update inquiries."""

    def __init__(self, inquiries: Dict[str, Inquiry]) -> None:
        self._inquiries = inquiries

    def get(self, inquiry_id: str) -> Inquiry:
        """Fetch an inquiry by ID, raising if it does not exist."""
        if inquiry_id not in self._inquiries:
            raise InquiryError("Inquiry not found")
        return self._inquiries[inquiry_id]


@dataclass
class InquirySession:
    """
    Represents an inquiry handling session.
    CRM info (when retrieved) is cached only within this session.
    """

    store: InquiryStore
    crm: CRMService
    _open_inquiry_id: Optional[str] = None
    _crm_cache_by_inquiry_id: Dict[str, Optional[Customer]] = field(default_factory=dict)

    def open_inquiry(self, inquiry_id: str) -> Inquiry:
        """Open an inquiry for the current session if it is received and accessible."""
        inquiry = self.store.get(inquiry_id)
        if not inquiry.received:
            raise InquiryError("Inquiry not received")
        if not inquiry.accessible:
            raise InquiryError("Inquiry not accessible/openable")
        self._open_inquiry_id = inquiry_id
        return inquiry

    def _require_open_inquiry(self) -> Inquiry:
        """Return the currently open inquiry, or fail if no inquiry is open."""
        if self._open_inquiry_id is None:
            raise InquiryError("No inquiry is open")
        return self.store.get(self._open_inquiry_id)

    def send_response(self, response_text: str) -> None:
        """Append a non-empty response to the open inquiry message log."""
        inquiry = self._require_open_inquiry()
        if response_text.strip() == "":
            raise InquiryError("Empty response is not allowed")
        inquiry.messages.append(response_text)

    def request_crm_info(self) -> Optional[Customer]:
        """
        Retrieve CRM context for the open inquiry.
        Cache it for this session and inquiry only.
        """
        inquiry = self._require_open_inquiry()
        customer = self.crm.get_customer(inquiry.customer_id)
        self._crm_cache_by_inquiry_id[inquiry.inquiry_id] = customer
        return customer

    def view_crm_info(self) -> Optional[Customer]:
        """View CRM context previously retrieved in this session for the open inquiry."""
        inquiry = self._require_open_inquiry()
        return self._crm_cache_by_inquiry_id.get(inquiry.inquiry_id)

    def conclude_interaction(self) -> None:
        """Mark inquiry as resolved only when the issue has been addressed."""
        inquiry = self._require_open_inquiry()
        if not inquiry.issue_addressed:
            raise InquiryError("Cannot close as resolved when issue is not addressed")
        inquiry.status = "resolved"
