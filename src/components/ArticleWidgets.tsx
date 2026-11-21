"use client";
// Small interactive pieces of the lesson article: jump-to-step, code tabs, quiz.
import { useState } from "react";
import type { QuizQuestion } from "@/content/schema";
import { Inline } from "./Prose";

export const GOTO_EVENT = "atlas:goto";

/** Moves the simulation above to a step (the Workspace listens for this event). */
export function StepJump({ step }: { step: number }) {
  return (
    <button type="button" className="jump" onClick={() => {
      window.dispatchEvent(new CustomEvent(GOTO_EVENT, { detail: step }));
      const main = document.getElementById("main");
      main?.scrollIntoView({ behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
      main?.focus({ preventScroll: true });
    }}>
      ▶ Show step {step + 1} in the simulation
    </button>
  );
}

export function CodeTabs({ files }: { files: { label: string; name: string; code: string; run: string }[] }) {
  const [i, setI] = useState(0);
  const [copied, setCopied] = useState(false);
  const f = files[i]!;
  return (
    <div className="codetabs">
      <div className="codetabs-bar">
        <div role="tablist" aria-label="Language" className="codetabs-tabs" style={{ ["--i" as string]: i, ["--n" as string]: files.length }}>
          {files.map((x, k) => (
            <button key={x.label} type="button" role="tab" aria-selected={k === i} id={`code-tab-${k}`} aria-controls="code-panel"
              className={k === i ? "on" : ""} onClick={() => { setI(k); setCopied(false); }}>{x.label}</button>
          ))}
        </div>
        <button type="button" className="copy" onClick={async () => {
          try { await navigator.clipboard.writeText(f.code); setCopied(true); } catch { setCopied(false); }
        }}>{copied ? "Copied ✓" : "Copy"}</button>
      </div>
      <div id="code-panel" role="tabpanel" aria-labelledby={`code-tab-${i}`}>
        <div className="codetabs-file"><code>{f.name}</code> · run: <code>{f.run}</code></div>
        <pre tabIndex={0} aria-label={`${f.name} source code`}><code>{f.code}</code></pre>
      </div>
    </div>
  );
}

export function Quiz({ questions }: { questions: QuizQuestion[] }) {
  const [picked, setPicked] = useState<(number | null)[]>(() => questions.map(() => null));
  const answered = picked.filter((p) => p !== null).length;
  const correct = picked.filter((p, i) => p === questions[i]!.answer).length;
  return (
    <div className="quiz">
      {questions.map((q, qi) => {
        const choice = picked[qi];
        return (
          <fieldset key={qi} className="quiz-q">
            <legend><span className="quiz-n">{qi + 1}</span><Inline text={q.q} /></legend>
            <div className="quiz-opts">
              {q.options.map((o, oi) => {
                const state = choice === null ? "" : oi === q.answer ? " right" : oi === choice ? " wrong" : "";
                return (
                  <button key={oi} type="button" className={`key${state}`} aria-pressed={choice === oi} disabled={choice !== null}
                    onClick={() => setPicked((p) => p.map((v, k) => (k === qi ? oi : v)))}>
                    <Inline text={o} />
                  </button>
                );
              })}
            </div>
            <div aria-live="polite">
              {choice !== null && (
                <p className={`quiz-fb ${choice === q.answer ? "right" : "wrong"}`}>
                  <b>{choice === q.answer ? "Correct." : "Not quite."}</b> <Inline text={q.explain} />
                </p>
              )}
            </div>
          </fieldset>
        );
      })}
      <p className="quiz-score" aria-live="polite">
        {answered === questions.length
          ? `You scored ${correct} of ${questions.length}.`
          : `${answered} of ${questions.length} answered.`}
        {answered > 0 && (
          <button type="button" className="linkish" onClick={() => setPicked(questions.map(() => null))}>Try again</button>
        )}
      </p>
    </div>
  );
}
