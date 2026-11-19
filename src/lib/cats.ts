// Shared by server and client components.
// [category, short tab name, stack-layer name]
export const CATS = [
  ["Foundations", "Basics", "Model"],
  ["Knowledge", "Knowledge", "Context"],
  ["Protocols", "Protocols", "Protocols"],
  ["Agents", "Agents", "Agents"],
  ["Automation", "Automation", "Automation"],
  ["Cybersecurity automation", "Security", "Security"],
  ["Safety", "Safety", "Safety"],
  ["Production", "Ops", "Ops"],
] as const;
export const catInfo = (c: string) => CATS.find((x) => x[0] === c) ?? CATS[0];
