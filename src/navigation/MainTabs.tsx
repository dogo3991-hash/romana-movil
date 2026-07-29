import { useState } from 'react'
import { Ionicons } from '@expo/vector-icons'
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import { useQueryClient } from '@tanstack/react-query'
import { ActivityIndicator, Alert, TouchableOpacity } from 'react-native'
import type { MainTabParamList } from './types'
import { useAuth } from '../auth/AuthProvider'
import { DailyEntryScreen } from '../features/daily-entry/DailyEntryScreen'
import { ConductorsScreen } from '../features/conductors/ConductorsScreen'
import { TrucksScreen } from '../features/trucks/TrucksScreen'
import { MonthlySummaryScreen } from '../features/monthly-summary/MonthlySummaryScreen'
import { ReportsScreen } from '../features/reports/ReportsScreen'

const Tab = createBottomTabNavigator<MainTabParamList>()

const ICONS: Record<keyof MainTabParamList, keyof typeof Ionicons.glyphMap> = {
  Registro: 'clipboard-outline',
  Conductores: 'people-outline',
  Camiones: 'car-outline',
  Resumen: 'bar-chart-outline',
  Informes: 'document-text-outline'
}

export function MainTabs(): React.JSX.Element {
  const { signOut } = useAuth()
  const queryClient = useQueryClient()
  const [refreshing, setRefreshing] = useState(false)

  function confirmSignOut(): void {
    Alert.alert('Cerrar sesión', '¿Seguro que quieres cerrar sesión?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Cerrar sesión', style: 'destructive', onPress: () => signOut() }
    ])
  }

  async function refresh(): Promise<void> {
    setRefreshing(true)
    try {
      await queryClient.invalidateQueries()
    } finally {
      setRefreshing(false)
    }
  }

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerTitleAlign: 'center',
        tabBarIcon: ({ color, size }) => (
          <Ionicons name={ICONS[route.name as keyof MainTabParamList]} size={size} color={color} />
        ),
        headerRight: () => (
          <>
            <TouchableOpacity onPress={refresh} disabled={refreshing} style={{ marginRight: 16 }}>
              {refreshing ? (
                <ActivityIndicator size="small" />
              ) : (
                <Ionicons name="refresh-outline" size={24} color="#1f6feb" />
              )}
            </TouchableOpacity>
            <TouchableOpacity onPress={confirmSignOut} style={{ marginRight: 16 }}>
              <Ionicons name="log-out-outline" size={24} color="#c0392b" />
            </TouchableOpacity>
          </>
        )
      })}
    >
      <Tab.Screen name="Registro" component={DailyEntryScreen} options={{ title: 'Registro Diario' }} />
      <Tab.Screen name="Conductores" component={ConductorsScreen} options={{ title: 'Conductores' }} />
      <Tab.Screen name="Camiones" component={TrucksScreen} options={{ title: 'Camiones' }} />
      <Tab.Screen name="Resumen" component={MonthlySummaryScreen} options={{ title: 'Resumen Mensual' }} />
      <Tab.Screen name="Informes" component={ReportsScreen} options={{ title: 'Informes' }} />
    </Tab.Navigator>
  )
}
