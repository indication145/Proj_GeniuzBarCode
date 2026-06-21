// Fonts users can pick for text/price elements. All bundled offline via
// @fontsource (imported in main.tsx) so they also appear in the print popup
// (printDoc copies the app's @font-face rules).

export const DEFAULT_FONT = "'IBM Plex Sans Thai', sans-serif"

export const FONT_OPTIONS: { value: string; label: string }[] = [
  { value: DEFAULT_FONT, label: 'IBM Plex Sans Thai' },
  { value: "'Sarabun', sans-serif", label: 'Sarabun (สารบรรณ)' },
  { value: "'Kanit', sans-serif", label: 'Kanit' },
  { value: "'Prompt', sans-serif", label: 'Prompt' },
  { value: "'Mitr', sans-serif", label: 'Mitr' },
  { value: "'IBM Plex Mono', monospace", label: 'IBM Plex Mono' },
]
