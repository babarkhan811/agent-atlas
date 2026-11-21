import type { Metadata, Viewport } from "next";
import { JetBrains_Mono, Space_Grotesk } from "next/font/google";
import { themeBootScript } from "@/components/ThemeToggle";
import { SITE_URL, absUrl } from "@/lib/site";
import "./globals.css";
import "./depth.css";
import { TiltLayer } from "@/components/TiltLayer";

// next/font downloads these at build time and serves them from our own origin.
const sans = Space_Grotesk({ subsets: ["latin"], variable: "--font-sans", display: "swap" });
const mono = JetBrains_Mono({ subsets: ["latin"], weight: ["400", "500", "700"], variable: "--font-mono", display: "swap" });

export const metadata: Metadata = {
  metadataBase: new URL(`${SITE_URL}/`),
  alternates: { canonical: absUrl("/") },
  manifest: absUrl("/manifest.webmanifest"),
  title: { default: "Agent Atlas · See how AI agents work", template: "%s · Agent Atlas" },
  description:
    "Watch AI agents work, message by message. Interactive simulations of LLMs, tool use, RAG, MCP, multi-agent systems, automation and AI-driven cybersecurity.",
  icons: {
    icon: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 32 32'%3E%3Crect width='32' height='32' rx='7' fill='%2305080f'/%3E%3Cpath d='M16 5l10 6v10l-10 6-10-6V11z' fill='none' stroke='%2338bdf8' stroke-width='2'/%3E%3Ccircle cx='16' cy='16' r='3.5' fill='%23a78bfa'/%3E%3C/svg%3E",
  },
};

export const viewport: Viewport = { themeColor: "#05080f" };

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" data-theme="dark" className={`${sans.variable} ${mono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeBootScript }} />
      </head>
      <body>
        {children}
        <TiltLayer />
      </body>
    </html>
  );
}
