"use client";

/**
 * Theme provider backed by next-themes.
 *
 * This module re-exports the next-themes Provider and hook so that all app
 * code can share a single theme context. It is kept at this path for backward
 * compatibility with existing imports (`@/components/providers/theme-provider`);
 * the canonical provider lives at `@/components/theme-provider`.
 */
export { ThemeProvider, useTheme, type ThemeProviderProps } from "next-themes";
