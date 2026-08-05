/**
 * Module: Registration page
 *
 * Client-side password policy check, AuthApi.register, redirect to login with success flag on OK.
 */
/**
 * Module: Register
 *
 * Password policy client check, AuthApi.register, redirect to login.
 */
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthApi } from "../api/client";
import { passwordPolicyError } from "../lib/auth";

export default function RegisterPage() {
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  async function onSubmit(e) {
    e.preventDefault();
    setError("");
    const policyErr = passwordPolicyError(password);
    if (policyErr) {
      setError(policyErr);
      return;
    }
    if (password !== confirm) {
      setError("Passwords do not match.");
      return;
    }
    setLoading(true);
    try {
      await AuthApi.register({ full_name: fullName, email, password });
      navigate("/login?registered=1", { replace: true });
    } catch (err) {
      setError(err.message || "Registration failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <h2 className="title">Register</h2>
      {error && <div className="error">{error}</div>}
      <form className="form" onSubmit={onSubmit}>
        <input className="input" placeholder="Full name" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
        <input className="input" type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
        <input className="input" type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
        <input className="input" type="password" placeholder="Confirm password" value={confirm} onChange={(e) => setConfirm(e.target.value)} required />
        <small>Password policy: 8+ chars, uppercase, lowercase, number, special.</small>
        <button className="btn" disabled={loading}>{loading ? "Creating..." : "Create Account"}</button>
      </form>
      <p>Already registered? <Link to="/login">Login</Link></p>
    </div>
  );
}
