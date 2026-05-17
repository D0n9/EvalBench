import type { ProgressStage } from "./types";

export function StageTreeRows({ stage, depth }: { stage: ProgressStage; depth: number }) {
  const title = stage.label || stage.name || "—";
  const cur = typeof stage.current === "number" ? stage.current : 0;
  const tot = typeof stage.total === "number" ? stage.total : 0;
  const st = stage.status || "";
  const children = Array.isArray(stage.children) ? stage.children : [];

  return (
    <div className={depth > 0 ? "mt-2 border-l-2 border-slate-200 pl-3" : ""}>
      <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-slate-700">
        <span className="font-medium">{title}</span>
        <span className="text-xs text-slate-500 font-mono">
          {tot > 0 ? `${cur} / ${tot}` : null}
          {st ? <span className="ml-2 capitalize">{st}</span> : null}
        </span>
      </div>
      {children.map((ch, i) => (
        <StageTreeRows key={`${depth}-${i}-${ch.label || ch.name || i}`} stage={ch} depth={depth + 1} />
      ))}
    </div>
  );
}
