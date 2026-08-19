import { createContext, useContext, useState } from 'react'
import { fr, ar } from './translations'

const LangContext = createContext()

export function LangProvider({ children }) {
  const [lang, setLang] = useState('fr')
  const t = lang === 'ar' ? ar : fr
  const rtl = lang === 'ar'
  function toggleLang() { setLang(l => (l === 'fr' ? 'ar' : 'fr')) }

  return (
    <LangContext.Provider value={{ lang, t, rtl, toggleLang }}>
      {children}
    </LangContext.Provider>
  )
}

export function useLang() {
  return useContext(LangContext)
}
