import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useRoute } from '@react-navigation/native'
import type { RouteProp } from '@react-navigation/native'
import * as Print from 'expo-print'
import * as Sharing from 'expo-sharing'
import { ActivityIndicator, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { WebView } from 'react-native-webview'
import { supabase } from '../../lib/supabaseClient'
import { useTransportistas, useConductorsByTransportista } from '../conductors/useConductorsAdmin'
import { buildTicketHtml } from './ticketHtml'
import type { RootStackParamList } from '../../navigation/types'

type TicketRoute = RouteProp<RootStackParamList, 'Ticket'>

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function useWeighingById(id: string) {
  return useQuery({
    queryKey: ['weighing-by-id', id],
    queryFn: async () => {
      const { data, error } = await supabase.from('weighings').select('*').eq('id', id).single()
      if (error) throw error
      return data
    }
  })
}

export function TicketScreen(): React.JSX.Element {
  const { params } = useRoute<TicketRoute>()
  const { data: weighing, isLoading } = useWeighingById(params.weighingId)
  const { data: transportistas } = useTransportistas()
  const { data: conductors } = useConductorsByTransportista(weighing?.transportista_id ?? null)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  if (isLoading || !weighing) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    )
  }

  const transportista = transportistas?.find((t) => t.id === weighing.transportista_id)
  const conductorRut = conductors?.find((c) => c.nombre === weighing.conductor)?.rut
  const html = buildTicketHtml(weighing, transportista, conductorRut)

  async function handleShare(): Promise<void> {
    setError(null)
    setBusy(true)
    try {
      const { uri } = await Print.printToFileAsync({ html })
      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', dialogTitle: 'Ticket de pesaje' })
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo generar el ticket')
    } finally {
      setBusy(false)
    }
  }

  async function handlePrint(): Promise<void> {
    setError(null)
    setBusy(true)
    try {
      await Print.printAsync({ html })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo imprimir el ticket')
    } finally {
      setBusy(false)
    }
  }

  return (
    <View style={styles.screen}>
      <ScrollView style={styles.preview}>
        <WebView originWhitelist={['*']} source={{ html }} style={styles.webview} scrollEnabled={false} />
      </ScrollView>

      {error && <Text style={styles.error}>{error}</Text>}

      <View style={styles.actions}>
        <TouchableOpacity style={styles.buttonGhost} onPress={handlePrint} disabled={busy}>
          <Text style={styles.buttonGhostText}>Imprimir</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={handleShare} disabled={busy}>
          {busy ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Guardar / Compartir PDF</Text>}
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f4f5f7' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f4f5f7' },
  preview: { flex: 1, margin: 12, backgroundColor: '#fff', borderRadius: 10 },
  webview: { height: 700 },
  error: { color: '#c0392b', fontSize: 13, textAlign: 'center', marginBottom: 8 },
  actions: { flexDirection: 'row', gap: 10, padding: 16 },
  button: { flex: 1, backgroundColor: '#1f6feb', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '600' },
  buttonGhost: { paddingVertical: 12, paddingHorizontal: 16, justifyContent: 'center' },
  buttonGhostText: { color: '#444', fontWeight: '500' }
})
