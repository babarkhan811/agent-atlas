"use client";
import type { ReactNode } from "react";
import type { LessonIndexItem } from "@/content";
import { Shell } from "./Shell";

export function PageShell({ index, children }: { index: LessonIndexItem[]; children: ReactNode }) {
  return (
    <Shell index={index} pageMode>
      <main className="page panel">{children}</main>
    </Shell>
  );
}
