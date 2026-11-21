import { createContext, useContext } from 'react'

export interface ToastItem {
  id: number
  tone: 'success' | 'error'
  message: string
  action?: { label: string; onClick: () => void }
}

export type Push = (message: string, opts?: { tone?: ToastItem['tone']; action?: ToastItem['action'] }) => void

export const ToastContext = createContext<Push>(() => {})

export const useToast = () => useContext(ToastContext)
