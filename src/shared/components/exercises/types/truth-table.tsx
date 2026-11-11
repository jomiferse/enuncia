import { useTranslation } from "react-i18next";
import {
  parseTruthTableData,
  truthTableOptions,
  truthTableSolution,
  type TruthTableData,
} from "../../../../domain/exercises/types/truth-table";
import { formatFormula } from "../../../../domain/logic/evaluation";
import type { Row } from "../../../../domain/logic/truth-table";
import type { Exercise } from "../../../../domain/models";
import { ExerciseHeading } from "../ExerciseHeading";
import type { EditorProps, ExerciseTypeUi } from "../registry";

const vf = (v: boolean) => (v ? "V" : "F");
const rowText = (row: Row) => Object.entries(row).map(([a, v]) => `${a} = ${vf(v)}`).join(", ");

function Formulas({ data }: { data: TruthTableData }) {
  const { t } = useTranslation();
  const list = (role: "formula" | "premise" | "conclusion") =>
    data.columns.filter((c) => c.role === role);
  const group = (title: string, role: "formula" | "premise" | "conclusion") => (
    <div className="tt-formula-group">
      <span className="eyebrow">{title}</span>
      {list(role).map((c) => (
        <div className="math tt-formula" key={`${role}-${c.source}`}>{formatFormula(c.node)}</div>
      ))}
    </div>
  );
  return (
    <div className="tt-formulas">
      {data.kind === "validity" ? (
        <>
          {group(t("TruthTable.premises"), "premise")}
          {group(t("TruthTable.conclusion"), "conclusion")}
        </>
      ) : (
        group(data.kind === "equivalence" ? t("TruthTable.formulas") : t("TruthTable.formula"), "formula")
      )}
    </div>
  );
}

function TruthTableStatement({ exercise }: { exercise: Exercise }) {
  const { t } = useTranslation();
  const data = parseTruthTableData(exercise);
  return (
    <>
      <ExerciseHeading exercise={exercise} label={t("TruthTable.label")} />
      <blockquote>{exercise.statement}</blockquote>
      <p className="input-help">{t(`TruthTable.instruction.${data.kind}`)}</p>
      <Formulas data={data} />
    </>
  );
}

function CellsEditor({ exercise, value, onChange }: EditorProps) {
  const { t } = useTranslation();
  const { data, rows } = truthTableSolution(exercise);
  const result = data.columns[0];
  const cell = (i: number) => (/^[VF]$/.test(value[i] ?? "") ? value[i] : "-");
  const cycle = (i: number) => {
    const next = { "-": "V", V: "F", F: "-" }[cell(i)] as string;
    onChange(rows.map((_, k) => (k === i ? next : cell(k))).join(""));
  };
  return (
    <div className="tt-editor">
      <div className="tt-scroll">
        <table className="tt-table">
          <caption className="tt-caption">{t("TruthTable.tableCaption")}</caption>
          <thead>
            <tr>
              {data.atoms.map((a) => <th key={a} scope="col">{a}</th>)}
              <th scope="col" className="tt-result">{formatFormula(result.node)}</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                {data.atoms.map((a) => <td key={a}>{vf(row[a])}</td>)}
                <td className="tt-result">
                  <button
                    type="button"
                    className={`tt-cell tt-${cell(i) === "-" ? "empty" : cell(i)}`}
                    aria-label={t("TruthTable.cellLabel", {
                      row: i + 1,
                      values: rowText(row),
                      state: t(`TruthTable.state.${cell(i) as "V" | "F" | "-"}`),
                    })}
                    onClick={() => cycle(i)}
                  >
                    {cell(i) === "-" ? "·" : cell(i)}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="input-help">{t("TruthTable.tableHelp")}</p>
      <button
        type="button"
        className="erase-button"
        disabled={!value.replace(/-/g, "")}
        onClick={() => onChange("")}
      >
        {t("TruthTable.clearTable")}
      </button>
    </div>
  );
}

function OptionsEditor({ exercise, value, onChange }: EditorProps) {
  const { t } = useTranslation();
  const { kind } = parseTruthTableData(exercise);
  if (kind === "complete") return null;
  return (
    <fieldset className="tt-options">
      <legend>{t(`TruthTable.choose.${kind}`)}</legend>
      {truthTableOptions[kind].map((o) => (
        <label key={o} className={value === o ? "selected" : ""}>
          <input
            type="radio"
            name={`tt-${exercise.id}`}
            value={o}
            checked={value === o}
            onChange={() => onChange(o)}
          />
          <span>{t(`TruthTable.option.${o}`)}</span>
        </label>
      ))}
    </fieldset>
  );
}

function TruthTableEditor(props: EditorProps) {
  return parseTruthTableData(props.exercise).kind === "complete" ? (
    <CellsEditor {...props} />
  ) : (
    <OptionsEditor {...props} />
  );
}

function TruthTableSolutionView({ exercise }: { exercise: Exercise }) {
  const { t } = useTranslation();
  const { data, rows, values, answer, refutingRow } = truthTableSolution(exercise);
  return (
    <div className="solution">
      <span className="eyebrow">{t("TruthTable.solutionTitle")}</span>
      <div className="tt-scroll">
        <table className="tt-table">
          <caption className="tt-caption">{t("TruthTable.tableCaption")}</caption>
          <thead>
            <tr>
              {data.atoms.map((a) => <th key={a} scope="col">{a}</th>)}
              {data.columns.map((c, k) => (
                <th key={k} scope="col" className={`tt-result tt-${c.role}`}>{formatFormula(c.node)}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i} className={i === refutingRow ? "tt-refutes" : ""}>
                {data.atoms.map((a) => <td key={a}>{vf(row[a])}</td>)}
                {values.map((col, k) => <td key={k} className="tt-result">{vf(col[i])}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p>
        <b>{t(`TruthTable.verdict.${data.kind === "complete" ? "complete" : (answer as "tautologia")}`)}</b>
      </p>
      <p>{exercise.explanation}</p>
    </div>
  );
}

export const truthTableUi: ExerciseTypeUi = {
  Editor: TruthTableEditor,
  Statement: TruthTableStatement,
  Solution: TruthTableSolutionView,
};
