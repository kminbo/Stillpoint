const PROFILE_KEY = "stillpoint-profile-name";
export const PROFILE_OPTIONS = ["Focus explorer", "Quiet thinker", "Flow seeker", "Deep worker"] as const;

export function loadProfileName(): string {
  try {
    const value = localStorage.getItem(PROFILE_KEY) ?? "";
    if (value && !PROFILE_OPTIONS.some((option) => option === value)) { localStorage.removeItem(PROFILE_KEY); return ""; }
    return value;
  } catch { return ""; }
}

export function saveProfileName(name: string): string {
  const value = name;
  if (value && !PROFILE_OPTIONS.some((option) => option === value)) throw new Error("Choose a profile label from the list.");
  if (value) localStorage.setItem(PROFILE_KEY, value);
  else localStorage.removeItem(PROFILE_KEY);
  return value;
}