import { Plus } from "lucide-react";
import { useTranslation } from "react-i18next";
import { PageIntro } from "../../shared/components/PageIntro";
export function GuidePage() {
  const { t } = useTranslation();
  return (
    <>
      <PageIntro
        eyebrow="ENTENDER ANTES DE ESCRIBIR"
        title={t("GuidePage.unaPequenaGuiaParaGrandesDudas")}
        text={t("GuidePage.identificaPrimeroLaCondicionYDespuesSu")}
      />
      <div className="guide-grid">
        <article className="panel">
          <h2>{t("GuidePage.lasCincoConectivas")}</h2>
          <table className="guide-table">
            <thead>
              <tr>
                <th>{t("GuidePage.simbolo")}</th>
                <th>{t("GuidePage.seLee")}</th>
                <th>{t("GuidePage.ejemplo")}</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["¬", t("GuidePage.no"), "¬P"],
                ["∧", t("GuidePage.y"), "P ∧ Q"],
                ["∨", t("GuidePage.oInclusiva"), "P ∨ Q"],
                ["→", t("GuidePage.siEntonces"), "P → Q"],
                ["↔", t("GuidePage.siYSoloSi"), "P ↔ Q"],
              ].map((row) => (
                <tr key={row[0]}>
                  {row.map((v, i) => (
                    <td className={i !== 1 ? "math" : ""} key={i}>
                      {v}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
          <p>
            {t("GuidePage.oEsInclusivaSalvoQueSeIndique")}</p>
        </article>
        <article className="panel">
          <h2>{t("GuidePage.laDireccionDeLaFlecha")}</h2>
          <div className="guide-rule">
            <b>{t("GuidePage.pEsSuficienteParaQ")}</b>
            <span>{t("GuidePage.siPQQSiempreQueP")}</span>
            <code>P → Q</code>
          </div>
          <div className="guide-rule">
            <b>{t("GuidePage.qEsNecesarioParaP")}</b>
            <span>{t("GuidePage.pSoloSiQDeboQPara")}</span>
            <code>P → Q</code>
          </div>
          <p>
            {t("GuidePage.necesariaYSuficienteDescribenPapelesDistintosLa")}</p>
        </article>
        <article className="panel">
          <h2>{t("GuidePage.alcanceYParentesis")}</h2>
          <p>
            {t("GuidePage.laNegacionSeAplicaPrimeroDespuesLuego")}</p>
          <div className="guide-rule">
            <b>{t("GuidePage.siPEntoncesSiQR")}</b>
            <code>P → (Q → R)</code>
          </div>
          <div className="guide-rule">
            <b>{t("GuidePage.siLaReglaPQSeCumple")}</b>
            <code>(P → Q) → R</code>
          </div>
          <p>
            {t("GuidePage.estasDosEstructurasNoSonEquivalentesEn")}</p>
        </article>
        <article className="panel">
          <h2>{t("GuidePage.aprendeDeTusIntentos")}</h2>
          <p>
            {t("GuidePage.unaRespuestaEquivalenteTambienEsCorrectaSi")}</p>
          <p>
            {t("GuidePage.lasPistasYLasSolucionesConsultadasQuedan")}</p>
          <p>
            {t("GuidePage.aciertoInicialSinAyudaSignificaAcertarEn")}</p>
        </article>
        <article className="panel expand-guide">
          <Plus size={24} />
          <h2>{t("GuidePage.unEspacioQuePuedeCrecer")}</h2>
          <p>
            {t("GuidePage.puedesPedirMasEjerciciosUnTemaConcreto")}</p>
          <div className="example-request">
            {t("GuidePage.anade15EjerciciosDeCondicionesNecesariasCon")}</div>
          <p>
            {t("GuidePage.laPrimeraVersionIncluyeFormalizacionLosNuevos")}</p>
        </article>
      </div>
    </>
  );
}
