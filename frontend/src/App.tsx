import { useEffect, useMemo, useState } from "react";

import { Header } from "./components/Header";
import { Nav } from "./components/Nav";

import { NoticesPage } from "./pages/NoticesPage";
import { PlayersPage } from "./pages/PlayersPage";
import { MatchesPage } from "./pages/MatchesPage";
import { FormationsPage } from "./pages/FormationsPage";
import { AnalyticsPage } from "./pages/AnalyticsPage";

import LoginPage from "./pages/LoginPage";

import {
  getToken,
  getRole,
  clearSession,
  scheduleAutoLogout,
  consumeAuthFlash,
} from "./auth/session";

type NavKey = "notices" | "players" | "matches" | "formations" | "analytics";

export default function App() {
  const [active, setActive] = useState<NavKey>("notices");
  const [token, setTokenState] = useState<string | null>(getToken());
  const [flash, setFlash] = useState<string | null>(consumeAuthFlash());

  useEffect(() => {
    const t = getToken();
    if (t) {
      scheduleAutoLogout(t);
      setTokenState(t);
    }
    setFlash(consumeAuthFlash());
  }, []);

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
    return roleLabel
      ? `Sunday League Team Manager • ${roleLabel}`
      : "Sunday League Team Manager";
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
    setFlash(null);
  }

  if (!token) {
    return (
      <div className="app">
        <div className="shell card">
          <Header title="Local XI" subtitle={subtitle} />

          <main className="app-main">
            {flash ? (
              <div className="card flash" style={{ maxWidth: 460, margin: "16px auto" }}>
                {flash}
              </div>
            ) : null}

            <div className="card authCard" style={{ width: "100%", maxWidth: "100%", display: "flex", justifyContent: "center" }}>
              <LoginPage onLoggedIn={handleLoggedIn} />
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="shell card">
        <Header title="Local XI" subtitle={subtitle} />
        <Nav active={active} onChange={setActive} />

        <main className="app-main">
          <div className="topbar">
            <div className="topbarRight">
              <button className="btn" onClick={handleLogout}>
                Logout
              </button>
            </div>
          </div>

          <div className="content card">
            {active === "notices" && <NoticesPage />}
            {active === "players" && <PlayersPage />}
            {active === "matches" && <MatchesPage />}
            {active === "formations" && <FormationsPage />}
            {active === "analytics" && <AnalyticsPage />}
          </div>
        </main>
      </div>
    </div>
  );
}



