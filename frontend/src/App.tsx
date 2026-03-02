import { useEffect, useState } from "react";
import "./App.css";

import { Header } from "./components/Header";
import { Nav } from "./components/Nav";

import { NoticesPage } from "./pages/NoticesPage";
import { PlayersPage } from "./pages/PlayersPage";
import { MatchesPage } from "./pages/MatchesPage";
import { FormationsPage } from "./pages/FormationsPage";
import { AnalyticsPage } from "./pages/AnalyticsPage";

import LoginPage from "./pages/LoginPage";

type NavKey = "notices" | "players" | "matches" | "formations" | "analytics";

export default function App() {
  const [active, setActive] = useState<NavKey>("notices");
  const [token, setToken] = useState<string | null>(localStorage.getItem("token"));

  // Keep state in sync if token changes
  useEffect(() => {
    const onStorage = () => setToken(localStorage.getItem("token"));
    window.addEventListener("storage", onStorage);
    return () => window.removeEventListener("storage", onStorage);
  }, []);

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    setToken(null);
  }

  // If not logged in, show login screen only
  if (!token) {
    return (
      <div className="app">
        <Header title="Local XI" subtitle="Sunday League Team Manager" />
        <main className="app-main">
          <LoginPage onLoggedIn={() => setToken(localStorage.getItem("token"))} />
        </main>
      </div>
    );
  }

  // Logged in -> show normal app
  return (
    <div className="app">
      <Header title="Local XI" subtitle="Sunday League Team Manager" />
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



