// src/pages/LoginPage.tsx
import { useState } from "react";
import { setToken, consumeAuthFlash } from "../auth/session";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";

type Props = {
  onLoggedIn?: () => void;
};

export default function LoginPage({ onLoggedIn }: Props) {
  const [mode, setMode] = useState<"login" | "register">("login");

  // login state
  const [email, setEmail] = useState("manager@demofc.com");
  const [password, setPassword] = useState("manager123");
  const [error, setError] = useState<string | null>(consumeAuthFlash());
  const [loading, setLoading] = useState(false);

  // register state
  const [teamName, setTeamName] = useState("");
  const [regEmail, setRegEmail] = useState("");
  const [regPassword, setRegPassword] = useState("");
  const [regError, setRegError] = useState<string | null>(null);
  const [regSuccess, setRegSuccess] = useState<string | null>(null);
  const [regLoading, setRegLoading] = useState(false);

  async function onLogin(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch(`${BASE_URL}/api/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ email, password }),
      });

      if (!res.ok) {
        setError(await res.text());
        return;
      }

      const data: { token: string; role: string } = await res.json();
      setToken(data.token, data.role);
      onLoggedIn?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  async function onRegister(e: React.FormEvent) {
    e.preventDefault();
    setRegError(null);
    setRegSuccess(null);
    setRegLoading(true);

    try {
      const res = await fetch(`${BASE_URL}/api/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ teamName, email: regEmail, password: regPassword }),
      });

      if (!res.ok) {
        setRegError(await res.text());
        return;
      }

      setRegSuccess("Team registered! You can now sign in.");
      setTeamName("");
      setRegEmail("");
      setRegPassword("");
      setTimeout(() => setMode("login"), 2000);
    } catch (e) {
      setRegError(e instanceof Error ? e.message : "Registration failed");
    } finally {
      setRegLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: "80px auto", width: "100%" }}>
      {mode === "login" ? (
        <>
          <h2>Sign in</h2>
          <form onSubmit={onLogin}>
            <div style={{ marginBottom: 12 }}>
              <label>Email</label>
              <input
                style={{ width: "100%", padding: 10 }}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="username"
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label>Password</label>
              <input
                type="password"
                style={{ width: "100%", padding: 10 }}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
              />
            </div>

            {error && (
              <div style={{ color: "crimson", marginBottom: 12 }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              style={{ width: "100%", padding: 10 }}
              disabled={loading}
            >
              {loading ? "Logging in..." : "Login"}
            </button>
          </form>

          <p style={{ textAlign: "center", marginTop: 16 }}>
            New team?{" "}
            <button
              onClick={() => { setMode("register"); setError(null); }}
              style={{ background: "none", border: "none", color: "#2D6A4F", cursor: "pointer", textDecoration: "underline", padding: 0 }}
            >
              Register here
            </button>
          </p>
        </>
      ) : (
        <>
          <h2>Register your team</h2>
          <form onSubmit={onRegister}>
            <div style={{ marginBottom: 12 }}>
              <label>Team name</label>
              <input
                style={{ width: "100%", padding: 10 }}
                value={teamName}
                onChange={(e) => setTeamName(e.target.value)}
                placeholder="e.g. Sunday Rovers FC"
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label>Email</label>
              <input
                style={{ width: "100%", padding: 10 }}
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                autoComplete="username"
              />
            </div>

            <div style={{ marginBottom: 12 }}>
              <label>Password (min 8 characters)</label>
              <input
                type="password"
                style={{ width: "100%", padding: 10 }}
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                autoComplete="new-password"
              />
            </div>

            {regError && (
              <div style={{ color: "crimson", marginBottom: 12 }}>
                {regError}
              </div>
            )}

            {regSuccess && (
              <div style={{ color: "green", marginBottom: 12 }}>
                {regSuccess}
              </div>
            )}

            <button
              type="submit"
              style={{ width: "100%", padding: 10 }}
              disabled={regLoading}
            >
              {regLoading ? "Registering..." : "Register Team"}
            </button>
          </form>

          <p style={{ textAlign: "center", marginTop: 16 }}>
            Already have an account?{" "}
            <button
              onClick={() => { setMode("login"); setRegError(null); setRegSuccess(null); }}
              style={{ background: "none", border: "none", color: "#2D6A4F", cursor: "pointer", textDecoration: "underline", padding: 0 }}
            >
              Sign in
            </button>
          </p>
        </>
      )}
    </div>
  );
}