/**
 * Module: 404 page
 */
import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="card empty-page">
      <p className="empty-code" aria-hidden="true">
        404
      </p>
      <h2 className="title">Page not found</h2>
      <p className="muted-line">The page you requested does not exist or may have moved.</p>
      <div className="row" style={{ marginTop: 16 }}>
        <Link className="btn" to="/">
          Go Home
        </Link>
        <Link className="btn secondary" to="/dashboard">
          Dashboard
        </Link>
      </div>
    </div>
  );
}
