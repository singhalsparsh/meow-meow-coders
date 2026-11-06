"use client";

/**
 * Lightweight theme provider.
 *
 * Replaces next-themes. next-themes injects an inline <script> into the React
 * tree to set the theme before hydration, which triggers React's
 * "Encountered a script tag while rendering React component" warning (script
 * tags rendered in a component are never executed on the client). This
 * provider implements the small subset of the next-themes API the app uses
 * (`useTheme()` -> `{ theme, setTheme, resolvedTheme }`) with no script
 * injection: it toggles the `dark` class on <html> in a `useLayoutEffect`
 * (which runs before paint, so there's no theme flash).
 *
 * Behavior matches the previous setup: choice is persisted to localStorage
 * (`theme` key), `"system"` tracks prefers-color-scheme, and `dark` class /
 * `color-scheme` are kept in sync.
 */

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useLayoutEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

type Theme = "light" | "dark" | "system";

interface ThemeContextValue {
  theme: Theme;
  setTheme: (theme: Theme) => void;
  resolvedTheme: "light" | "dark" | undefined;
  themes: Theme[];
  systemTheme: "light" | "dark" | undefined;
}

const STORAGE_KEY = "theme";

const ThemeContext = createContext<ThemeContextValue | null>(null);

function getSystemTheme(): "light" | "dark" | undefined {
  if (typeof window === "undefined") return undefined;
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function readStoredTheme(): Theme | undefined {
  if (typeof window === "undefined") return undefined;
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (raw === "light" || raw === "dark" || raw === "system") return raw;
  } catch {
    /* storage unavailable — ignore */
  }
  return undefined;
}

interface ThemeProviderProps {
  children: ReactNode;
  defaultTheme?: Theme;
  enableSystem?: boolean;
  /** Extra props (attribute, disableTransitionOnChange, ...) are accepted and ignored. */
  [key: string]: unknown;
}

export function ThemeProvider({
  children,
  defaultTheme = "system",
  enableSystem = true,
}: ThemeProviderProps) {
  const [theme, setThemeState] = useState<Theme>(() => {
    if (typeof window === "undefined") return defaultTheme;
    return readStoredTheme() ?? defaultTheme;
  });

  const [systemTheme, setSystemTheme] = useState<"light" | "dark" | undefined>(
    () => getSystemTheme(),
  );

  // Keep up with OS theme changes while the user is on "system".
  useEffect(() => {
    if (!enableSystem) return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setSystemTheme(mq.matches ? "dark" : "light");
    onChange();
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, [enableSystem]);

  const resolvedTheme = theme === "system" ? (systemTheme ?? "light") : theme;

  // Apply the theme before the browser paints (layout effect) and persist the
  // user's explicit/system choice.
  useLayoutEffect(() => {
    const root = document.documentElement;
    const isDark = resolvedTheme === "dark";
    root.classList.toggle("dark", isDark);
    root.style.colorScheme = isDark ? "dark" : "light";
    try {
      window.localStorage.setItem(STORAGE_KEY, theme);
    } catch {
      /* storage unavailable — ignore */
    }
  }, [theme, resolvedTheme]);

  const setTheme = useCallback((next: Theme) => {
    setThemeState(next);
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      theme,
      setTheme,
      resolvedTheme,
      themes: ["light", "dark", "system"] as Theme[],
      systemTheme,
    }),
    [theme, setTheme, resolvedTheme, systemTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (ctx) return ctx;
  // Safe fallback matching next-themes' behavior outside a provider.
  return {
    theme: "system",
    setTheme: () => {},
    resolvedTheme: undefined,
    themes: ["light", "dark", "system"],
    systemTheme: undefined,
  };
}
