import { useEffect, useMemo, useState } from "react";
import "./App.css";

import { Header } from "./components/Header";
import { Nav } from "./components/Nav";

import { NoticesPage } from "./pages/NoticesPage";
import { PlayersPage } from "./pages/PlayersPage";
import { MatchesPage } from "./pages/MatchesPage";
import { FormationsPage } from "./pages/FormationsPage";
import { AnalyticsPage } from "./pages/AnalyticsPage";

import LoginPage from "./pages/LoginPage";

import { getToken, getRole, clearSession, scheduleAutoLogout, consumeAuthFlash } from "./auth/session";

type NavKey = "notices" | "players" | "matches" | "formations" | "analytics";

export default function App() {
  const [active, setActive] = useState<NavKey>("notices");
  const [token, setTokenState] = useState<string | null>(getToken());
  const [flash, setFlash] = useState<string | null>(consumeAuthFlash());

  // On mount: if token exists, schedule auto logout
  useEffect(() => {
    const t = getToken();
    if (t) {
      scheduleAutoLogout(t);
      setTokenState(t);
    }
    // consume any flash on load
    setFlash(consumeAuthFlash());
  }, []);

  // Keep state in sync if token/role changes in another tab
  useEffect(() => {
    const onStorage = () => {
      setTokenState(getToken());
      setFlash(consumeAuthFlash());
    };
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  const roleLabel = useMemo(() => {
    const r = getRole();
    return r ? r.toUpperCase() : null;
  }, [token]);

  const subtitle = useMemo(() => {
    return roleLabel ? `Sunday League Team Manager • ${roleLabel}` : "Sunday League Team Manager";
  }, [roleLabel]);

  function handleLogout() {
    clearSession();
    setTokenState(null);
    setFlash("You’ve been logged out.");
  }

  function handleLoggedIn() {
    const t = getToken();
    if (t) {
      scheduleAutoLogout(t);
      setTokenState(t);
    }
    // clear any old flash
    setFlash(null);
  }

  // Not logged in → show login screen only
  if (!token) {
    return (
      <div className="app">
        <Header title="Local XI" subtitle={subtitle} />
        <main className="app-main">
          {flash ? (
            <div className="card" style={{ maxWidth: 420, margin: "16px auto", padding: 12 }}>
              {flash}
            </div>
          ) : null}

          <LoginPage onLoggedIn={handleLoggedIn} />
        </main>
      </div>
    );
  }

  // Logged in → show full app
  return (
    <div className="app">
      <Header title="Local XI" subtitle={subtitle} />
      <Nav active={active} onChange={setActive} />

      <main className="app-main">
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
          <button onClick={handleLogout}>Logout</button>
        </div>

        {active === "notices" && <NoticesPage />}
        {active === "players" && <PlayersPage />}
        {active === "matches" && <MatchesPage />}
        {active === "formations" && <FormationsPage />}
        {active === "analytics" && <AnalyticsPage />}
      </main>
    </div>
  );
}



