"use client";
// Tilts any `.tilt` element toward the pointer (one delegated listener, one rAF per frame).
// Desktop pointers only; off for touch, coarse pointers and reduced motion.
import { useEffect } from "react";

export function TiltLayer() {
  useEffect(() => {
    const ok = matchMedia("(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)");
    if (!ok.matches) return;
    let el: HTMLElement | null = null, raf = 0, x = 0, y = 0;
    const max = () => parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--tilt-max")) || 6;

    const reset = (t: HTMLElement) => {
      t.classList.remove("tilting");
      t.style.removeProperty("--rx");
      t.style.removeProperty("--ry");
    };
    const paint = () => {
      raf = 0;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const px = (x - r.left) / r.width, py = (y - r.top) / r.height; // 0..1
      const m = max();
      el.style.setProperty("--ry", `${((px - 0.5) * 2 * m).toFixed(2)}deg`);
      el.style.setProperty("--rx", `${((0.5 - py) * 2 * m).toFixed(2)}deg`);
      el.style.setProperty("--px", `${(px * 100).toFixed(1)}%`);
      el.style.setProperty("--py", `${(py * 100).toFixed(1)}%`);
    };
    const onMove = (e: PointerEvent) => {
      const t = (e.target as Element | null)?.closest<HTMLElement>(".tilt") ?? null;
      if (t !== el) {
        if (el) reset(el);
        el = t;
        el?.classList.add("tilting");
      }
      x = e.clientX; y = e.clientY;
      if (el && !raf) raf = requestAnimationFrame(paint);
    };
    const onLeave = () => { if (el) reset(el); el = null; };

    document.addEventListener("pointermove", onMove, { passive: true });
    document.documentElement.addEventListener("pointerleave", onLeave);
    return () => {
      document.removeEventListener("pointermove", onMove);
      document.documentElement.removeEventListener("pointerleave", onLeave);
      cancelAnimationFrame(raf);
      if (el) reset(el);
    };
  }, []);
  return null;
}
