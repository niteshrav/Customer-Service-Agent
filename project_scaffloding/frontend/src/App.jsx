/**
 * Module: Application routes
 *
 * Public/auth pages load eagerly so navigation never blanks the shell; heavier pages stay lazy.
 */
import { lazy, Suspense } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import AppLayout from "./components/AppLayout";
import ProtectedRoute from "./components/ProtectedRoute";
import PublicOnlyRoute from "./components/PublicOnlyRoute";
import HomePage from "./pages/HomePage";
import LoginPage from "./pages/LoginPage";
import RegisterPage from "./pages/RegisterPage";

const DashboardPage = lazy(() => import("./pages/DashboardPage"));
const InquiryDetailPage = lazy(() => import("./pages/InquiryDetailPage"));
const TermsOfServicePage = lazy(() => import("./pages/TermsOfServicePage"));
const PrivacyPolicyPage = lazy(() => import("./pages/PrivacyPolicyPage"));
const CookiePolicyPage = lazy(() => import("./pages/CookiePolicyPage"));
const NotFoundPage = lazy(() => import("./pages/NotFoundPage"));

function RouteFallback() {
  return (
    <div className="page route-fallback" role="status" aria-live="polite">
      <div className="skeleton skeleton-block" style={{ height: 28, width: "40%", maxWidth: 280 }} />
      <div className="skeleton skeleton-block" style={{ height: 120, marginTop: 16 }} />
      <div className="skeleton skeleton-block" style={{ height: 220, marginTop: 16 }} />
    </div>
  );
}

function Lazy({ children }) {
  return <Suspense fallback={<RouteFallback />}>{children}</Suspense>;
}

export default function App() {
  return (
    <Routes>
      <Route element={<AppLayout />}>
        <Route path="/" element={<HomePage />} />

        <Route element={<PublicOnlyRoute />}>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
        </Route>

        <Route
          path="/terms"
          element={
            <Lazy>
              <TermsOfServicePage />
            </Lazy>
          }
        />
        <Route
          path="/privacy"
          element={
            <Lazy>
              <PrivacyPolicyPage />
            </Lazy>
          }
        />
        <Route
          path="/cookies"
          element={
            <Lazy>
              <CookiePolicyPage />
            </Lazy>
          }
        />

        <Route element={<ProtectedRoute />}>
          <Route
            path="/dashboard"
            element={
              <Lazy>
                <DashboardPage />
              </Lazy>
            }
          />
          <Route
            path="/inquiries/:inquiryId"
            element={
              <Lazy>
                <InquiryDetailPage />
              </Lazy>
            }
          />
        </Route>

        <Route path="/home" element={<Navigate to="/" replace />} />
        <Route
          path="*"
          element={
            <Lazy>
              <NotFoundPage />
            </Lazy>
          }
        />
      </Route>
    </Routes>
  );
}
