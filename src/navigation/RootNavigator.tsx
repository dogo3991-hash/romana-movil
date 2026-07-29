import { NavigationContainer } from '@react-navigation/native'
import { createNativeStackNavigator } from '@react-navigation/native-stack'
import type { RootStackParamList } from './types'
import { MainTabs } from './MainTabs'
import { TicketScreen } from '../features/daily-entry/TicketScreen'

const Stack = createNativeStackNavigator<RootStackParamList>()

export function RootNavigator(): React.JSX.Element {
  return (
    <NavigationContainer>
      <Stack.Navigator>
        <Stack.Screen name="Main" component={MainTabs} options={{ headerShown: false }} />
        <Stack.Screen name="Ticket" component={TicketScreen} options={{ title: 'Ticket' }} />
      </Stack.Navigator>
    </NavigationContainer>
  )
}
