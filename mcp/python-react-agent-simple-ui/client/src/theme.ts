import { useSyncExternalStore } from "react";

export type Theme = "light" | "dark";

const STORAGE_KEY = "theme";
const media = window.matchMedia?.("(prefers-color-scheme: dark)");

// Storage can throw (blocked cookies, private windows) - the toggle still works for
// the session, it just is not remembered.
const readStored = (): Theme | null => {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    return value === "light" || value === "dark" ? value : null;
  } catch {
    return null;
  }
};

// A stored choice wins. Without one the app follows the system, live. index.html runs
// the same lookup before first paint so the page never flashes the wrong theme.
let theme: Theme = readStored() ?? (media?.matches ? "dark" : "light");
const listeners = new Set<() => void>();

const set = (next: Theme) => {
  if (next === theme) return;
  theme = next;
  document.documentElement.dataset.theme = next;
  // Synchronous and in registration order, so a listener that must run before React
  // re-renders (see the embed theme in App.tsx) is registered before React subscribes.
  listeners.forEach((listener) => listener());
};

document.documentElement.dataset.theme = theme;

export const getTheme = () => theme;

export const subscribeToTheme = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const toggleTheme = () => {
  const next: Theme = theme === "dark" ? "light" : "dark";
  try {
    localStorage.setItem(STORAGE_KEY, next);
  } catch {
    /* not remembered */
  }
  set(next);
};

const followSystem = (event: MediaQueryListEvent) => {
  if (!readStored()) set(event.matches ? "dark" : "light");
};
media?.addEventListener("change", followSystem);
import.meta.hot?.dispose(() => media?.removeEventListener("change", followSystem));

export const useTheme = (): Theme => useSyncExternalStore(subscribeToTheme, getTheme);
