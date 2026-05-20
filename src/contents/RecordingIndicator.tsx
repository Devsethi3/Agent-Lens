import type { PlasmoCSConfig, PlasmoGetInlineAnchor, PlasmoGetStyle } from "plasmo"
import { useEffect, useState } from "react"
import { MESSAGE_ACTIONS, STORAGE_KEYS } from "../lib/constants"
import cssText from "data-text:~/styles/globals.css"

export const config: PlasmoCSConfig = {
  matches: ["<all_urls>"],
  run_at: "document_end"
}

export const getStyle: PlasmoGetStyle = () => {
  const style = document.createElement("style")
  style.textContent = cssText
  return style
}

export const getInlineAnchor: PlasmoGetInlineAnchor = async () =>
  document.querySelector("body") || document.documentElement

const RecordingIndicator = () => {
  const [isRecording, setIsRecording] = useState(false)
  const [eventCount, setEventCount] = useState(0)

  useEffect(() => {
    // Initial state
    chrome.storage.local.get([STORAGE_KEYS.RECORDING_STATE, "active_event_count"], (res) => {
      setIsRecording(res[STORAGE_KEYS.RECORDING_STATE] === "recording")
      setEventCount(res.active_event_count || 0)
    })

    // Listen for storage changes to sync state across tabs
    const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }) => {
      if (changes[STORAGE_KEYS.RECORDING_STATE]) {
        setIsRecording(changes[STORAGE_KEYS.RECORDING_STATE].newValue === "recording")
      }
      if (changes["active_event_count"]) {
        setEventCount(changes["active_event_count"].newValue || 0)
      }
    }

    chrome.storage.onChanged.addListener(handleStorageChange)
    
    return () => {
      chrome.storage.onChanged.removeListener(handleStorageChange)
    }
  }, [])

  const handleStop = () => {
    chrome.runtime.sendMessage({ action: MESSAGE_ACTIONS.STOP_RECORDING })
  }

  if (!isRecording) return null

  return (
    <div className="fixed bottom-6 right-6 z-[2147483647] flex items-center gap-4 px-4 py-2.5 bg-background border border-border rounded-xl shadow-2xl transition-all duration-300">
      <div className="flex items-center gap-3">
        <div className="relative flex h-3 w-3">
          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75"></span>
          <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive"></span>
        </div>
        <div className="flex flex-col">
          <span className="text-sm font-semibold text-foreground">Recording Flow</span>
          <span className="text-[10px] font-medium text-foreground/50 uppercase tracking-wider">
            {eventCount} Events Captured
          </span>
        </div>
      </div>
      
      <div className="h-8 w-px bg-border"></div>
      
      <button
        onClick={handleStop}
        className="flex items-center gap-2 px-3 py-1.5 bg-destructive/10 hover:bg-destructive/20 text-destructive border border-destructive/20 rounded-lg text-sm font-bold transition-all active:scale-95 group"
      >
        <div className="w-2.5 h-2.5 bg-destructive rounded-sm group-hover:scale-110 transition-transform"></div>
        Stop
      </button>
    </div>
  )
}

export default RecordingIndicator
