/** Fixed product feedback: arbitrary user text never enters storage or AI prompts. */
export const FEEDBACK_OPTIONS = [
  "",
  "Alerts felt too frequent",
  "Alerts were helpful",
  "Head tracking felt inaccurate",
  "Camera setup was difficult",
  "The session timer was helpful",
  "The app felt slow",
  "The session helped me focus",
] as const;