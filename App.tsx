import { QueryClientProvider } from '@tanstack/react-query'
import { StatusBar } from 'expo-status-bar'
import { queryClient } from './src/lib/queryClient'
import { AuthProvider } from './src/auth/AuthProvider'
import { RequireAuth } from './src/auth/RequireAuth'
import { CompanyProvider } from './src/features/companies/CompanyContext'
import { RootNavigator } from './src/navigation/RootNavigator'
import { UpdateChecker } from './src/components/UpdateChecker'

export default function App(): React.JSX.Element {
  return (
    <QueryClientProvider client={queryClient}>
      <UpdateChecker />
      <AuthProvider>
        <RequireAuth>
          <CompanyProvider>
            <RootNavigator />
          </CompanyProvider>
        </RequireAuth>
      </AuthProvider>
      <StatusBar style="auto" />
    </QueryClientProvider>
  )
}
