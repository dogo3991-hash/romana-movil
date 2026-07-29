import { createBottomTabNavigator } from '@react-navigation/bottom-tabs'
import type { MainTabParamList } from './types'
import { DailyEntryScreen } from '../features/daily-entry/DailyEntryScreen'
import { ConductorsScreen } from '../features/conductors/ConductorsScreen'
import { TrucksScreen } from '../features/trucks/TrucksScreen'
import { MonthlySummaryScreen } from '../features/monthly-summary/MonthlySummaryScreen'
import { ReportsScreen } from '../features/reports/ReportsScreen'

const Tab = createBottomTabNavigator<MainTabParamList>()

export function MainTabs(): React.JSX.Element {
  return (
    <Tab.Navigator screenOptions={{ headerTitleAlign: 'center' }}>
      <Tab.Screen name="Registro" component={DailyEntryScreen} options={{ title: 'Registro Diario' }} />
      <Tab.Screen name="Conductores" component={ConductorsScreen} options={{ title: 'Conductores' }} />
      <Tab.Screen name="Camiones" component={TrucksScreen} options={{ title: 'Camiones' }} />
      <Tab.Screen name="Resumen" component={MonthlySummaryScreen} options={{ title: 'Resumen Mensual' }} />
      <Tab.Screen name="Informes" component={ReportsScreen} options={{ title: 'Informes' }} />
    </Tab.Navigator>
  )
}
