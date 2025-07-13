import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";
import "./index.css";
import { BreadcrumbProvider } from "./contexts/BreadcrumbContext";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BreadcrumbProvider>
      <App />
    </BreadcrumbProvider>
  </React.StrictMode>
);
