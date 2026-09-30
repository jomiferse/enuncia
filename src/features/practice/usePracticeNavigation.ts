import { useState } from "react";
import { areas, blocks, exerciseById, exercises } from "../../data/catalog";
import { EXERCISES_PER_PAGE, exercisePage, filterExercisePool, summarizeExercises } from "../../domain/course/queries";
import type { Difficulty, Progress } from "../../domain/models";
import { exerciseStats } from "../../domain/progress/statistics";
export function usePracticeNavigation(progress: Progress, onOpen: () => void) {
  const [selected, setSelected] = useState(exercises[0].id);
  const [filter, setFilter] = useState<Difficulty | "all">("all");
  const [blockFilter, setBlockFilter] = useState("");
  const [practiceArea, setPracticeArea] = useState(areas[0].id);
  const [practiceStage, setPracticeStage] = useState<
    "blocks" | "levels" | "exercises"
  >("blocks");
  const [practicePage, setPracticePage] = useState(0);
  const [search, setSearch] = useState("");
  const [onlyErrors, setOnlyErrors] = useState(false);
  const selectedBlock = blocks.find((b) => b.id === blockFilter);
  const blockPool = exercises.filter((e) => e.blockId === blockFilter);
  const blockErrors = summarizeExercises(
    blockPool.filter((e) => filter === "all" || e.difficulty === filter),
    progress.attempts,
  ).pending;
  const filtered = filterExercisePool(exercises, progress.attempts, {
    blockId: blockFilter,
    difficulty: filter,
    query: search,
    errorsOnly: onlyErrors,
  });
  const pagination = exercisePage(filtered, practicePage);
  const openArea = (id: string) => {
    setPracticeArea(id);
    setPracticeStage("blocks");
    setBlockFilter("");
    setFilter("all");
    setSearch("");
    setPracticePage(0);
    onOpen();
  };
  const openPractice = (id?: string, errorsOnly = false) => {
    setOnlyErrors(errorsOnly);
    setSearch("");
    setPracticePage(0);
    const exercise = id ? exerciseById[id] : undefined;
    if (exercise) {
      const block = blocks.find((b) => b.id === exercise.blockId)!;
      setSelected(exercise.id);
      setBlockFilter(block.id);
      setPracticeArea(block.areaId);
      setFilter(exercise.difficulty);
      setPracticeStage("exercises");
      const own = filterExercisePool(exercises, progress.attempts, {
        blockId: block.id,
        difficulty: exercise.difficulty,
        query: "",
        errorsOnly,
      });
      setPracticePage(
        Math.max(
          0,
          Math.floor(
            own.findIndex((e) => e.id === exercise.id) / EXERCISES_PER_PAGE,
          ),
        ),
      );
    } else {
      setPracticeStage("blocks");
      setBlockFilter("");
      setFilter("all");
      if (errorsOnly) {
        const pending = exercises.find(
          (e) => exerciseStats(e.id, progress.attempts).pending,
        );
        setPracticeArea(
          blocks.find((b) => b.id === pending?.blockId)?.areaId ?? areas[0].id,
        );
      }
    }
    onOpen();
  };
  const openBlock = (id: string) => {
    setBlockFilter(id);
    setPracticeStage("levels");
    setFilter("all");
    setSearch("");
    setPracticePage(0);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const openLevel = (difficulty: Difficulty) => {
    setFilter(difficulty);
    setPracticeStage("exercises");
    setSearch("");
    setPracticePage(0);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };
  const selectedExercise =
    pagination.items.find((e) => e.id === selected) ?? pagination.items[0];
  const next = () => {
    if (!selectedExercise) return;
    const index =
      (filtered.findIndex((e) => e.id === selectedExercise.id) + 1) %
      filtered.length;
    setSelected(filtered[index].id);
    setPracticePage(Math.floor(index / EXERCISES_PER_PAGE));
    requestAnimationFrame(() => {
      document.querySelector(".exercise-card")?.scrollIntoView({
        behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches
          ? "instant"
          : "smooth",
        block: "start",
      });
    });
  };
  return { practiceStage, setPracticeStage, practiceArea, filter, search, setSearch, onlyErrors, setOnlyErrors, setPracticePage, setSelected, selectedBlock, blockPool, blockErrors, filtered, pagination, selectedExercise, openArea, openPractice, openBlock, openLevel, next };
}
export type PracticeNavigation = ReturnType<typeof usePracticeNavigation>;
