/**
 * Module: 404 page
 *
 * Shown for unknown routes under AppLayout.
 */
/**
 * Module: 404
 */
import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <div className="card">
      <h2 className="title">Page not found</h2>
      <p>The page you requested does not exist.</p>
      <Link to="/">Go Home</Link>
    </div>
  );
}
