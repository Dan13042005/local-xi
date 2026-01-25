import { useState } from "react";
import "./App.css";

import { Header } from "./components/Header";
import { Nav } from "./components/Nav";

import { NoticesPage } from "./pages/NoticesPage";
import { PlayersPage } from "./pages/PlayersPage";
import { MatchesPage } from "./pages/MatchesPage";
import { FormationsPage } from "./pages/FormationsPage";

type NavKey = "notices" | "players" | "matches" | "formations";

export default function App() {
  const [active, setActive] = useState<NavKey>("notices");

  return (
    <div className="app">
      <Header title="Local XI" subtitle="Sunday League Team Manager" />
      <Nav active={active} onChange={setActive} />

      <main className="app-main">
        {active === "notices" && <NoticesPage />}
        {active === "players" && <PlayersPage />}
        {active === "matches" && <MatchesPage />}
        {active === "formations" && <FormationsPage />}
      </main>
    </div>
  );
}



