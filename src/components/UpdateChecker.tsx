import { useEffect, useState } from 'react'
import { ActivityIndicator, Alert, Modal, StyleSheet, Text, View } from 'react-native'
import { checkForUpdate } from '../lib/updateChecker'
import { downloadAndInstallApk } from '../lib/installApk'

export function UpdateChecker(): React.JSX.Element | null {
  const [downloading, setDownloading] = useState(false)
  const [progress, setProgress] = useState(0)

  useEffect(() => {
    checkForUpdate()
      .then((update) => {
        if (!update) return
        Alert.alert(
          'Actualización disponible',
          `Hay una nueva versión (${update.version}) disponible. ¿Descargarla e instalarla ahora?`,
          [
            { text: 'Más tarde', style: 'cancel' },
            {
              text: 'Actualizar',
              onPress: async () => {
                setDownloading(true)
                try {
                  await downloadAndInstallApk(update.apkUrl, setProgress)
                } catch (err) {
                  Alert.alert(
                    'No se pudo actualizar',
                    err instanceof Error ? err.message : 'Error desconocido'
                  )
                } finally {
                  setDownloading(false)
                }
              }
            }
          ]
        )
      })
      .catch(() => {
        // Sin conexión a GitHub: no interrumpe el uso normal de la app.
      })
  }, [])

  if (!downloading) return null

  return (
    <Modal transparent animationType="fade">
      <View style={styles.overlay}>
        <View style={styles.card}>
          <ActivityIndicator size="large" />
          <Text style={styles.text}>Descargando actualización… {Math.round(progress * 100)}%</Text>
        </View>
      </View>
    </Modal>
  )
}

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', alignItems: 'center', justifyContent: 'center' },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 24, alignItems: 'center', gap: 12 },
  text: { fontSize: 14, color: '#333' }
})
