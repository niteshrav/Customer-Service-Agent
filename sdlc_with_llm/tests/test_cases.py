"""
Test cases for sdlc_with_llm customer service agent.
Maps to user stories US-1 through US-4 and test cases TC-1.1 through TC-4.3.
"""
import json
import os
import unittest

from sdlc_with_llm.sim.agent_sim import (
    CRMService,
    Customer,
    Inquiry,
    InquiryError,
    InquirySession,
    InquiryStore,
)


def _repo_root() -> str:
    return os.path.abspath(os.path.join(os.path.dirname(__file__), "..", ".."))


def _load_json(relative_path: str):
    path = os.path.join(_repo_root(), relative_path)
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def _build_fixture(mode: str = "ok"):
    crm_rows = _load_json("sdlc_with_llm/synthetic_data/crm_customers.json")
    inquiry_rows = _load_json("sdlc_with_llm/synthetic_data/inquiries.json")

    customers = {
        r["customer_id"]: Customer(
            customer_id=r["customer_id"],
            name=r["name"],
            email=r["email"],
            account_status=r["account_status"],
        )
        for r in crm_rows
    }

    inquiries = {
        r["inquiry_id"]: Inquiry(
            inquiry_id=r["inquiry_id"],
            received=r["received"],
            accessible=r["accessible"],
            customer_id=r["customer_id"],
            issue_identified=r["issue_identified"],
            issue_addressed=r["issue_addressed"],
            status=r.get("status", "open"),
            messages=list(r.get("messages", [])),
        )
        for r in inquiry_rows
    }

    store = InquiryStore(inquiries)
    crm = CRMService(customers, mode=mode)
    return store, crm


class TestCasesMappedToUserStories(unittest.TestCase):
    # US-1: Handle customer inquiries

    def test_tc_1_1_respond_to_received_inquiry_success(self):
        store, crm = _build_fixture()
        session = InquirySession(store=store, crm=crm)

        inquiry = session.open_inquiry("INQ-2001")
        session.send_response("Hello, I can help with that.")

        self.assertEqual(inquiry.messages[-1], "Hello, I can help with that.")

    def test_tc_1_2_attempt_send_empty_response_failure(self):
        store, crm = _build_fixture()
        session = InquirySession(store=store, crm=crm)

        inquiry = session.open_inquiry("INQ-2001")
        before = len(inquiry.messages)

        with self.assertRaises(InquiryError):
            session.send_response("   ")

        self.assertEqual(len(inquiry.messages), before)

    def test_tc_1_3_attempt_respond_when_inquiry_cannot_be_opened(self):
        store, crm = _build_fixture()
        session = InquirySession(store=store, crm=crm)

        with self.assertRaises(InquiryError):
            session.open_inquiry("INQ-2003")

        with self.assertRaises(InquiryError):
            session.send_response("Trying anyway")

    # US-2: Retrieve CRM context needed for handling

    def test_tc_2_1_retrieve_crm_info_success(self):
        store, crm = _build_fixture()
        session = InquirySession(store=store, crm=crm)

        session.open_inquiry("INQ-2001")
        customer = session.request_crm_info()

        self.assertIsNotNone(customer)
        self.assertEqual(customer.customer_id, "CUST-1001")
        self.assertEqual(session.view_crm_info().customer_id, "CUST-1001")

    def test_tc_2_2_crm_returns_no_matching_data(self):
        store, crm = _build_fixture(mode="ok")
        session = InquirySession(store=store, crm=crm)

        session.open_inquiry("INQ-2002")  # customer_id intentionally not in CRM dataset
        customer = session.request_crm_info()

        self.assertIsNone(customer)
        self.assertIsNone(session.view_crm_info())

    def test_tc_2_3_crm_access_fails_during_retrieval(self):
        store, crm = _build_fixture()
        crm.set_mode("fail")
        session = InquirySession(store=store, crm=crm)

        session.open_inquiry("INQ-2001")
        with self.assertRaises(Exception):
            session.request_crm_info()

        self.assertIsNone(session.view_crm_info())

    def test_tc_2_4_crm_info_remains_available_within_same_session(self):
        store, crm = _build_fixture()
        session = InquirySession(store=store, crm=crm)

        session.open_inquiry("INQ-2001")
        session.request_crm_info()

        # "Navigate away and back" is represented by calling view multiple times in-session.
        self.assertIsNotNone(session.view_crm_info())
        self.assertIsNotNone(session.view_crm_info())

    def test_tc_2_5_crm_info_not_assumed_available_across_sessions(self):
        store, crm = _build_fixture()

        session1 = InquirySession(store=store, crm=crm)
        session1.open_inquiry("INQ-2001")
        self.assertIsNotNone(session1.request_crm_info())
        self.assertIsNotNone(session1.view_crm_info())

        # New session; cache should be empty unless retrieved again.
        session2 = InquirySession(store=store, crm=crm)
        session2.open_inquiry("INQ-2001")
        self.assertIsNone(session2.view_crm_info())

    # US-3: Use CRM context while responding

    def test_tc_3_1_send_response_with_crm_context_available(self):
        store, crm = _build_fixture()
        session = InquirySession(store=store, crm=crm)

        inquiry = session.open_inquiry("INQ-2001")
        session.request_crm_info()
        self.assertIsNotNone(session.view_crm_info())

        session.send_response("Thanks, I see your account is active.")
        self.assertIn("account", inquiry.messages[-1].lower())

    def test_tc_3_2_send_response_when_crm_context_not_available(self):
        store, crm = _build_fixture()
        session = InquirySession(store=store, crm=crm)

        inquiry = session.open_inquiry("INQ-2001")
        self.assertIsNone(session.view_crm_info())

        session.send_response("I can help with your inquiry.")
        self.assertEqual(inquiry.messages[-1], "I can help with your inquiry.")
        self.assertIsNone(session.view_crm_info())

    def test_tc_3_3_retrieve_crm_info_again_during_handling(self):
        store, crm = _build_fixture()
        session = InquirySession(store=store, crm=crm)

        session.open_inquiry("INQ-2001")
        first = session.request_crm_info()
        second = session.request_crm_info()

        self.assertEqual(first.customer_id, second.customer_id)
        self.assertEqual(session.view_crm_info().customer_id, "CUST-1001")

    # US-4: Support issue resolution

    def test_tc_4_1_progress_toward_resolution_using_inquiry_and_crm_context(self):
        store, crm = _build_fixture()
        session = InquirySession(store=store, crm=crm)

        inquiry = session.open_inquiry("INQ-2001")
        self.assertTrue(inquiry.issue_identified)

        # Using inquiry details + optional CRM context
        session.request_crm_info()
        session.send_response("I’m working on resolving your issue now.")
        self.assertGreaterEqual(len(inquiry.messages), 1)

    def test_tc_4_2_mark_resolved_closed_when_issue_addressed(self):
        store, crm = _build_fixture()
        session = InquirySession(store=store, crm=crm)

        inquiry = session.open_inquiry("INQ-2001")
        inquiry.issue_addressed = True

        session.conclude_interaction()
        self.assertEqual(inquiry.status, "resolved")

    def test_tc_4_3_attempt_close_as_resolved_when_issue_not_addressed(self):
        store, crm = _build_fixture()
        session = InquirySession(store=store, crm=crm)

        inquiry = session.open_inquiry("INQ-2001")
        inquiry.issue_addressed = False

        with self.assertRaises(InquiryError):
            session.conclude_interaction()

        self.assertEqual(inquiry.status, "open")


if __name__ == "__main__":
    unittest.main()

