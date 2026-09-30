import { I18nextProvider } from "react-i18next";
import React from "react";
import ReactDOM from "react-dom/client";
import App from "./app/App";
import { i18n } from "./shared/i18n/config";
import "./styles/index.css";
document.documentElement.lang = i18n.resolvedLanguage ?? "es";
ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <I18nextProvider i18n={i18n}>
      <App />
    </I18nextProvider>
  </React.StrictMode>,
);
