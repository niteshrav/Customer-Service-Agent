"""
Validate dashboard: metrics accuracy, routes, and response content.
Run from repo root with Flask installed: python3 -m sdlc_with_llm.validate_dashboard
"""
import sys
import os

# Run from repository root
sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))


def validate_metrics():
    """Metric accuracy: values match synthetic data."""
    from sdlc_with_llm.app import _load_customers, _load_inquiries, _dashboard_metrics
    from sdlc_with_llm.sim.agent_sim import CRMService, InquiryStore

    customers = _load_customers()
    inquiries = _load_inquiries()
    crm = CRMService(customers)
    metrics = _dashboard_metrics(inquiries, crm)

    expected = {
        "total_inquiries": 3,
        "accessible_inquiries": 2,
        "issues_identified": 2,
        "issues_addressed": 0,
        "resolved_inquiries": 0,
        "crm_match_count": 2,
    }
    for k, v in expected.items():
        assert metrics[k] == v, f"{k}: got {metrics[k]}, expected {v}"
    print("Metric accuracy: OK")
    return True


def validate_routes():
    """Completeness: routes respond and return expected content."""
    from sdlc_with_llm.app import app

    with app.test_client() as c:
        r = c.get("/")
        assert r.status_code == 200, "GET /"
        assert b"Total inquiries" in r.data and b"3" in r.data
        assert b"INQ-2001" in r.data and b"Inquiry list" in r.data

        r2 = c.get("/inquiries/INQ-2001")
        assert r2.status_code == 200, "GET /inquiries/INQ-2001"
        assert b"INQ-2001" in r2.data and b"open" in r2.data

        r3 = c.get("/inquiries/INQ-NONE")
        assert r3.status_code == 404, "GET /inquiries/INQ-NONE 404"
    print("Routes and content: OK")
    return True


if __name__ == "__main__":
    ok = True
    try:
        validate_metrics()
    except Exception as e:
        print("Metric validation failed:", e)
        ok = False
    try:
        validate_routes()
    except Exception as e:
        print("Route validation failed:", e)
        ok = False
    sys.exit(0 if ok else 1)
