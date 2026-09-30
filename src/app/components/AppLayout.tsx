import { BarChart3, BookOpen, ChevronRight, GraduationCap, HelpCircle, Home, Menu, X } from "lucide-react";
import type { ReactNode } from "react";
import { useState } from "react";
import { useTranslation } from "react-i18next";
import type { View } from "../navigation";
type AppLayoutProps = {
  view: View;
  title: string;
  hasActiveExam: boolean;
  storageError: string;
  notice: string;
  onNavigate: (view: View) => void;
  onDismissNotice: () => void;
  children: ReactNode;
};
export function AppLayout({ view, title, hasActiveExam, storageError, notice, onNavigate, onDismissNotice, children }: AppLayoutProps) {
  const { t } = useTranslation();
  const [mobileMenu, setMobileMenu] = useState(false);
  const navigate = (target: View) => { setMobileMenu(false); onNavigate(target); };
  const nav: [View, typeof Home, string][] = [
    ["home", Home, t("AppLayout.inicio")],
    ["practice", BookOpen, t("AppLayout.practicar")],
    ["exam", GraduationCap, t("AppLayout.simulacro")],
    ["progress", BarChart3, t("AppLayout.miProgreso")],
    ["guide", HelpCircle, t("AppLayout.guiaRapida")],
  ];
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        {t("AppLayout.saltarAlContenido")}</a>
      <aside className={`sidebar ${mobileMenu ? "open" : ""}`}>
        <a
          className="brand"
          href="#inicio"
          onClick={(e) => {
            e.preventDefault();
            navigate("home");
          }}
        >
          <span className="brand-icon">∴</span>
          <span>
            Enuncia<span className="brand-second">{t("AppLayout.piensaConClaridad")}</span>
          </span>
        </a>
        <span className="sidebar-caption">{t("AppLayout.tuCuadernoDigital")}</span>
        <nav aria-label={t("AppLayout.navegacionPrincipal")}>
          {nav.map(([id, Icon, label]) => (
            <button
              key={id}
              className={view === id ? "active" : ""}
              aria-current={view === id ? "page" : undefined}
              onClick={() => {
                navigate(id);
              }}
            >
              <Icon size={19} />
              {label}
              {id === "exam" && hasActiveExam && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="local-badge">
            <span />
            {t("AppLayout.espacioLocal")}</div>
          <p>
            {t("AppLayout.unPocoDePractica")}<br />
            {t("AppLayout.unPocoMasDeClaridad")}</p>
          <span className="sidebar-formula">{t("AppLayout.dudasConfianza")}</span>
        </div>
      </aside>
      {mobileMenu && (
        <button
          className="menu-overlay"
          aria-label={t("AppLayout.cerrarMenu")}
          onClick={() => setMobileMenu(false)}
        />
      )}
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="mobile-toggle"
              aria-label={mobileMenu ? t("AppLayout.cerrarMenu") : t("AppLayout.abrirMenu")}
              onClick={() => setMobileMenu(!mobileMenu)}
            >
              {mobileMenu ? <X size={22} /> : <Menu size={22} />}
            </button>
            <span>{t("AppLayout.miAprendizaje")}</span>
            <ChevronRight size={13} />
            <strong>{title}</strong>
          </div>
          <div className="topbar-right">
            <span className="topbar-local">
              <span />
              {storageError ? t("AppLayout.sinGuardar") : t("AppLayout.guardadoLocal")}
            </span>
            <span className="avatar" title={t("AppLayout.espacioPersonal")}>
              ∴
            </span>
          </div>
        </header>
        <main id="main-content" tabIndex={-1}>
          {storageError && (
            <div className="notice warning" role="alert">
              {storageError}
            </div>
          )}
          {notice && (
            <div className="notice" role="status">
              {notice}
              <button onClick={() => onDismissNotice()} aria-label={t("AppLayout.cerrarAviso")}>
                <X size={16} />
              </button>
            </div>
          )}
          {children}
          <footer>
            <span>
              {t("AppLayout.enuncia")}<span className="footer-dot">·</span> {t("AppLayout.aprendeATuRitmo")}</span>
          </footer>
        </main>
      </div>
    </div>
  );
}
