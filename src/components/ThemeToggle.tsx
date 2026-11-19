"use client";
import { useEffect, useState } from "react";

export const THEME_KEY = "atlas-theme";

// Runs before paint (inlined in <head>) so the saved theme never flashes.
export const themeBootScript = `try{var t=new URLSearchParams(location.search).get("theme")||localStorage.getItem("${THEME_KEY}");if(t)document.documentElement.dataset.theme=t}catch(e){}`;

export function ThemeToggle() {
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  useEffect(() => { setTheme(document.documentElement.dataset.theme === "light" ? "light" : "dark"); }, []);
  const toggle = () => {
    const next = theme === "light" ? "dark" : "light";
    document.documentElement.dataset.theme = next;
    try { localStorage.setItem(THEME_KEY, next); } catch {}
    setTheme(next);
  };
  return (
    <button className="icon-btn" type="button" aria-label="Dark theme" aria-pressed={theme === "dark"} onClick={toggle}>
      <span aria-hidden="true">{theme === "light" ? "☾" : "☀"}</span>
    </button>
  );
}
