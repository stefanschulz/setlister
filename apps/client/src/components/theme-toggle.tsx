import { MonitorIcon, MoonIcon, SunIcon, type LucideIcon } from 'lucide-react'
import { useTheme } from 'next-themes'
import { Button } from '@/components/ui/button'
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip'

type Mode = 'system' | 'light' | 'dark'

const MODES: Record<Mode, { label: string; icon: LucideIcon; next: Mode }> = {
  system: { label: 'System', icon: MonitorIcon, next: 'light' },
  light: { label: 'Hell', icon: SunIcon, next: 'dark' },
  dark: { label: 'Dunkel', icon: MoonIcon, next: 'system' },
}

/** Cycles the theme System → Hell → Dunkel; the icon shows the current choice. */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme()
  const mode: Mode = theme === 'light' || theme === 'dark' ? theme : 'system'
  const { label, icon: Icon, next } = MODES[mode]
  const title = `Design: ${label} (klicken für ${MODES[next].label})`

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button type="button" variant="ghost" size="icon-sm" aria-label={title} onClick={() => setTheme(next)}>
          <Icon />
        </Button>
      </TooltipTrigger>
      <TooltipContent>{title}</TooltipContent>
    </Tooltip>
  )
}
