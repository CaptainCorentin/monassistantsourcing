"use client";

import { useState } from "react";

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [pending, setPending] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setPending(true);
    setError("");
    try {
      const res = await fetch("/api/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password })
      });
      if (res.ok) { window.location.href = "/"; return; }
      const data = await res.json().catch(() => ({}));
      setError(data.error || "Connexion impossible.");
    } catch {
      setError("Serveur injoignable. Vérifie ta connexion.");
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="login">
      <form onSubmit={onSubmit} className="panel">
        <h1>Vivier Boond</h1>
        <div className="field">
          <label htmlFor="password">Mot de passe</label>
          <input id="password" type="password" autoComplete="current-password" value={password}
            onChange={e => setPassword(e.target.value)} required autoFocus />
        </div>
        {error && <p className="error" role="alert">{error}</p>}
        <button className="btn primary" type="submit" disabled={pending}>{pending ? "Connexion…" : "Se connecter"}</button>
      </form>
    </main>
  );
}
