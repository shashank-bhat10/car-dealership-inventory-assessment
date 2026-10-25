import React from "react";
import PropTypes from "prop-types";
import { ArrowRight, CarFront } from "lucide-react";

export default function AuthScreen({ mode, email, password, busy, error, onSubmit, onChangeMode, onEmailChange, onPasswordChange }) {
  const registering = mode === "register";

  return (
    <main className="auth-layout min-h-screen grid grid-cols-1 lg:grid-cols-2">
      <section className="auth-panel" aria-labelledby="auth-title">
        <div className="brand-icon auth-brand"><CarFront size={24} /></div>
        <span className="eyebrow">MOTORHAUS / INVENTORY</span>
        <h1 id="auth-title">{registering ? "Join the road ahead." : "Find your next drive."}</h1>
        <p className="intro">A considered collection of vehicles, ready for wherever the road leads.</p>
        <form className="auth-form grid gap-[10px] mt-8" onSubmit={onSubmit}>
          <label htmlFor="email">Email address</label>
          <input id="email" type="email" autoComplete="email" required value={email} onChange={(event) => onEmailChange(event.target.value)} />
          <label htmlFor="password">Password</label>
          <input id="password" type="password" autoComplete={registering ? "new-password" : "current-password"} minLength={registering ? 10 : undefined} maxLength={128} required value={password} onChange={(event) => onPasswordChange(event.target.value)} />
          {error && <p className="error-message" role="alert">{error}</p>}
          <button className="primary-button flex items-center justify-between rounded-sm transition-colors duration-150" type="submit" disabled={busy}>
            {busy ? "Please wait…" : registering ? "Create account" : "Sign in"}
            <ArrowRight size={17} aria-hidden="true" />
          </button>
        </form>
        <p className="mode-switch">
          {registering ? "Already have an account?" : "New to Motorhaus?"}
          <button className="text-button" type="button" onClick={onChangeMode}>{registering ? "Sign in" : "Create account"}</button>
        </p>
      </section>
      <aside className="auth-visual" aria-label="Motorhaus vehicle collection">
        <div className="visual-sun" />
        <div className="visual-car"><CarFront size={230} strokeWidth={0.65} /></div>
        <div className="visual-caption"><span>CURATED FOR THE WAY YOU MOVE</span><h2>Good things<br />are in motion.</h2><p>Discover the drive that feels like you.</p></div>
      </aside>
    </main>
  );
}

AuthScreen.propTypes = {
  mode: PropTypes.string.isRequired,
  email: PropTypes.string.isRequired,
  password: PropTypes.string.isRequired,
  busy: PropTypes.bool.isRequired,
  error: PropTypes.string.isRequired,
  onSubmit: PropTypes.func.isRequired,
  onChangeMode: PropTypes.func.isRequired,
  onEmailChange: PropTypes.func.isRequired,
  onPasswordChange: PropTypes.func.isRequired,
};
