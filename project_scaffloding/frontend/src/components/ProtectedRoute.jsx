/**
 * Module: Auth guard (requires login)
 *
 * Renders nested routes when isAuthed(); otherwise redirects to /login.
 */
/**
 * Module: Protected routes
 *
 * Requires login; else redirect to /login.
 */
import { Navigate, Outlet } from "react-router-dom";
import { isAuthed } from "../lib/auth";

export default function ProtectedRoute() {
  return isAuthed() ? <Outlet /> : <Navigate to="/login" replace />;
}
