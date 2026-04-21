import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import { initializeDocumentTheme } from "./lib/theme";
import App from "./App.tsx";

import "./index.css";

initializeDocumentTheme();

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>
);
