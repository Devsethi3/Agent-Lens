import '../styles/globals.css'
import { App } from './App'
import { ErrorBoundary } from '../components/shared/ErrorBoundary'
import { initializeTheme } from '../store/themeStore'
import { initializeSettings } from '../store/settingsStore'

// Initialize stores before rendering
initializeTheme()
initializeSettings()

export default function PopupRoot() {
  return (
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  )
}