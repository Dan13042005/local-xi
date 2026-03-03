// src/pages/LoginPage.tsx
import { useState } from "react";
import { setToken, consumeAuthFlash } from "../auth/session";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8080";

type Props = {
  onLoggedIn?: () => void;
};

export default function LoginPage({ onLoggedIn }: Props) {
  const [email, setEmail] = useState("manager@demofc.com");
  const [password, setPassword] = useState("manager123");
  const [error, setError] = useState<string | null>(consumeAuthFlash());
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
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

      // ✅ Store token + role together (cleaner)
      setToken(data.token, data.role);

      onLoggedIn?.();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ maxWidth: 420, margin: "24px auto" }}>
      <h2>Sign in</h2>

      <form onSubmit={onSubmit}>
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
    </div>
  );
}