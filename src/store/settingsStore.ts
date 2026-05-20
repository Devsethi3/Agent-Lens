import { create } from 'zustand'
import { Storage } from '@plasmohq/storage'

const storage = new Storage()

export type GenerationMode = 'raw' | 'enhanced'

interface SettingsState {
  defaultGenerationMode: GenerationMode
  filterAnalytics: boolean
  setDefaultGenerationMode: (mode: GenerationMode) => Promise<void>
  setFilterAnalytics: (filter: boolean) => Promise<void>
}

export const useSettingsStore = create<SettingsState>((set) => ({
  defaultGenerationMode: 'raw',
  filterAnalytics: true,

  setDefaultGenerationMode: async (mode) => {
    await storage.set('agentlens_default_gen_mode', mode)
    set({ defaultGenerationMode: mode })
  },

  setFilterAnalytics: async (filter) => {
    await storage.set('agentlens_filter_analytics', filter)
    set({ filterAnalytics: filter })
  }
}))

export async function initializeSettings() {
  const mode = (await storage.get('agentlens_default_gen_mode')) as GenerationMode | undefined
  const filter = (await storage.get('agentlens_filter_analytics')) as boolean | undefined
  
  useSettingsStore.setState({
    defaultGenerationMode: mode || 'raw',
    filterAnalytics: filter !== undefined ? filter : true
  })
}