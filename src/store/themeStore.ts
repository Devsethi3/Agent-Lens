import { create } from 'zustand'
import { Storage } from '@plasmohq/storage'

const storage = new Storage()

export type Theme = 'light' | 'dark' | 'system'

interface ThemeState {
  theme: Theme
  setTheme: (theme: Theme) => Promise<void>
  applyTheme: (theme: Theme) => void
}

const getSystemPreference = (): 'light' | 'dark' => {
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
}

export const useThemeStore = create<ThemeState>((set) => ({
  theme: 'system',
  
  setTheme: async (theme) => {
    await storage.set('agentlens_theme', theme)
    set({ theme })
    const resolvedTheme = theme === 'system' ? getSystemPreference() : theme
    applyClass(resolvedTheme)
  },

  applyTheme: (theme) => {
    const resolvedTheme = theme === 'system' ? getSystemPreference() : theme
    applyClass(resolvedTheme)
  }
}))

function applyClass(theme: 'light' | 'dark') {
  const root = document.documentElement
  root.classList.remove('light', 'dark')
  root.classList.add(theme)
}

// Hydration logic (to be called on app mount)
export async function initializeTheme() {
  const storedTheme = (await storage.get('agentlens_theme')) as Theme | undefined
  const theme = storedTheme || 'system'
  useThemeStore.setState({ theme })
  useThemeStore.getState().applyTheme(theme)

  // Listen for system changes if set to 'system'
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    const currentTheme = useThemeStore.getState().theme
    if (currentTheme === 'system') {
      useThemeStore.getState().applyTheme('system')
    }
  })
}