import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import {
  ArrowRight,
  ArrowLeft,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  Download,
  FileText,
  Flag,
  GraduationCap,
  HelpCircle,
  Home,
  Lightbulb,
  ListFilter,
  Menu,
  Plus,
  RotateCcw,
  Search,
  ShieldCheck,
  Target,
  Upload,
  X,
  XCircle,
  BarChart3,
} from "lucide-react";
import { blocks, exercises, exerciseById, difficultyLabels } from "./catalog";
import { formatFormula, grade, parseFormula } from "./logic";
import type { Grade } from "./logic";
import {
  emptyProgress,
  exerciseStats,
  mergeProgress,
  readProgress,
  selectExam,
  STORAGE_KEY,
} from "./progress";
import type {
  Attempt,
  Difficulty,
  Exam,
  Exercise,
  PracticeDraft,
  Progress,
} from "./types";
type View = "home" | "practice" | "exam" | "progress" | "guide";
const blankDraft = (): PracticeDraft => ({
  answer: "",
  hints: 0,
  revealed: false,
});
function load() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return {
      data: saved ? readProgress(JSON.parse(saved)) : emptyProgress(),
      error: "",
    };
  } catch {
    return {
      data: emptyProgress(),
      error:
        "Leemos el progreso con dificultad. No sobrescribiremos los datos anteriores. Exporta esta sesión antes de cerrar.",
    };
  }
}
const dateLabel = (n: number) =>
  new Date(n).toLocaleString("es-ES", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
const elapsedLabel = (ms: number) => {
  const secs = Math.max(0, Math.floor(ms / 1000));
  return `${Math.floor(secs / 60)
    .toString()
    .padStart(2, "0")}:${(secs % 60).toString().padStart(2, "0")}`;
};
function Badge({ difficulty }: { difficulty: Difficulty }) {
  return (
    <span className={`badge ${difficulty}`}>
      <i />
      {difficultyLabels[difficulty]}
    </span>
  );
}
function FormulaEditor({
  exercise,
  value,
  onChange,
  preview = true,
}: {
  exercise: Exercise;
  value: string;
  onChange: (s: string) => void;
  preview?: boolean;
}) {
  const input = useRef<HTMLTextAreaElement>(null);
  let parsed = "";
  let error = "";
  if (preview && value.trim()) {
    try {
      parsed = formatFormula(parseFormula(value, Object.keys(exercise.atoms)));
    } catch (e) {
      error = (e as Error).message;
    }
  }
  const insert = (symbol: string) => {
    const el = input.current;
    const start = el?.selectionStart ?? value.length;
    const end = el?.selectionEnd ?? start;
    const next = value.slice(0, start) + symbol + value.slice(end);
    if (next.length > 1000) return;
    onChange(next);
    requestAnimationFrame(() => {
      el?.focus();
      el?.setSelectionRange(start + symbol.length, start + symbol.length);
    });
  };
  return (
    <div className="formula-editor">
      <label htmlFor="formula-input">Tu formalización</label>
      <div className="symbol-bar">
        {[
          "¬",
          "∧",
          "∨",
          "→",
          "↔",
          "(",
          ")",
          ...Object.keys(exercise.atoms),
        ].map((s) => (
          <button
            type="button"
            key={s}
            onClick={() => insert(s)}
            aria-label={`Insertar ${s}`}
            className={
              Object.keys(exercise.atoms).includes(s) ? "atom-button" : ""
            }
          >
            {s}
          </button>
        ))}
      </div>
      <textarea
        id="formula-input"
        ref={input}
        value={value}
        maxLength={1000}
        onChange={(e) => onChange(e.target.value)}
        placeholder="Escribe aquí tu fórmula…"
        spellCheck={false}
        autoCapitalize="off"
        autoComplete="off"
        aria-describedby="formula-help"
      />
      <p className="input-help" id="formula-help">
        También puedes escribir: ~ &nbsp; &amp; &nbsp; | &nbsp; -&gt; &nbsp;
        &lt;-&gt;. Respeta las letras de los átomos.
      </p>
      {preview && (
        <div
          className={`interpretation ${error ? "syntax" : ""}`}
          aria-live="polite"
        >
          <span>
            {error ? "Revisa la sintaxis" : "Así interpretamos tu fórmula"}
          </span>
          <div>{error || parsed || "Tu fórmula aparecerá aquí."}</div>
        </div>
      )}
    </div>
  );
}
// Register an editor and a grader here to support another exercise type.
const typeRegistry: Record<
  string,
  { Editor: typeof FormulaEditor; grade: typeof grade }
> = { formalization: { Editor: FormulaEditor, grade } };
function Statement({ exercise }: { exercise: Exercise }) {
  return (
    <>
      <div className="exercise-heading">
        <span className="eyebrow">
          {exercise.id.split("-").at(-1)} / FORMALIZACIÓN
        </span>
        <Badge difficulty={exercise.difficulty} />
      </div>
      <h2 className="exercise-title">{exercise.title}</h2>
      <blockquote>{exercise.statement}</blockquote>
      <div className="atoms">
        <span className="eyebrow">ÁTOMOS DADOS</span>
        <dl>
          {Object.entries(exercise.atoms).map(([atom, text]) => (
            <div key={atom}>
              <dt>{atom}</dt>
              <dd>{text}</dd>
            </div>
          ))}
        </dl>
      </div>
    </>
  );
}
function Feedback({
  result,
  exercise,
  showSolution = true,
}: {
  result: Grade;
  exercise: Exercise;
  showSolution?: boolean;
}) {
  return (
    <div className={`feedback ${result.status}`} role="status">
      <div className="feedback-heading">
        {result.status === "correct" ? (
          <CheckCircle2 size={21} />
        ) : (
          <XCircle size={21} />
        )}
        <strong>{result.message}</strong>
      </div>
      {result.counterexample && (
        <>
          <p>Con estos valores, las dos fórmulas dan resultados distintos:</p>
          <div className="truth-values">
            {Object.entries(result.counterexample).map(([a, v]) => (
              <span key={a}>
                {a} = <b>{v ? "V" : "F"}</b>
              </span>
            ))}
          </div>
          <p>
            Tu fórmula: <b>{result.actual ? "verdadera" : "falsa"}</b> ·
            Enunciado: <b>{result.expected ? "verdadero" : "falso"}</b>
          </p>
        </>
      )}
      {showSolution && result.status === "correct" && (
        <Solution exercise={exercise} />
      )}
    </div>
  );
}
function Solution({ exercise }: { exercise: Exercise }) {
  return (
    <div className="solution">
      <span className="eyebrow">SOLUCIÓN EXPLICADA</span>
      <div className="math">
        {formatFormula(
          parseFormula(exercise.solution, Object.keys(exercise.atoms)),
        )}
      </div>
      <p>{exercise.explanation}</p>
    </div>
  );
}
function PracticePanel({
  exercise,
  draft,
  onDraft,
  onAttempt,
  onNext,
}: {
  exercise: Exercise;
  draft: PracticeDraft;
  onDraft: (d: PracticeDraft) => void;
  onAttempt: (a: Attempt) => void;
  onNext: () => void;
}) {
  const [result, setResult] = useState<Grade | null>(null);
  const Editor = typeRegistry[exercise.type].Editor;
  const check = () => {
    const r = typeRegistry[exercise.type].grade(
      draft.answer,
      exercise.solution,
      Object.keys(exercise.atoms),
    );
    setResult(r);
    onAttempt({
      id: crypto.randomUUID(),
      exerciseId: exercise.id,
      answer: draft.answer,
      status: r.status,
      aided: draft.hints > 0 || draft.revealed,
      timestamp: Date.now(),
      mode: "practice",
    });
  };
  const reveal = () => {
    onDraft({ ...draft, revealed: true });
    onAttempt({
      id: crypto.randomUUID(),
      exerciseId: exercise.id,
      answer: draft.answer,
      status: "revealed",
      aided: true,
      timestamp: Date.now(),
      mode: "practice",
    });
  };
  return (
    <article className="exercise-card">
      <Statement exercise={exercise} />
      <Editor
        exercise={exercise}
        value={draft.answer}
        onChange={(answer) => {
          onDraft({ ...draft, answer });
          setResult(null);
        }}
      />
      <div className="exercise-actions">
        <button className="button primary" onClick={check}>
          <Check size={18} />
          Comprobar
        </button>
        <button
          className="button secondary"
          disabled={draft.hints === 2}
          onClick={() => onDraft({ ...draft, hints: draft.hints + 1 })}
        >
          <Lightbulb size={17} />
          {draft.hints === 2
            ? "Pistas consultadas"
            : `Pista ${draft.hints + 1} de 2`}
        </button>
      </div>
      {draft.hints > 0 && (
        <div className="hints" aria-live="polite">
          {exercise.hints.slice(0, draft.hints).map((h, i) => (
            <p key={h}>
              <b>Pista {i + 1}.</b> {h}
            </p>
          ))}
        </div>
      )}
      {result && <Feedback result={result} exercise={exercise} />}
      <div className="practice-bottom">
        {!draft.revealed && result?.status !== "correct" ? (
          <button className="text-button" onClick={reveal}>
            Ver solución explicada
          </button>
        ) : (
          <span className="input-help">
            {draft.hints || draft.revealed
              ? "Intento con ayuda registrada"
              : "Sigue practicando a tu ritmo"}
          </span>
        )}
        <button className="text-button" onClick={onNext}>
          Siguiente ejercicio <ArrowRight size={16} />
        </button>
      </div>
      {draft.revealed && result?.status !== "correct" && (
        <Solution exercise={exercise} />
      )}
    </article>
  );
}
function App() {
  const [initial] = useState(load);
  const [progress, setProgress] = useState<Progress>(initial.data);
  const [storageError, setStorageError] = useState(initial.error);
  const [allowSave, setAllowSave] = useState(!initial.error);
  const [notice, setNotice] = useState("");
  const [view, setView] = useState<View>("home");
  const [mobileMenu, setMobileMenu] = useState(false);
  const [selected, setSelected] = useState(exercises[0].id);
  const [filter, setFilter] = useState<Difficulty | "all">("all");
  const [blockFilter, setBlockFilter] = useState("all");
  const [search, setSearch] = useState("");
  const [onlyErrors, setOnlyErrors] = useState(false);
  const [examDifficulty, setExamDifficulty] = useState<Difficulty | "all">(
    "all",
  );
  const [examIndex, setExamIndex] = useState(0);
  const [reviewExam, setReviewExam] = useState<Exam | null>(null);
  const [confirmFinish, setConfirmFinish] = useState(false);
  const [now, setNow] = useState(Date.now());
  const fileInput = useRef<HTMLInputElement>(null);
  useEffect(() => {
    if (!allowSave) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(progress));
      setStorageError("");
    } catch {
      setStorageError(
        "No se ha podido guardar en el navegador. Exporta tu progreso antes de cerrar para conservar esta sesión.",
      );
    }
  }, [progress, allowSave]);
  useEffect(() => {
    if (!progress.activeExam) return;
    const timer = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [progress.activeExam?.id]);
  const go = (target: View) => {
    setView(target);
    setMobileMenu(false);
    setNotice("");
    setConfirmFinish(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
    requestAnimationFrame(() =>
      document.getElementById("main-content")?.focus({ preventScroll: true }),
    );
  };
  const stats = exercises.map((e) => exerciseStats(e.id, progress.attempts));
  const complete = stats.filter((s) => s.solved).length;
  const first = stats.filter((s) => s.firstUnaided).length;
  const errors = stats.filter((s) => s.pending).length;
  const filtered = exercises.filter(
    (e) =>
      (filter === "all" || e.difficulty === filter) &&
      (blockFilter === "all" || e.blockId === blockFilter) &&
      (!onlyErrors || exerciseStats(e.id, progress.attempts).pending) &&
      `${e.title} ${e.statement} ${e.tags.join(" ")}`
        .toLocaleLowerCase("es")
        .includes(search.toLocaleLowerCase("es")),
  );
  const openPractice = (id?: string, errorsOnly = false) => {
    if (id) setSelected(id);
    setOnlyErrors(errorsOnly);
    setFilter("all");
    setBlockFilter("all");
    setSearch("");
    go("practice");
  };
  const selectedExercise =
    filtered.find((e) => e.id === selected) ?? filtered[0];
  const next = () => {
    if (!selectedExercise) return;
    const i = filtered.findIndex((e) => e.id === selectedExercise.id);
    setSelected(filtered[(i + 1) % filtered.length].id);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const startExam = () => {
    const available = exercises.filter((e) => e.type in typeRegistry);
    const exam: Exam = {
      id: crypto.randomUUID(),
      exerciseIds: selectExam(available, examDifficulty),
      answers: {},
      startedAt: Date.now(),
    };
    setProgress((p) => ({ ...p, activeExam: exam }));
    setReviewExam(null);
    setExamIndex(0);
    setNow(Date.now());
  };
  const finishExam = () => {
    const exam = progress.activeExam;
    if (!exam) return;
    const finished = { ...exam, finishedAt: Date.now() };
    const attempts: Attempt[] = exam.exerciseIds.map((id) => {
      const e = exerciseById[id];
      return {
        id: crypto.randomUUID(),
        exerciseId: id,
        answer: exam.answers[id] ?? "",
        status: typeRegistry[e.type].grade(
          exam.answers[id] ?? "",
          e.solution,
          Object.keys(e.atoms),
        ).status,
        aided: false,
        timestamp: finished.finishedAt,
        mode: "exam",
        examId: exam.id,
      };
    });
    setProgress((p) => ({
      ...p,
      activeExam: null,
      exams: [...p.exams, finished],
      attempts: [...p.attempts, ...attempts],
    }));
    setReviewExam(finished);
    setConfirmFinish(false);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const exportData = () => {
    const url = URL.createObjectURL(
      new Blob([JSON.stringify(progress, null, 2)], {
        type: "application/json",
      }),
    );
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `enuncia-${new Date().toISOString().slice(0, 10)}.json`;
    anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setNotice("Progreso exportado. Guarda el archivo como copia de seguridad.");
  };
  const importData = async (file?: File) => {
    if (!file) return;
    try {
      if (file.size > 10_000_000)
        throw new Error("El archivo supera el límite de 10 MB.");
      const incoming = readProgress(JSON.parse(await file.text()));
      if (!allowSave) {
        const original = localStorage.getItem(STORAGE_KEY);
        if (original)
          localStorage.setItem(
            `${STORAGE_KEY}.recovery.${Date.now()}`,
            original,
          );
        setAllowSave(true);
      }
      setProgress((p) => mergeProgress(p, incoming));
      setNotice("Progreso importado y combinado con tu historial.");
    } catch (e) {
      setNotice(`No se ha importado el archivo. ${(e as Error).message}`);
    }
    if (fileInput.current) fileInput.current.value = "";
  };
  const titles: Record<View, string> = {
    home: "Tu espacio de estudio",
    practice: "Banco de ejercicios",
    exam: "Simulacro de examen",
    progress: "Tu progreso",
    guide: "Guía de práctica",
  };
  const nav: [View, typeof Home, string][] = [
    ["home", Home, "Inicio"],
    ["practice", BookOpen, "Practicar"],
    ["exam", GraduationCap, "Simulacro"],
    ["progress", BarChart3, "Mi progreso"],
    ["guide", HelpCircle, "Guía rápida"],
  ];
  const lastPracticed = [...progress.attempts]
    .reverse()
    .find((a) => exerciseById[a.exerciseId]);
  const continueId =
    lastPracticed?.exerciseId ??
    exercises.find((e) => !exerciseStats(e.id, progress.attempts).solved)?.id ??
    exercises[0].id;
  const active = progress.activeExam;
  const activeKnown = active?.exerciseIds.every((id) =>
    Boolean(exerciseById[id]),
  );
  let body: ReactNode;
  if (view === "home")
    body = (
      <>
        <section className="hero">
          <div className="hero-copy">
            <div className="hero-label">
              <span />
              TU SIGUIENTE PASO, MÁS CLARO
            </div>
            <h1>
              Del lenguaje
              <br />a la <em>lógica.</em>
            </h1>
            <p>
              Entrena la formalización, entiende cada condición
              <br className="desktop-break" /> y llega al examen con confianza.
            </p>
            <button
              className="button primary"
              onClick={() => openPractice(continueId)}
            >
              {" "}
              {lastPracticed ? "Continuar practicando" : "Empezar a practicar"}
              <ArrowRight size={18} />
            </button>
            <div className="hero-foot">
              <ShieldCheck size={15} /> Tu progreso se guarda en este navegador
            </div>
          </div>
          <div className="logic-art" aria-hidden="true">
            <div className="art-grid" />
            <div className="art-top">UN ENUNCIADO. UNA ESTRUCTURA.</div>
            <div className="art-phrase">
              «Siempre que estudio,
              <br />
              aprendo algo nuevo.»
            </div>
            <div className="art-line" />
            <div className="art-atoms">
              <span>
                P <small>estudio</small>
              </span>
              <span>
                Q <small>aprendo</small>
              </span>
            </div>
            <div className="art-formula">
              P <span>→</span> Q
            </div>
            <div className="art-note">
              <i /> CONDICIÓN SUFICIENTE
            </div>
            <div className="art-decoration">∴</div>
          </div>
        </section>
        <section className="metrics" aria-label="Resumen del progreso">
          <Metric
            icon={<BookOpen size={20} />}
            value={`${complete} / ${exercises.length}`}
            label="Ejercicios completados"
          />
          <Metric
            icon={<Target size={20} />}
            value={String(first)}
            label="Aciertos iniciales sin ayuda"
          />
          <Metric
            icon={<RotateCcw size={20} />}
            value={String(errors)}
            label="Errores para repasar"
          />
          <Metric
            icon={<GraduationCap size={20} />}
            value={String(progress.exams.length)}
            label="Simulacros terminados"
          />
        </section>
        <div className="section-title">
          <div>
            <span className="eyebrow">PASO A PASO</span>
            <h2>Tu ruta de aprendizaje</h2>
          </div>
          <span className="muted">
            {blocks.length === 1
              ? "Un bloque, muchas formas de entenderlo."
              : `${blocks.length} bloques para seguir aprendiendo.`}
          </span>
        </div>
        <section className="learning-grid">
          {blocks.map((block, index) => {
            const pool = exercises.filter((e) => e.blockId === block.id);
            const solved = pool.filter(
              (e) => exerciseStats(e.id, progress.attempts).solved,
            ).length;
            const percentage = pool.length
              ? Math.round((solved / pool.length) * 100)
              : 0;
            return (
              <article className="block-card" key={block.id}>
                <div className="block-top">
                  <div className="block-icon">P → Q</div>
                  <span className="status-pill">DISPONIBLE</span>
                </div>
                <span className="eyebrow">
                  BLOQUE {String(index + 1).padStart(2, "0")}
                </span>
                <h3>{block.title}</h3>
                <p>
                  Aprende a traducir frases a fórmulas y a reconocer qué implica
                  cada condición.
                </p>
                <div className="block-tags">
                  <span>{block.subtitle}</span>
                  <span>{pool.length} ejercicios</span>
                  <span>
                    {new Set(pool.map((e) => e.difficulty)).size} niveles
                  </span>
                </div>
                <div className="progress-label">
                  <span>Tu avance</span>
                  <b>{percentage}%</b>
                </div>
                <div className="progress-track">
                  <i style={{ width: `${percentage}%` }} />
                </div>
                <button
                  className="button primary wide"
                  disabled={!pool.length}
                  onClick={() => {
                    openPractice(
                      pool.find(
                        (e) => !exerciseStats(e.id, progress.attempts).solved,
                      )?.id ?? pool[0]?.id,
                    );
                    setBlockFilter(block.id);
                  }}
                >
                  Entrar al bloque
                  <ArrowRight size={17} />
                </button>
              </article>
            );
          })}
          <article className="exam-card">
            <div className="circle-icon">
              <GraduationCap size={27} />
            </div>
            <span className="eyebrow">PONTE A PRUEBA</span>
            <h3>
              Un ensayo antes
              <br />
              del examen.
            </h3>
            <p>
              10 ejercicios, sin pistas.
              <br />
              La corrección te espera al final.
            </p>
            <button
              className="button secondary"
              onClick={() => {
                setReviewExam(null);
                go("exam");
              }}
            >
              {active ? "Retomar simulacro" : "Preparar simulacro"}
              <ArrowRight size={17} />
            </button>
            <div className="exam-card-foot">
              <Clock3 size={15} /> A tu ritmo, sin límite de tiempo
            </div>
          </article>
        </section>
        <section className="tip-banner">
          <Lightbulb size={23} />
          <div>
            <strong>No memorices la flecha: entiende la condición.</strong>
            <p>
              «P solo si Q» significa que Q es necesario para P. Por eso se
              escribe P → Q.
            </p>
          </div>
          <button className="text-button" onClick={() => go("guide")}>
            Ver guía <ChevronRight size={17} />
          </button>
        </section>
      </>
    );
  else if (view === "practice")
    body = (
      <>
        <PageIntro
          eyebrow="APRENDER HACIENDO"
          title="Cada frase tiene una estructura."
          text="Formaliza con los átomos dados. Usa las pistas cuando lo necesites y descubre el porqué de cada solución."
        />
        <div className="filters">
          <div className="search-field">
            <Search size={18} />
            <input
              aria-label="Buscar ejercicios"
              placeholder="Buscar por tema o enunciado…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <label className="select-label">
            <ListFilter size={17} />
            <select
              aria-label="Filtrar dificultad"
              value={filter}
              onChange={(e) => setFilter(e.target.value as Difficulty | "all")}
            >
              <option value="all">Todos los niveles</option>
              {Object.entries(difficultyLabels).map(([id, label]) => (
                <option key={id} value={id}>
                  {label}
                </option>
              ))}
            </select>
          </label>
          {blocks.length > 1 && (
            <select
              aria-label="Filtrar bloque"
              value={blockFilter}
              onChange={(e) => setBlockFilter(e.target.value)}
            >
              <option value="all">Todos los bloques</option>
              {blocks.map((b) => (
                <option value={b.id} key={b.id}>
                  {b.title} · {b.subtitle}
                </option>
              ))}
            </select>
          )}
          <button
            className={`button secondary ${onlyErrors ? "active-filter" : ""}`}
            onClick={() => setOnlyErrors(!onlyErrors)}
            aria-pressed={onlyErrors}
          >
            <RotateCcw size={16} />
            Repasar errores ({errors})
          </button>
        </div>
        <div className="practice-layout">
          <aside className="exercise-list">
            <div className="list-heading">
              {filtered.length} ejercicios <span>ELIGE UNO</span>
            </div>
            {filtered.map((e) => {
              const s = exerciseStats(e.id, progress.attempts);
              return (
                <button
                  key={e.id}
                  className={`exercise-item ${selectedExercise?.id === e.id ? "selected" : ""}`}
                  onClick={() => setSelected(e.id)}
                >
                  <span
                    className={`exercise-number ${s.pending ? "pending" : s.solved ? "done" : ""}`}
                  >
                    {s.pending ? (
                      <RotateCcw size={15} />
                    ) : s.solved ? (
                      <Check size={16} />
                    ) : (
                      e.id.split("-").at(-1)
                    )}
                  </span>
                  <span>
                    <strong>{e.title}</strong>
                    <small>
                      {difficultyLabels[e.difficulty]} ·{" "}
                      {s.pending
                        ? "Para repasar"
                        : s.solved
                          ? "Completado"
                          : s.attempts
                            ? "En práctica"
                            : "Sin intentar"}
                    </small>
                  </span>
                  <ChevronRight size={15} />
                </button>
              );
            })}
            {!filtered.length && (
              <p className="empty-mini">No hay ejercicios con estos filtros.</p>
            )}
          </aside>
          {selectedExercise ? (
            <PracticePanel
              key={selectedExercise.id}
              exercise={selectedExercise}
              draft={progress.drafts[selectedExercise.id] ?? blankDraft()}
              onDraft={(draft) =>
                setProgress((p) => ({
                  ...p,
                  drafts: { ...p.drafts, [selectedExercise.id]: draft },
                }))
              }
              onAttempt={(attempt) =>
                setProgress((p) => ({
                  ...p,
                  attempts: [...p.attempts, attempt],
                }))
              }
              onNext={next}
            />
          ) : (
            <Empty
              title={
                onlyErrors ? "Sin errores pendientes" : "No hay coincidencias"
              }
              text={
                onlyErrors
                  ? "Cuando un intento necesite revisión, aparecerá aquí."
                  : "Prueba otro tema o nivel."
              }
              action={() => {
                setOnlyErrors(false);
                setFilter("all");
                setSearch("");
                setBlockFilter("all");
              }}
              actionLabel="Ver todos los ejercicios"
            />
          )}
        </div>
      </>
    );
  else if (view === "exam") {
    if (reviewExam) {
      body = <ExamReview exam={reviewExam} onNew={() => setReviewExam(null)} />;
    } else if (active && !activeKnown) {
      body = (
        <Empty
          title="Faltan ejercicios de este simulacro"
          text="Restaura los archivos del banco para retomarlo. El progreso se conserva; también puedes cerrar este simulacro sin calificar."
          action={() => setProgress((p) => ({ ...p, activeExam: null }))}
          actionLabel="Cerrar simulacro sin calificar"
        />
      );
    } else if (active) {
      const e = exerciseById[active.exerciseIds[examIndex]];
      const Editor = typeRegistry[e.type].Editor;
      const answered = active.exerciseIds.filter((id) =>
        active.answers[id]?.trim(),
      ).length;
      body = (
        <>
          <div className="exam-toolbar">
            <div>
              <span className="eyebrow">SIMULACRO EN CURSO</span>
              <h1>Concéntrate en la condición.</h1>
            </div>
            <div className="timer">
              <Clock3 size={19} />
              {elapsedLabel(now - active.startedAt)}
              <small>sin límite</small>
            </div>
          </div>
          <div className="exam-navigation">
            {active.exerciseIds.map((id, i) => (
              <button
                key={id}
                aria-label={`Ejercicio ${i + 1}${active.answers[id]?.trim() ? ", con respuesta" : ""}`}
                aria-current={i === examIndex ? "step" : undefined}
                className={`${i === examIndex ? "current" : ""} ${active.answers[id]?.trim() ? "answered" : ""}`}
                onClick={() => setExamIndex(i)}
              >
                {i + 1}
              </button>
            ))}
            <span>{answered} de 10 respondidos</span>
          </div>
          <article className="exercise-card exam-exercise">
            <Statement exercise={e} />
            <Editor
              exercise={e}
              value={active.answers[e.id] ?? ""}
              onChange={(answer) =>
                setProgress((p) => ({
                  ...p,
                  activeExam: p.activeExam
                    ? {
                        ...p.activeExam,
                        answers: { ...p.activeExam.answers, [e.id]: answer },
                      }
                    : null,
                }))
              }
              preview={false}
            />
            <div className="exercise-actions between">
              <button
                className="button secondary"
                disabled={examIndex === 0}
                onClick={() => setExamIndex(examIndex - 1)}
              >
                <ArrowLeft size={16} />
                Anterior
              </button>
              {examIndex < 9 ? (
                <button
                  className="button primary"
                  onClick={() => setExamIndex(examIndex + 1)}
                >
                  Siguiente
                  <ArrowRight size={16} />
                </button>
              ) : (
                <button
                  className="button primary"
                  onClick={() => setConfirmFinish(true)}
                >
                  <Flag size={16} />
                  Entregar simulacro
                </button>
              )}
            </div>
            <p className="input-help">
              Tus respuestas se guardan. Puedes cambiar de sección y retomar el
              simulacro.
            </p>
          </article>
          <button
            className="text-button finish-link"
            onClick={() => setConfirmFinish(true)}
          >
            Entregar y ver resultados <ArrowRight size={16} />
          </button>
          {confirmFinish && (
            <div className="modal-backdrop">
              <div
                className="modal"
                role="dialog"
                aria-modal="true"
                aria-labelledby="finish-title"
                onKeyDown={(event) => {
                  if (event.key === "Escape") {
                    setConfirmFinish(false);
                    return;
                  }
                  if (event.key === "Tab") {
                    const buttons =
                      event.currentTarget.querySelectorAll<HTMLButtonElement>(
                        "button",
                      );
                    const first = buttons[0],
                      last = buttons[buttons.length - 1];
                    if (event.shiftKey && document.activeElement === first) {
                      event.preventDefault();
                      last.focus();
                    } else if (
                      !event.shiftKey &&
                      document.activeElement === last
                    ) {
                      event.preventDefault();
                      first.focus();
                    }
                  }
                }}
              >
                <h2 id="finish-title">Entregar simulacro</h2>
                <p>
                  {answered === 10
                    ? "Has respondido los diez ejercicios. Al entregar verás tu nota y las soluciones."
                    : `Has respondido ${answered} de 10. Los ${10 - answered} ejercicios en blanco contarán como no acertados.`}
                </p>
                <div className="exercise-actions">
                  <button
                    autoFocus
                    className="button secondary"
                    onClick={() => setConfirmFinish(false)}
                  >
                    Seguir revisando
                  </button>
                  <button className="button primary" onClick={finishExam}>
                    Entregar
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      );
    } else
      body = (
        <>
          <PageIntro
            eyebrow="SIN PISTAS, A TU RITMO"
            title="Practica como si fuera el examen."
            text="Diez ejercicios distintos. Primero tus respuestas; después, la nota y una explicación de cada solución."
          />
          <div className="exam-setup">
            <div className="circle-icon">
              <GraduationCap size={32} />
            </div>
            <h2>Tu próximo simulacro</h2>
            <div className="setup-facts">
              <span>
                <FileText size={18} />
                10 ejercicios
              </span>
              <span>
                <Clock3 size={18} />
                Sin límite de tiempo
              </span>
              <span>
                <ShieldCheck size={18} />
                Guardado automático
              </span>
            </div>
            <label htmlFor="exam-level">Dificultad</label>
            <select
              id="exam-level"
              value={examDifficulty}
              onChange={(e) =>
                setExamDifficulty(e.target.value as Difficulty | "all")
              }
            >
              <option value="all">
                Equilibrado · 3 básicos, 4 medios, 3 avanzados
              </option>
              {Object.entries(difficultyLabels).map(([id, label]) => (
                <option value={id} key={id}>
                  Solo nivel {label.toLowerCase()}
                </option>
              ))}
            </select>
            <p>
              Sin pistas ni correcciones mientras respondes. Cada ejercicio vale
              un punto. Las respuestas en blanco o con sintaxis inválida no
              suman.
            </p>
            <button className="button primary" onClick={startExam}>
              Empezar simulacro
              <ArrowRight size={18} />
            </button>
          </div>
        </>
      );
  } else if (view === "progress")
    body = (
      <>
        <PageIntro
          eyebrow="LO QUE YA HAS APRENDIDO"
          title="Tu constancia, en perspectiva."
          text="Consulta tus intentos, recupera las dudas y conserva una copia de tu recorrido."
        />
        <section className="metrics">
          <Metric
            icon={<BookOpen size={20} />}
            value={`${complete} / ${exercises.length}`}
            label="Completados alguna vez"
          />
          <Metric
            icon={<Target size={20} />}
            value={String(first)}
            label="Primer acierto sin ayuda"
          />
          <Metric
            icon={<RotateCcw size={20} />}
            value={String(errors)}
            label="Pendientes de repaso"
          />
          <Metric
            icon={<CheckCircle2 size={20} />}
            value={String(progress.attempts.length)}
            label="Registros en tu historial"
          />
        </section>
        <section className="progress-columns">
          <article className="panel">
            <h2>Por nivel</h2>
            {(["basica", "media", "avanzada"] as Difficulty[]).map((d) => {
              const own = exercises.filter((e) => e.difficulty === d);
              const solved = own.filter(
                (e) => exerciseStats(e.id, progress.attempts).solved,
              ).length;
              return (
                <div className="level-progress" key={d}>
                  <div>
                    <Badge difficulty={d} />
                    <b>
                      {solved} / {own.length}
                    </b>
                  </div>
                  <div className="progress-track">
                    <i style={{ width: `${(solved / own.length) * 100}%` }} />
                  </div>
                </div>
              );
            })}
            <button
              className="text-button"
              onClick={() => openPractice(undefined, true)}
            >
              Repasar errores
              <ArrowRight size={16} />
            </button>
          </article>
          <article className="panel backup-panel">
            <div className="circle-icon">
              <Download size={22} />
            </div>
            <h2>Tu progreso, contigo</h2>
            <p>
              Se guarda en este navegador. Exporta una copia para recuperarlo si
              cambias de navegador o borras sus datos.
            </p>
            <div className="exercise-actions">
              <button className="button primary" onClick={exportData}>
                <Download size={16} />
                Exportar
              </button>
              <button
                className="button secondary"
                onClick={() => fileInput.current?.click()}
              >
                <Upload size={16} />
                Importar
              </button>
            </div>
            <input
              ref={fileInput}
              className="visually-hidden"
              type="file"
              accept="application/json,.json"
              aria-label="Importar progreso"
              onChange={(e) => void importData(e.target.files?.[0])}
            />
          </article>
        </section>
        <section className="panel history">
          <h2>Simulacros terminados</h2>
          {progress.exams.length ? (
            [...progress.exams].reverse().map((exam) => {
              const attempts = progress.attempts.filter(
                (a) => a.examId === exam.id,
              );
              const correct = attempts.filter(
                (a) => a.status === "correct",
              ).length;
              return (
                <button
                  className="history-row"
                  key={exam.id}
                  onClick={() => {
                    setReviewExam(exam);
                    go("exam");
                  }}
                >
                  <GraduationCap size={20} />
                  <span>
                    <strong>{correct} / 10 aciertos</strong>
                    <small>
                      {dateLabel(exam.finishedAt ?? exam.startedAt)} ·{" "}
                      {elapsedLabel(
                        (exam.finishedAt ?? exam.startedAt) - exam.startedAt,
                      )}
                    </small>
                  </span>
                  <span className="text-button">
                    Revisar <ChevronRight size={16} />
                  </span>
                </button>
              );
            })
          ) : (
            <p className="muted">Aún no has terminado un simulacro.</p>
          )}
        </section>
        <section className="panel history">
          <h2>
            Últimos intentos <span className="muted">· hasta 20 registros</span>
          </h2>
          {progress.attempts.length ? (
            [...progress.attempts]
              .reverse()
              .slice(0, 20)
              .map((a) => (
                <div className="history-row" key={a.id}>
                  <span className={`history-status ${a.status}`}>
                    {a.status === "correct" ? (
                      <Check size={17} />
                    ) : a.status === "revealed" ? (
                      <Lightbulb size={17} />
                    ) : (
                      <RotateCcw size={17} />
                    )}
                  </span>
                  <span>
                    <strong>
                      {exerciseById[a.exerciseId]?.title ?? a.exerciseId}
                    </strong>
                    <small>
                      {dateLabel(a.timestamp)} ·{" "}
                      {a.mode === "exam" ? "Simulacro" : "Práctica"}
                      {a.aided ? " · Con ayuda" : ""}
                    </small>
                    <code>{a.answer || "Sin fórmula"}</code>
                  </span>
                  <span className="history-label">
                    {
                      {
                        correct: "Correcto",
                        incorrect: "Para repasar",
                        invalid: "Sintaxis / en blanco",
                        revealed: "Solución consultada",
                      }[a.status]
                    }
                  </span>
                </div>
              ))
          ) : (
            <p className="muted">
              Tu historial empezará con el primer ejercicio.
            </p>
          )}
        </section>
      </>
    );
  else
    body = (
      <>
        <PageIntro
          eyebrow="ENTENDER ANTES DE ESCRIBIR"
          title="Una pequeña guía para grandes dudas."
          text="Identifica primero la condición y después su alcance. Los paréntesis son parte del razonamiento."
        />
        <div className="guide-grid">
          <article className="panel">
            <h2>Las cinco conectivas</h2>
            <table className="guide-table">
              <thead>
                <tr>
                  <th>Símbolo</th>
                  <th>Se lee</th>
                  <th>Ejemplo</th>
                </tr>
              </thead>
              <tbody>
                {[
                  ["¬", "no", "¬P"],
                  ["∧", "y", "P ∧ Q"],
                  ["∨", "o (inclusiva)", "P ∨ Q"],
                  ["→", "si… entonces…", "P → Q"],
                  ["↔", "si y solo si", "P ↔ Q"],
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
              «O» es inclusiva salvo que se indique «pero no ambas». Los átomos
              representan proposiciones completas y se escriben tal como vienen
              dados.
            </p>
          </article>
          <article className="panel">
            <h2>La dirección de la flecha</h2>
            <div className="guide-rule">
              <b>P es suficiente para Q</b>
              <span>Si P, Q · Q siempre que P</span>
              <code>P → Q</code>
            </div>
            <div className="guide-rule">
              <b>Q es necesario para P</b>
              <span>P solo si Q · Debo Q para P</span>
              <code>P → Q</code>
            </div>
            <p>
              Necesaria y suficiente describen papeles distintos. La flecha va
              de lo que exige el requisito hacia el requisito.
            </p>
          </article>
          <article className="panel">
            <h2>Alcance y paréntesis</h2>
            <p>
              La negación se aplica primero, después ∧, luego ∨. Para combinar
              varias flechas o bicondicionales, escribe paréntesis explícitos.
            </p>
            <div className="guide-rule">
              <b>«Si P, entonces, si Q, R»</b>
              <code>P → (Q → R)</code>
            </div>
            <div className="guide-rule">
              <b>«Si la regla P → Q se cumple, R»</b>
              <code>(P → Q) → R</code>
            </div>
            <p>
              Estas dos estructuras no son equivalentes. En práctica verás cómo
              se ha interpretado tu fórmula.
            </p>
          </article>
          <article className="panel">
            <h2>Aprende de tus intentos</h2>
            <p>
              Una respuesta equivalente también es correcta. Si falla, el
              corrector muestra valores donde tu fórmula y el enunciado
              discrepan.
            </p>
            <p>
              Las pistas y las soluciones consultadas quedan registradas. Un
              ejercicio completado puede volver al repaso si te equivocas
              después.
            </p>
            <p>
              «Acierto inicial sin ayuda» significa acertar en el primer intento
              sin haber consultado pistas ni solución.
            </p>
          </article>
          <article className="panel expand-guide">
            <Plus size={24} />
            <h2>Un espacio que puede crecer</h2>
            <p>
              Puedes pedir más ejercicios, un tema concreto o un nuevo bloque,
              como tablas de verdad, deducción natural o lógica de predicados.
            </p>
            <div className="example-request">
              «Añade 15 ejercicios de condiciones necesarias, con dificultad
              media y dos pistas por ejercicio.»
            </div>
            <p>
              La primera versión incluye formalización. Los nuevos bloques se
              incorporan al proyecto conservando el historial.
            </p>
          </article>
        </div>
      </>
    );
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Saltar al contenido
      </a>
      <aside className={`sidebar ${mobileMenu ? "open" : ""}`}>
        <a
          className="brand"
          href="#inicio"
          onClick={(e) => {
            e.preventDefault();
            go("home");
          }}
        >
          <span className="brand-icon">∴</span>
          <span>
            Enuncia<span className="brand-second">piensa con claridad</span>
          </span>
        </a>
        <span className="sidebar-caption">TU CUADERNO DIGITAL</span>
        <nav aria-label="Navegación principal">
          {nav.map(([id, Icon, label]) => (
            <button
              key={id}
              className={view === id ? "active" : ""}
              aria-current={view === id ? "page" : undefined}
              onClick={() => {
                if (id === "exam") setReviewExam(null);
                go(id);
              }}
            >
              <Icon size={19} />
              {label}
              {id === "exam" && active && <span className="nav-dot" />}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="local-badge">
            <span />
            ESPACIO LOCAL
          </div>
          <p>
            Un poco de práctica.
            <br />
            Un poco más de claridad.
          </p>
          <span className="sidebar-formula">¬(dudas) → confianza</span>
        </div>
      </aside>
      {mobileMenu && (
        <button
          className="menu-overlay"
          aria-label="Cerrar menú"
          onClick={() => setMobileMenu(false)}
        />
      )}
      <div className="main-shell">
        <header className="topbar">
          <div className="breadcrumb">
            <button
              className="mobile-toggle"
              aria-label={mobileMenu ? "Cerrar menú" : "Abrir menú"}
              onClick={() => setMobileMenu(!mobileMenu)}
            >
              {mobileMenu ? <X size={22} /> : <Menu size={22} />}
            </button>
            <span>Mi aprendizaje</span>
            <ChevronRight size={13} />
            <strong>{titles[view]}</strong>
          </div>
          <div className="topbar-right">
            <span className="topbar-local">
              <span />
              {storageError ? "Sin guardar" : "Guardado local"}
            </span>
            <span className="avatar" title="Espacio personal">
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
              <button onClick={() => setNotice("")} aria-label="Cerrar aviso">
                <X size={16} />
              </button>
            </div>
          )}
          {body}
          <footer>
            <span>
              Enuncia <span className="footer-dot">·</span> Aprende a
              tu ritmo.
            </span>
            <span>
              Contenido original inspirado en ALURA · Sin conexión a la UOC
            </span>
          </footer>
        </main>
      </div>
    </div>
  );
}
function Metric({
  icon,
  value,
  label,
}: {
  icon: ReactNode;
  value: string;
  label: string;
}) {
  return (
    <article className="metric">
      <div className="metric-icon">{icon}</div>
      <strong>{value}</strong>
      <span>{label}</span>
    </article>
  );
}
function PageIntro({
  eyebrow,
  title,
  text,
}: {
  eyebrow: string;
  title: string;
  text: string;
}) {
  return (
    <div className="page-intro">
      <span className="eyebrow">{eyebrow}</span>
      <h1>{title}</h1>
      <p>{text}</p>
    </div>
  );
}
function Empty({
  title,
  text,
  action,
  actionLabel,
}: {
  title: string;
  text: string;
  action: () => void;
  actionLabel: string;
}) {
  return (
    <div className="empty panel">
      <CheckCircle2 size={34} />
      <h2>{title}</h2>
      <p>{text}</p>
      <button className="button secondary" onClick={action}>
        {actionLabel}
      </button>
    </div>
  );
}
function ExamReview({ exam, onNew }: { exam: Exam; onNew: () => void }) {
  const results = exam.exerciseIds.map((id) => {
    const exercise = exerciseById[id];
    return {
      id,
      exercise,
      result: exercise
        ? typeRegistry[exercise.type].grade(
            exam.answers[id] ?? "",
            exercise.solution,
            Object.keys(exercise.atoms),
          )
        : null,
    };
  });
  const correct = results.filter((r) => r.result?.status === "correct").length;
  return (
    <>
      <PageIntro
        eyebrow="SIMULACRO TERMINADO"
        title="Cada intento te enseña algo."
        text="Revisa las condiciones que te hicieron dudar y vuelve a practicar con una nueva perspectiva."
      />
      <section className="exam-score">
        <div>
          <span className="eyebrow">TU RESULTADO</span>
          <strong>
            {correct}
            <small> / 10</small>
          </strong>
          <p>
            {correct === 10
              ? "Todas las fórmulas son correctas. ¡Buen trabajo!"
              : `${10 - correct} ejercicios para revisar con calma.`}
          </p>
        </div>
        <div>
          <p>
            <Clock3 size={17} />
            {elapsedLabel(
              (exam.finishedAt ?? Date.now()) - exam.startedAt,
            )} · {dateLabel(exam.finishedAt ?? exam.startedAt)}
          </p>
          <button className="button primary" onClick={onNew}>
            Preparar otro simulacro
            <ArrowRight size={17} />
          </button>
        </div>
      </section>
      <div className="exam-results">
        {results.map(({ id, exercise, result }, i) =>
          exercise && result ? (
            <details className="result-details" key={id}>
              <summary>
                <span className={`history-status ${result.status}`}>
                  {result.status === "correct" ? (
                    <Check size={17} />
                  ) : (
                    <RotateCcw size={17} />
                  )}
                </span>
                <span>
                  {i + 1}. {exercise.title}
                </span>
                <Badge difficulty={exercise.difficulty} />
                <ChevronRight size={17} />
              </summary>
              <div className="result-body">
                <Statement exercise={exercise} />
                <span className="eyebrow">TU RESPUESTA</span>
                <div className="math submitted-answer">
                  {result.interpreted || exam.answers[id] || "Sin respuesta"}
                </div>
                <Feedback
                  result={result}
                  exercise={exercise}
                  showSolution={false}
                />
                <Solution exercise={exercise} />
              </div>
            </details>
          ) : (
            <div className="panel" key={id}>
              El ejercicio {id} ya no está en el banco. La respuesta original se
              conserva: {exam.answers[id] || "Sin respuesta"}.
            </div>
          ),
        )}
      </div>
    </>
  );
}
export default App;
