import {
  ArrowRight,
  ArrowLeft,
  BookOpen,
  CheckCircle2,
  Clock3,
  Layers,
  RotateCcw,
} from "lucide-react";
import type { Area, Attempt, Block, Difficulty, Exercise } from "./types";
import { difficultyLabels } from "./catalog";
import { summarizeExercises } from "./course";
export function AreaTabs({
  areas,
  selected,
  onSelect,
}: {
  areas: Area[];
  selected: string;
  onSelect: (id: string) => void;
}) {
  return (
    <nav className="area-tabs" aria-label="Áreas de la asignatura">
      {areas.map((area) => (
        <button
          key={area.id}
          aria-current={selected === area.id ? "page" : undefined}
          className={selected === area.id ? "selected" : ""}
          onClick={() => onSelect(area.id)}
        >
          <span className="area-symbol">{area.symbol}</span>
          {area.title}
        </button>
      ))}
    </nav>
  );
}
function ProgressRows({
  pool,
  attempts,
}: {
  pool: Exercise[];
  attempts: Attempt[];
}) {
  const stats = summarizeExercises(pool, attempts);
  return (
    <dl className="course-counts">
      <div>
        <dt>
          <CheckCircle2 size={15} />
          Completos
        </dt>
        <dd>{stats.complete}</dd>
      </div>
      <div>
        <dt>
          <Clock3 size={15} />
          Incompletos
        </dt>
        <dd>{stats.incomplete}</dd>
      </div>
      <div>
        <dt>
          <BookOpen size={15} />
          No intentados
        </dt>
        <dd>{stats.untouched}</dd>
      </div>
    </dl>
  );
}
export function CourseBrowser({
  areas,
  blocks,
  exercises,
  attempts,
  areaId,
  errorsOnly,
  onArea,
  onBlock,
}: {
  areas: Area[];
  blocks: Block[];
  exercises: Exercise[];
  attempts: Attempt[];
  areaId: string;
  errorsOnly: boolean;
  onArea: (id: string) => void;
  onBlock: (id: string) => void;
}) {
  const area = areas.find((a) => a.id === areaId)!;
  return (
    <>
      <AreaTabs areas={areas} selected={areaId} onSelect={onArea} />
      <div className="course-section-heading">
        <div>
          <span className="eyebrow">ELIGE UN BLOQUE</span>
          <h2>{area.title}</h2>
          <p>{area.description}</p>
        </div>
        <span className="course-section-note">
          <Layers size={16} />
          {blocks.filter((b) => b.areaId === areaId).length} bloques
        </span>
      </div>
      {errorsOnly && (
        <p className="review-context">
          <RotateCcw size={16} />
          Estás repasando errores. Elige un bloque con ejercicios pendientes.
        </p>
      )}
      <div className="course-grid">
        {blocks
          .filter((b) => b.areaId === areaId)
          .map((block) => {
            const pool = exercises.filter((e) => e.blockId === block.id);
            const stats = summarizeExercises(pool, attempts);
            const enabled =
              stats.total > 0 && (!errorsOnly || stats.pending > 0);
            return (
              <article
                className={`course-card ${!stats.total ? "planned" : ""}`}
                key={block.id}
              >
                <div className="course-card-top">
                  <span className="course-card-icon">
                    <BookOpen size={22} />
                  </span>
                  <span
                    className={`status-pill ${!stats.total ? "planned-pill" : ""}`}
                  >
                    {stats.total ? "DISPONIBLE" : "PRÓXIMAMENTE"}
                  </span>
                </div>
                <h3>{block.subtitle}</h3>
                <p>{block.description}</p>
                <div className="course-count-heading">
                  <span>Ejercicios del bloque</span>
                  <b>{stats.total}</b>
                </div>
                <ProgressRows pool={pool} attempts={attempts} />
                {stats.total > 0 ? (
                  <div className="course-review-count">
                    <RotateCcw size={13} />
                    {stats.pending} para repasar
                  </div>
                ) : (
                  <div className="course-review-count">
                    Este bloque se ampliará más adelante.
                  </div>
                )}
                <button
                  className={`button ${enabled ? "primary" : "secondary"} wide`}
                  disabled={!enabled}
                  onClick={() => onBlock(block.id)}
                  aria-label={
                    stats.total
                      ? `${errorsOnly ? "Repasar" : "Ver ejercicios de"} ${block.subtitle}`
                      : `${block.subtitle}: próximamente`
                  }
                >
                  {!stats.total
                    ? "Próximamente"
                    : errorsOnly
                      ? "Repasar errores"
                      : "Ver ejercicios"}
                  {enabled && <ArrowRight size={16} />}
                </button>
              </article>
            );
          })}
      </div>
    </>
  );
}
export function LevelChooser({
  block,
  pool,
  attempts,
  errorsOnly,
  onBack,
  onLevel,
}: {
  block: Block;
  pool: Exercise[];
  attempts: Attempt[];
  errorsOnly: boolean;
  onBack: () => void;
  onLevel: (difficulty: Difficulty) => void;
}) {
  return (
    <>
      <button className="text-button course-back" onClick={onBack}>
        <ArrowLeft size={16} />
        Todos los bloques
      </button>
      <div className="course-section-heading">
        <div>
          <span className="eyebrow">{block.title.toLocaleUpperCase("es")}</span>
          <h2>{block.subtitle}</h2>
          <p>Elige un nivel para practicar en grupos pequeños.</p>
        </div>
      </div>
      {errorsOnly && (
        <p className="review-context">
          <RotateCcw size={16} />
          Solo se mostrarán los errores pendientes del nivel elegido.
        </p>
      )}
      <div className="level-grid">
        {(["basica", "media", "avanzada"] as Difficulty[]).map(
          (difficulty, index) => {
            const own = pool.filter((e) => e.difficulty === difficulty);
            const stats = summarizeExercises(own, attempts);
            const disabled =
              own.length === 0 || (errorsOnly && stats.pending === 0);
            return (
              <article className="course-card level-card" key={difficulty}>
                <span className="eyebrow">
                  NIVEL {String(index + 1).padStart(2, "0")}
                </span>
                <h3>{difficultyLabels[difficulty]}</h3>
                <p>
                  {
                    [
                      "Empieza por las conectivas y las condiciones sencillas.",
                      "Distingue requisitos, excepciones y el alcance de las frases.",
                      "Conecta reglas y resuelve condiciones anidadas.",
                    ][index]
                  }
                </p>
                <div className="course-count-heading">
                  <span>Ejercicios</span>
                  <b>{own.length}</b>
                </div>
                <ProgressRows pool={own} attempts={attempts} />
                <div className="course-review-count">
                  <RotateCcw size={13} />
                  {stats.pending} para repasar
                </div>
                <button
                  className="button primary wide"
                  onClick={() => onLevel(difficulty)}
                  disabled={disabled}
                  aria-label={`Practicar nivel ${difficultyLabels[difficulty].toLowerCase()}`}
                >
                  {errorsOnly ? "Repasar este nivel" : "Practicar este nivel"}
                  <ArrowRight size={16} />
                </button>
              </article>
            );
          },
        )}
      </div>
    </>
  );
}
