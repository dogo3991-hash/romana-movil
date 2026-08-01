import { useMemo, useState } from 'react'
import { format } from 'date-fns'
import { ActivityIndicator, ScrollView, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { useCompanyContext } from '../companies/CompanyContext'
import { CompanySelector } from '../companies/CompanySelector'
import { useTransportistas } from '../conductors/useConductorsAdmin'
import { useWeighingsInRange } from './useReportsData'
import { exportWeighingsReport } from './exportCsv'
import type { Database } from '../../types/database.types'

type Weighing = Database['public']['Tables']['weighings']['Row']

interface PatenteSummaryRow {
  patente: string
  viajes: number
  kg: number
}

function buildPatenteSummary(rows: Weighing[]): PatenteSummaryRow[] {
  const totals = new Map<string, PatenteSummaryRow>()

  for (const w of rows) {
    const patente = w.patente ?? 'Sin patente'
    const row = totals.get(patente) ?? { patente, viajes: 0, kg: 0 }
    row.viajes += 1
    row.kg += w.carga ?? 0
    totals.set(patente, row)
  }

  return [...totals.values()].sort((a, b) => a.patente.localeCompare(b.patente))
}

export function ReportsScreen(): React.JSX.Element {
  const { companyId, companies, loading: companyLoading } = useCompanyContext()
  const [from, setFrom] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  const [to, setTo] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  const [exporting, setExporting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const weighingsQuery = useWeighingsInRange(companyId, from, to)
  const { data: transportistas } = useTransportistas()
  const companyName = companies.find((c) => c.id === companyId)?.name ?? ''

  const patenteSummary = useMemo(
    () => buildPatenteSummary(weighingsQuery.data ?? []),
    [weighingsQuery.data]
  )
  const totalViajes = patenteSummary.reduce((sum, r) => sum + r.viajes, 0)
  const totalKg = patenteSummary.reduce((sum, r) => sum + r.kg, 0)

  async function handleBuscar(): Promise<void> {
    setError(null)
    const { error: queryError } = await weighingsQuery.refetch()
    if (queryError) setError(queryError.message)
  }

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
    <ScrollView style={styles.screen} contentContainerStyle={styles.screenContent}>
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

        <TouchableOpacity
          style={[styles.buttonSecondary, weighingsQuery.isFetching && styles.buttonDisabled]}
          onPress={handleBuscar}
          disabled={weighingsQuery.isFetching}
        >
          {weighingsQuery.isFetching ? (
            <ActivityIndicator color="#1f6feb" />
          ) : (
            <Text style={styles.buttonSecondaryText}>Ver resumen por patente</Text>
          )}
        </TouchableOpacity>

        <TouchableOpacity style={[styles.button, exporting && styles.buttonDisabled]} onPress={handleExport} disabled={exporting}>
          {exporting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Exportar y compartir</Text>}
        </TouchableOpacity>
      </View>

      {weighingsQuery.isFetched && (
        <View style={styles.card}>
          <Text style={styles.title}>Resumen por Patente</Text>
          <Text style={styles.subtitle}>
            {from === to ? `Día ${from}` : `${from} a ${to}`}
          </Text>

          {patenteSummary.length === 0 ? (
            <Text style={styles.muted}>No hay pesajes registrados en ese rango de fechas.</Text>
          ) : (
            <View style={styles.table}>
              <View style={styles.tableRowHeader}>
                <Text style={[styles.tableCell, styles.tableCellPatente, styles.tableHeaderText]}>Patente</Text>
                <Text style={[styles.tableCell, styles.tableCellViajes, styles.tableHeaderText]}>Viajes</Text>
                <Text style={[styles.tableCell, styles.tableCellKg, styles.tableHeaderText]}>Kg Totales</Text>
              </View>
              {patenteSummary.map((row) => (
                <View key={row.patente} style={styles.tableRow}>
                  <Text style={[styles.tableCell, styles.tableCellPatente]}>{row.patente}</Text>
                  <Text style={[styles.tableCell, styles.tableCellViajes]}>{row.viajes}</Text>
                  <Text style={[styles.tableCell, styles.tableCellKg]}>{row.kg.toLocaleString('es-CL')}</Text>
                </View>
              ))}
              <View style={[styles.tableRow, styles.tableRowTotal]}>
                <Text style={[styles.tableCell, styles.tableCellPatente, styles.tableTotalText]}>Total</Text>
                <Text style={[styles.tableCell, styles.tableCellViajes, styles.tableTotalText]}>{totalViajes}</Text>
                <Text style={[styles.tableCell, styles.tableCellKg, styles.tableTotalText]}>
                  {totalKg.toLocaleString('es-CL')}
                </Text>
              </View>
            </View>
          )}
        </View>
      )}
    </ScrollView>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f4f5f7' },
  screenContent: { padding: 16, gap: 12 },
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
  buttonSecondary: {
    borderWidth: 1,
    borderColor: '#1f6feb',
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: 'center'
  },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: '600' },
  buttonSecondaryText: { color: '#1f6feb', fontWeight: '600' },
  table: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, overflow: 'hidden' },
  tableRow: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: '#e5e7eb'
  },
  tableRowHeader: { flexDirection: 'row', backgroundColor: '#f4f5f7' },
  tableRowTotal: { backgroundColor: '#f4f5f7' },
  tableCell: { paddingVertical: 10, paddingHorizontal: 8, fontSize: 13, color: '#111' },
  tableCellPatente: { flex: 1.2 },
  tableCellViajes: { flex: 0.8, textAlign: 'right' },
  tableCellKg: { flex: 1, textAlign: 'right' },
  tableHeaderText: { fontWeight: '700', color: '#444', fontSize: 12 },
  tableTotalText: { fontWeight: '700' }
})
