export async function saveFileToSystem(content: string, suggestedName: string): Promise<boolean> {
  // Check if File System Access API is supported
  if ('showSaveFilePicker' in window) {
    try {
      // @ts-ignore - TypeScript doesn't have types for showSaveFilePicker yet
      const handle = await window.showSaveFilePicker({
        suggestedName,
        types: [
          {
            description: 'Markdown File',
            accept: { 'text/markdown': ['.md'] }
          }
        ]
      })
      const writable = await handle.createWritable()
      await writable.write(content)
      await writable.close()
      return true
    } catch (err) {
      // User cancelled the save dialog
      if (err instanceof Error && err.name === 'AbortError') return false
      console.error('[AgentLens] File System Access Error:', err)
      // Fallback to standard download on error
    }
  }
  
  // Fallback: Standard download
  try {
    const blob = new Blob([content], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = suggestedName
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
    return true
  } catch (e) {
    console.error('[AgentLens] Fallback download failed:', e)
    return false
  }
}