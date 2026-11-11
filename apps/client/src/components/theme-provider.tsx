import { ThemeProvider as NextThemesProvider } from 'next-themes'
import type { ReactNode } from 'react'

/**
 * App-wide light/dark theme. The choice (System, Hell, Dunkel) is stored in
 * localStorage; "System" follows the OS. The `dark` class on <html> switches the
 * color tokens in index.css, and next-themes sets `color-scheme` for native
 * controls (scrollbars, date inputs) and avoids a flash of the wrong theme on load.
 */
export function ThemeProvider({ children }: { children: ReactNode }) {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      {children}
    </NextThemesProvider>
  )
}
