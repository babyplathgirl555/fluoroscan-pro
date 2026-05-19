import { createContext, useContext, useState, useEffect } from 'react'
 
export const ThemeContext = createContext()
export function useTheme() { return useContext(ThemeContext) }
 
export function ThemeProvider({ children }) {
  const [darkMode, setDarkMode] = useState(
    () => localStorage.getItem('fs_dark') === 'true'
  )
  const [units, setUnits] = useState(
    () => localStorage.getItem('fs_units') || 'mg/mL'
  )
 
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light')
    localStorage.setItem('fs_dark', String(darkMode))
  }, [darkMode])
 
  useEffect(() => {
    localStorage.setItem('fs_units', units)
  }, [units])
 
  return (
    <ThemeContext.Provider value={{ darkMode, setDarkMode, units, setUnits }}>
      {children}
    </ThemeContext.Provider>
  )
}
 
