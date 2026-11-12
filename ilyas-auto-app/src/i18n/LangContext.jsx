import { createContext, useContext, useEffect, useState } from 'react'
import { fr, ar } from './translations'

const LangContext = createContext()

export function LangProvider({ children }) {
  const [lang, setLang] = useState(() => localStorage.getItem('hbr_language') === 'ar' ? 'ar' : 'fr')
  useEffect(() => {
    document.documentElement.lang = lang
    document.documentElement.dir = lang === 'ar' ? 'rtl' : 'ltr'
    localStorage.setItem('hbr_language', lang)
  }, [lang])
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
