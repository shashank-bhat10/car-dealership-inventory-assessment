import React, { useState } from "react";
import { ArrowRight, CarFront } from "lucide-react";

const API_URL = import.meta.env.VITE_API_URL ?? "";

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("access_token") ?? "");
  const [isAdmin, setIsAdmin] = useState(localStorage.getItem("is_admin") === "true");
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function request(path, options) {
    const response = await fetch(`${API_URL}${path}`, options);
    const data = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(data.detail ?? "The request could not be completed.");
    return data;
  }

  async function submitAccount(event) {
    event.preventDefault();
    setBusy(true);
    setError("");
    try {
      if (mode === "register") {
        await request("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email, password }),
        });
      }
      const result = await request("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({ username: email, password }),
      });
      localStorage.setItem("access_token", result.access_token);
      localStorage.setItem("is_admin", String(Boolean(result.is_admin)));
      localStorage.setItem("account_email", email);
      setToken(result.access_token);
      setIsAdmin(Boolean(result.is_admin));
    } catch (requestError) {
      setError(requestError.message);
    } finally {
      setBusy(false);
    }
  }

  if (token) {
    return (
      <main className="app-shell">
        <header className="topbar">
          <a className="brand" href="#inventory" aria-label="Motorhaus home">
            <span className="brand-icon"><CarFront size={21} /></span>
            <span>MOTORHAUS<small>DRIVE YOUR WAY</small></span>
          </a>
          <div className="account-summary">
            {isAdmin && <span className="role-pill">Administrator</span>}
            <span>{localStorage.getItem("account_email")}</span>
            <button className="text-button" onClick={() => {
              localStorage.clear();
              setToken("");
              setIsAdmin(false);
            }}>Sign out</button>
          </div>
        </header>
        <section id="inventory" className="page-content">
          <span className="eyebrow">THE MOTORHAUS COLLECTION</span>
          <h1>Available vehicles</h1>
          <p>Your next drive starts here.</p>
        </section>
      </main>
    );
  }

  return (
    <main className="auth-layout">
      <section className="auth-panel" aria-labelledby="auth-title">
        <div className="brand-icon auth-brand"><CarFront size={24} /></div>
        <span className="eyebrow">MOTORHAUS / INVENTORY</span>
        <h1 id="auth-title">{mode === "login" ? "Find your next drive." : "Join the road ahead."}</h1>
        <p className="intro">A considered collection of vehicles, ready for wherever the road leads.</p>
        <form className="auth-form" onSubmit={submitAccount}>
          <label htmlFor="email">Email address</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
          />
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            autoComplete={mode === "login" ? "current-password" : "new-password"}
            minLength={mode === "register" ? 10 : undefined}
            maxLength={128}
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
          />
          {error && <p className="error-message" role="alert">{error}</p>}
          <button className="primary-button" type="submit" disabled={busy}>
            {busy ? "Please wait…" : mode === "login" ? "Sign in" : "Create account"}
            <ArrowRight size={17} aria-hidden="true" />
          </button>
        </form>
        <p className="mode-switch">
          {mode === "login" ? "New to Motorhaus?" : "Already have an account?"}
          <button
            className="text-button"
            type="button"
            onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
          >
            {mode === "login" ? "Create account" : "Sign in"}
          </button>
        </p>
      </section>
      <aside className="auth-visual" aria-label="Motorhaus vehicle collection">
        <div className="visual-sun" />
        <div className="visual-car"><CarFront size={230} strokeWidth={0.65} /></div>
        <div className="visual-caption">
          <span>CURATED FOR THE WAY YOU MOVE</span>
          <h2>Good things<br />are in motion.</h2>
          <p>Discover the drive that feels like you.</p>
        </div>
      </aside>
    </main>
  );
}
