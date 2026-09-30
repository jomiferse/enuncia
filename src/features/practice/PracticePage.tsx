import { ArrowLeft, ChevronRight, RotateCcw, Search } from "lucide-react";
import { useTranslation } from "react-i18next";
import { areas, blocks, exercises } from "../../data/catalog";
import { Empty } from "../../shared/components/Empty";
import { PageIntro } from "../../shared/components/PageIntro";
import { useDifficultyLabels } from "../../shared/i18n/useDifficultyLabels";
import type { ProgressSession } from "../progress/useProgress";
import { CourseBrowser } from "./CourseBrowser";
import { blankDraft } from "./draft";
import { ExerciseList } from "./ExerciseList";
import { LevelChooser } from "./LevelChooser";
import { PracticePanel } from "./PracticePanel";
import type { PracticeNavigation } from "./usePracticeNavigation";
type PracticePageProps = { practice: PracticeNavigation } & Pick<ProgressSession, "progress" | "saveDraft" | "recordAttempt">;
export function PracticePage({ practice, progress, saveDraft, recordAttempt }: PracticePageProps) {
  const difficultyLabels = useDifficultyLabels();
  const { t } = useTranslation();
  const { practiceStage, setPracticeStage, practiceArea, filter, search, setSearch, onlyErrors, setOnlyErrors, setPracticePage, selectedBlock, blockPool, blockErrors, selectedExercise, openArea, openBlock, openLevel, next } = practice;
  return (
    <>
      <PageIntro
        eyebrow="APRENDER HACIENDO"
        title={
          practiceStage === "blocks"
            ? t("PracticePage.tuAsignaturaBloqueABloque")
            : (selectedBlock?.subtitle ?? t("PracticePage.eligeUnBloque"))
        }
        text={
          practiceStage === "blocks"
            ? t("PracticePage.eligeUnAreaYUnBloqueConsulta")
            : practiceStage === "levels"
              ? t("PracticePage.escogeLaDificultadConLaQueQuieres")
              : t("PracticePage.formalizaConLosAtomosDadosLaLista")
        }
      />
      {practiceStage === "blocks" ? (
        <CourseBrowser
          areas={areas}
          blocks={blocks}
          exercises={exercises}
          attempts={progress.attempts}
          areaId={practiceArea}
          errorsOnly={onlyErrors}
          onArea={openArea}
          onBlock={openBlock}
        />
      ) : practiceStage === "levels" && selectedBlock ? (
        <LevelChooser
          block={selectedBlock}
          pool={blockPool}
          attempts={progress.attempts}
          errorsOnly={onlyErrors}
          onBack={() => openArea(practiceArea)}
          onLevel={openLevel}
        />
      ) : (
        selectedBlock && (
          <>
            <nav className="course-trail" aria-label={t("PracticePage.rutaDePractica")}>
              <button
                className="text-button"
                onClick={() => openArea(practiceArea)}
              >
                <ArrowLeft size={15} />
                {selectedBlock.title}
              </button>
              <ChevronRight size={14} />
              <button
                className="text-button"
                onClick={() => setPracticeStage("levels")}
              >
                {selectedBlock.subtitle}
              </button>
              <ChevronRight size={14} />
              <span>
                {filter === "all"
                  ? t("PracticePage.todosLosNiveles")
                  : difficultyLabels[filter]}
              </span>
            </nav>
            <div className="filters">
              <div className="search-field">
                <Search size={18} />
                <input
                  aria-label={t("PracticePage.buscarEjercicios")}
                  placeholder={t("PracticePage.buscarDentroDeEsteNivel")}
                  value={search}
                  onChange={(e) => {
                    setSearch(e.target.value);
                    setPracticePage(0);
                  }}
                />
              </div>
              <button
                className={`button secondary ${onlyErrors ? "active-filter" : ""}`}
                aria-pressed={onlyErrors}
                onClick={() => {
                  setOnlyErrors(!onlyErrors);
                  setPracticePage(0);
                }}
              >
                <RotateCcw size={16} />
                {t("PracticePage.repasarErrores")}{blockErrors})
              </button>
            </div>
            <div className="practice-layout">
              <ExerciseList practice={practice} attempts={progress.attempts} />
              {selectedExercise ? (
                <PracticePanel
                  key={selectedExercise.id}
                  exercise={selectedExercise}
                  draft={progress.drafts[selectedExercise.id] ?? blankDraft()}
                  onDraft={(draft) =>
                    saveDraft(selectedExercise.id, draft)
                  }
                  onAttempt={(attempt) =>
                    recordAttempt(attempt)
                  }
                  onNext={next}
                />
              ) : (
                <Empty
                  title={
                    onlyErrors
                      ? t("PracticePage.sinErroresPendientes")
                      : t("PracticePage.noHayCoincidencias")
                  }
                  text={
                    onlyErrors
                      ? t("PracticePage.cuandoUnIntentoNecesiteRevisionApareceraAqui")
                      : t("PracticePage.pruebaOtraBusquedaDentroDeEsteNivel")
                  }
                  action={() => {
                    setOnlyErrors(false);
                    setSearch("");
                    setPracticePage(0);
                  }}
                  actionLabel={t("PracticePage.quitarFiltrosDeEsteNivel")}
                />
              )}
            </div>
          </>
        )
      )}
    </>
  );
}
