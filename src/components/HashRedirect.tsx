"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

/** Sends prototype links like `/#/mcp/3` to their new URL (`/learn/knowledge-protocols/mcp/?step=3`). */
export function HashRedirect({ routes }: { routes: Record<string, string> }) {
  const router = useRouter();
  useEffect(() => {
    const m = location.hash.match(/^#\/([a-z0-9-]+)(?:\/(\d+))?/);
    if (!m) return;
    const [, id, step] = m;
    if (id === "guide" || id === "glossary") return router.replace(`/${id}/`);
    const href = routes[id!];
    if (href) router.replace(step ? `${href}?step=${step}` : href);
  }, [router, routes]);
  return null;
}
