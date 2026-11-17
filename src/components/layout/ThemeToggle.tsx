import { Moon, Sun } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useTheme } from '@/lib/theme'

/** Switches between the brand's dark theme (default) and the light theme. */
export function ThemeToggle() {
  const [theme, setTheme] = useTheme()
  const next = theme === 'dark' ? 'light' : 'dark'
  return (
    <Button variant="ghost" size="icon" onClick={() => setTheme(next)} aria-label={next === 'light' ? 'Usar tema claro' : 'Usar tema escuro'} title={next === 'light' ? 'Tema claro' : 'Tema escuro'}>
      {theme === 'dark' ? <Sun /> : <Moon />}
    </Button>
  )
}
