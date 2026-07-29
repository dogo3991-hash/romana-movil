import { useState } from 'react'
import { format } from 'date-fns'
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { useCompanyContext } from '../companies/CompanyContext'
import { CompanySelector } from '../companies/CompanySelector'
import { useTransportistas } from '../conductors/useConductorsAdmin'
import { useWeighingsInRange } from './useReportsData'
import { exportWeighingsReport } from './exportCsv'

export function ReportsScreen(): React.JSX.Element {
  const { companyId, companies, loading: companyLoading } = useCompanyContext()
  const [from, setFrom] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  const [to, setTo] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const weighingsQuery = useWeighingsInRange(companyId, from, to)
  const { data: transportistas } = useTransportistas()
  const companyName = companies.find((c) => c.id === companyId)?.name ?? ''

  async function handleExport(): Promise<void> {
    setError(null)
    setExporting(true)
    try {
      const { data, error: queryError } = await weighingsQuery.refetch()
      if (queryError) throw queryError
      if (!data || data.length === 0) {
        setError('No hay pesajes registrados en ese rango de fechas.')
        return
      }
      await exportWeighingsReport(data, companyName, from, to, transportistas ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo generar el informe')
    } finally {
      setExporting(false)
    }
  }

  if (companyLoading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator />
      </View>
    )
  }

  if (!companyId) {
    return (
      <View style={styles.center}>
        <Text style={styles.muted}>Selecciona una empresa para comenzar</Text>
      </View>
    )
  }

  return (
    <View style={styles.screen}>
      <CompanySelector />

      <View style={styles.card}>
        <Text style={styles.title}>Detalle de Pesajes</Text>
        <Text style={styles.subtitle}>
          Una fila por viaje. Elige un mismo día para un reporte diario, o un rango más amplio para uno mensual.
        </Text>

        <View style={styles.field}>
          <Text style={styles.label}>Desde</Text>
          <TextInput style={styles.input} value={from} onChangeText={setFrom} placeholder="AAAA-MM-DD" />
        </View>
        <View style={styles.field}>
          <Text style={styles.label}>Hasta</Text>
          <TextInput style={styles.input} value={to} onChangeText={setTo} placeholder="AAAA-MM-DD" />
        </View>

        {error && <Text style={styles.error}>{error}</Text>}

        <TouchableOpacity style={[styles.button, exporting && styles.buttonDisabled]} onPress={handleExport} disabled={exporting}>
          {exporting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Exportar y compartir</Text>}
        </TouchableOpacity>
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f4f5f7', padding: 16, gap: 12 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f4f5f7' },
  muted: { color: '#888', fontSize: 13 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, gap: 12 },
  title: { fontSize: 16, fontWeight: '700', color: '#111' },
  subtitle: { fontSize: 13, color: '#666' },
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '500', color: '#444' },
  input: {
    borderWidth: 1,
    borderColor: '#d8dadf',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15
  },
  error: { color: '#c0392b', fontSize: 13 },
  button: { backgroundColor: '#1f6feb', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: '600' }
})
