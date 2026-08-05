"""
Module: SDLC-with-LLM demo Flask app

Read-only dashboard over synthetic JSON + in-memory inquiry store: list inquiries/metrics,
detail page per id. Not the main Customer Service Agent stack; used for SDLC/LLM exercise data.
Routes: / (table), /inquiries/<inquiry_id> (detail).
"""

import json
import os
from typing import Dict

from flask import Flask, abort, render_template_string

from sdlc_with_llm.sim.agent_sim import CRMService, Customer, Inquiry, InquiryStore

app = Flask(__name__)


def _repo_root() -> str:
    return os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))


def _load_json(relative_path: str):
    path = os.path.join(_repo_root(), relative_path)
    with open(path, "r", encoding="utf-8") as f:
        return json.load(f)


def _load_customers() -> Dict[str, Customer]:
    crm_rows = _load_json("sdlc_with_llm/synthetic_data/crm_customers.json")
    return {
        r["customer_id"]: Customer(
            customer_id=r["customer_id"],
            name=r["name"],
            email=r["email"],
            account_status=r["account_status"],
        )
        for r in crm_rows
    }


def _load_inquiries() -> Dict[str, Inquiry]:
    inquiry_rows = _load_json("sdlc_with_llm/synthetic_data/inquiries.json")
    return {
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


def _dashboard_metrics(inquiries: Dict[str, Inquiry], crm: CRMService) -> Dict[str, int]:
    total = len(inquiries)
    accessible = sum(1 for i in inquiries.values() if i.accessible)
    identified = sum(1 for i in inquiries.values() if i.issue_identified)
    addressed = sum(1 for i in inquiries.values() if i.issue_addressed)
    resolved = sum(1 for i in inquiries.values() if i.status == "resolved")

    crm_available = 0
    for inquiry in inquiries.values():
        if crm.get_customer(inquiry.customer_id) is not None:
            crm_available += 1

    return {
        "total_inquiries": total,
        "accessible_inquiries": accessible,
        "issues_identified": identified,
        "issues_addressed": addressed,
        "resolved_inquiries": resolved,
        "crm_match_count": crm_available,
    }


@app.get("/")
def dashboard():
    customers = _load_customers()
    inquiries = _load_inquiries()
    store = InquiryStore(inquiries)
    crm = CRMService(customers)
    metrics = _dashboard_metrics(inquiries, crm)

    rows = []
    for inquiry_id, inquiry in store._inquiries.items():
        customer = crm.get_customer(inquiry.customer_id)
        rows.append(
            {
                "inquiry_id": inquiry_id,
                "status": inquiry.status,
                "accessible": inquiry.accessible,
                "issue_identified": inquiry.issue_identified,
                "issue_addressed": inquiry.issue_addressed,
                "customer_id": inquiry.customer_id,
                "customer_name": customer.name if customer else "Not found in CRM",
            }
        )

    return render_template_string(
        """
<!doctype html>
<html>
<head>
  <title>Customer Service Agent Dashboard</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 24px; color: #1f2937; }
    h1 { margin-bottom: 8px; }
    .grid { display: grid; grid-template-columns: repeat(3, minmax(220px, 1fr)); gap: 12px; margin: 16px 0 24px; }
    .card { border: 1px solid #d1d5db; border-radius: 8px; padding: 12px; background: #f9fafb; }
    .label { font-size: 13px; color: #6b7280; }
    .value { font-size: 24px; font-weight: bold; margin-top: 6px; }
    table { border-collapse: collapse; width: 100%; }
    th, td { border: 1px solid #d1d5db; padding: 8px; text-align: left; }
    th { background: #f3f4f6; }
    a { color: #2563eb; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <h1>Customer Service Agent Dashboard</h1>
  <p>Project results from generated simulation data and CRM context.</p>

  <div class="grid">
    <div class="card"><div class="label">Total inquiries</div><div class="value">{{ metrics.total_inquiries }}</div></div>
    <div class="card"><div class="label">Accessible inquiries</div><div class="value">{{ metrics.accessible_inquiries }}</div></div>
    <div class="card"><div class="label">Issues identified</div><div class="value">{{ metrics.issues_identified }}</div></div>
    <div class="card"><div class="label">Issues addressed</div><div class="value">{{ metrics.issues_addressed }}</div></div>
    <div class="card"><div class="label">Resolved inquiries</div><div class="value">{{ metrics.resolved_inquiries }}</div></div>
    <div class="card"><div class="label">CRM matches</div><div class="value">{{ metrics.crm_match_count }}</div></div>
  </div>

  <h2>Inquiry list</h2>
  <table>
    <thead>
      <tr>
        <th>Inquiry</th><th>Status</th><th>Accessible</th><th>Identified</th><th>Addressed</th><th>Customer</th>
      </tr>
    </thead>
    <tbody>
      {% for row in rows %}
      <tr>
        <td><a href="/inquiries/{{ row.inquiry_id }}">{{ row.inquiry_id }}</a></td>
        <td>{{ row.status }}</td>
        <td>{{ row.accessible }}</td>
        <td>{{ row.issue_identified }}</td>
        <td>{{ row.issue_addressed }}</td>
        <td>{{ row.customer_id }} ({{ row.customer_name }})</td>
      </tr>
      {% endfor %}
    </tbody>
  </table>
</body>
</html>
""",
        metrics=metrics,
        rows=rows,
    )


@app.get("/inquiries/<inquiry_id>")
def inquiry_detail(inquiry_id: str):
    customers = _load_customers()
    inquiries = _load_inquiries()
    if inquiry_id not in inquiries:
        abort(404)

    inquiry = inquiries[inquiry_id]
    crm = CRMService(customers)
    customer = crm.get_customer(inquiry.customer_id)

    return render_template_string(
        """
<!doctype html>
<html>
<head>
  <title>{{ inquiry.inquiry_id }} - Inquiry Details</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 24px; color: #1f2937; }
    .card { border: 1px solid #d1d5db; border-radius: 8px; padding: 12px; background: #f9fafb; max-width: 680px; }
    .row { margin: 8px 0; }
    a { color: #2563eb; text-decoration: none; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <h1>Inquiry {{ inquiry.inquiry_id }}</h1>
  <p><a href="/">Back to dashboard</a></p>
  <div class="card">
    <div class="row"><strong>Status:</strong> {{ inquiry.status }}</div>
    <div class="row"><strong>Received:</strong> {{ inquiry.received }}</div>
    <div class="row"><strong>Accessible:</strong> {{ inquiry.accessible }}</div>
    <div class="row"><strong>Issue identified:</strong> {{ inquiry.issue_identified }}</div>
    <div class="row"><strong>Issue addressed:</strong> {{ inquiry.issue_addressed }}</div>
    <div class="row"><strong>Message count:</strong> {{ inquiry.messages|length }}</div>
    <div class="row"><strong>CRM customer ID:</strong> {{ inquiry.customer_id }}</div>
    <div class="row"><strong>CRM customer:</strong> {{ customer.name if customer else "Not found in CRM" }}</div>
  </div>
</body>
</html>
""",
        inquiry=inquiry,
        customer=customer,
    )


if __name__ == "__main__":
    app.run(debug=True)

