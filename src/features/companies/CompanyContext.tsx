import { createContext, useContext, useEffect, useState } from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import { useCompanies } from './useCompanies'

const STORAGE_KEY = 'slm-bellavista:selected-company-id'

interface CompanyContextValue {
  companyId: string | null
  setCompanyId: (id: string) => void
  companies: { id: string; name: string }[]
  loading: boolean
}

const CompanyContext = createContext<CompanyContextValue | null>(null)

export function CompanyProvider({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { data: companies, isLoading } = useCompanies()
  const [storedCompanyId, setStoredCompanyId] = useState<string | null>(null)
  const [storageLoaded, setStorageLoaded] = useState(false)

  useEffect(() => {
    AsyncStorage.getItem(STORAGE_KEY).then((value) => {
      setStoredCompanyId(value)
      setStorageLoaded(true)
    })
  }, [])

  // Mientras "companies" o el storage todavía no resolvieron, confiamos en el
  // id guardado (o null) en vez de bloquear toda la app. Una vez que companies
  // resuelve, se valida/corrige igual que en la app de escritorio.
  const companyId =
    companies === undefined
      ? storedCompanyId
      : companies.some((c) => c.id === storedCompanyId)
        ? storedCompanyId
        : (companies[0]?.id ?? null)

  function setCompanyId(id: string): void {
    AsyncStorage.setItem(STORAGE_KEY, id)
    setStoredCompanyId(id)
  }

  return (
    <CompanyContext.Provider
      value={{
        companyId,
        setCompanyId,
        companies: companies ?? [],
        loading: isLoading || !storageLoaded
      }}
    >
      {children}
    </CompanyContext.Provider>
  )
}

export function useCompanyContext(): CompanyContextValue {
  const ctx = useContext(CompanyContext)
  if (!ctx) throw new Error('useCompanyContext debe usarse dentro de CompanyProvider')
  return ctx
}
