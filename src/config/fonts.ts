/**
 * List of available font names (visit the url `/settings/appearance`).
 * This array is used to generate dynamic font classes (e.g., `font-system`, `font-serif`).
 *
 * 📝 How to Add a New Local Font Stack (Tailwind v4+):
 * 1. Add the font name here.
 * 2. Add the font family to 'theme.css' using `@theme inline`.
 * 3. Use local system stacks or self-hosted assets under `public/fonts`.
 *
 * Example:
 * fonts.ts           → Add 'brand' to this array.
 * theme.css          → Add the new font in the CSS, e.g.:
 *   @theme inline {
 *      // ... other font families
 *      --font-brand: var(--font-sans-local);
 *   }
 */
export const fonts = ['system', 'serif', 'mono'] as const
