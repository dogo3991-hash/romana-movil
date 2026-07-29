import { ActivityIndicator, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useAuth } from './AuthProvider'
import { LoginScreen } from './LoginScreen'

export function RequireAuth({ children }: { children: React.ReactNode }): React.JSX.Element {
  const { session, operator, loading, authError, retryLoadOperator } = useAuth()

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    )
  }

  if (!session) {
    return <LoginScreen />
  }

  if (authError) {
    return (
      <View style={styles.center}>
        <Text style={styles.message}>No se pudo cargar tu perfil: {authError}</Text>
        <TouchableOpacity style={styles.button} onPress={retryLoadOperator}>
          <Text style={styles.buttonText}>Reintentar</Text>
        </TouchableOpacity>
      </View>
    )
  }

  if (!operator || !operator.active) {
    return (
      <View style={styles.center}>
        <Text style={styles.message}>
          Tu usuario no tiene un perfil de operador activo. Contacta a un administrador.
        </Text>
      </View>
    )
  }

  return <>{children}</>
}

const styles = StyleSheet.create({
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f4f5f7',
    padding: 24,
    gap: 12
  },
  message: { textAlign: 'center', color: '#444', fontSize: 14 },
  button: {
    backgroundColor: '#1f6feb',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20
  },
  buttonText: { color: '#fff', fontWeight: '600' }
})
