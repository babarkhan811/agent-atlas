// Pricing hypotheses (owner-approved 2026-11-19). Change here, not in pages.
// `launched: false` means the plan is announced but cannot be bought yet.
export const PRICING = {
  currency: "USD",
  free: { name: "Free", launched: true },
  pro: { name: "Pro", monthly: 15, yearly: 119, launched: false },
  team: { name: "Team", perSeatMonthly: 25, minSeats: 5, contactAbove: 25, launched: false },
} as const;

/** During the free launch every lesson is open; Pro gating switches on with payments. */
export const ALL_LESSONS_FREE = true;
