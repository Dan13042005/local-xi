import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";

import "./styles/App.css";
import "./styles/cards.css";
import "./styles/tables.css";
import "./styles/forms.css";
import "./styles/lineup.css";
import "./styles/formations.css";


import App from "./App.tsx";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
