/**
 * Module: Guest-only guard
 *
 * Redirects authenticated users to /dashboard so login/register are not shown when already signed in.
 */
/**
 * Module: Public-only routes
 *
 * If already authed, redirect to /dashboard (login/register).
 */
import { Navigate, Outlet } from "react-router-dom";
import { isAuthed } from "../lib/auth";

export default function PublicOnlyRoute() {
  return isAuthed() ? <Navigate to="/dashboard" replace /> : <Outlet />;
}
