import { useState } from 'react'
import { format } from 'date-fns'
import { useNavigation } from '@react-navigation/native'
import type { NativeStackNavigationProp } from '@react-navigation/native-stack'
import {
  ActivityIndicator,
  Alert,
  FlatList,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native'
import { useAuth } from '../../auth/AuthProvider'
import { useCompanyContext } from '../companies/CompanyContext'
import { CompanySelector } from '../companies/CompanySelector'
import { useTransportistas } from '../conductors/useConductorsAdmin'
import {
  useCreateWeighing,
  useDailySummary,
  useDailyWeighings,
  useDeleteWeighing,
  useMonthSummary,
  useUpdateWeighing
} from './useWeighings'
import { WeighingForm, type WeighingFormValues } from './WeighingForm'
import type { RootStackParamList } from '../../navigation/types'
import type { Database } from '../../types/database.types'

type Weighing = Database['public']['Tables']['weighings']['Row']
type Nav = NativeStackNavigationProp<RootStackParamList>

export function DailyEntryScreen(): React.JSX.Element {
  const navigation = useNavigation<Nav>()
  const { companyId, loading: companyLoading } = useCompanyContext()
  const { operator } = useAuth()
  const isViewer = !!operator?.is_viewer
  const [fecha, setFecha] = useState(() => format(new Date(), 'yyyy-MM-dd'))
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Weighing | null>(null)

  const { data: weighings, isLoading } = useDailyWeighings(companyId, fecha)
  const { data: dailySummary } = useDailySummary(companyId, fecha)
  const [year, month] = fecha.split('-').map(Number)
  const { data: monthSummary } = useMonthSummary(companyId, year, month)
  const { data: transportistas } = useTransportistas()
  const transportistaNameById = new Map(transportistas?.map((t) => [t.id, t.nombre]))

  const pending = weighings?.filter((w) => w.carga === null) ?? []
  const completed = (weighings?.filter((w) => w.carga !== null) ?? []).slice().reverse()

  const createMutation = useCreateWeighing(companyId, fecha)
  const updateMutation = useUpdateWeighing(companyId, fecha)
  const deleteMutation = useDeleteWeighing(companyId, fecha)

  function openNew(): void {
    setEditing(null)
    setFormOpen(true)
  }

  function openEdit(w: Weighing): void {
    setEditing(w)
    setFormOpen(true)
  }

  async function handleSubmit(values: WeighingFormValues): Promise<void> {
    const carga = values.peso_bruto > 0 ? values.peso_bruto - values.tara : null
    const payload = {
      hora_entrada: values.hora_entrada,
      hora_salida: values.hora_salida || null,
      transportista_id: values.transportista_id,
      conductor: values.conductor,
      patente: values.patente,
      n_guia: values.n_guia,
      producto: values.producto,
      tara: values.tara,
      peso_bruto: values.peso_bruto > 0 ? values.peso_bruto : null,
      carga,
      traslado: values.traslado || null
    }

    if (editing) {
      await updateMutation.mutateAsync({ id: editing.id, values: payload })
    } else {
      await createMutation.mutateAsync({
        company_id: companyId!,
        operator_id: operator!.id,
        fecha,
        ...payload
      })
    }
    setFormOpen(false)
  }

  function confirmDelete(id: string): void {
    Alert.alert('Eliminar pesaje', '¿Eliminar este registro de pesaje?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => deleteMutation.mutate(id) }
    ])
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
    <FlatList
      style={styles.screen}
      data={completed}
      keyExtractor={(w) => w.id}
      ListHeaderComponent={
        <View style={styles.headerArea}>
          <CompanySelector />

          <View style={styles.field}>
            <Text style={styles.label}>Fecha</Text>
            <TextInput style={styles.input} value={fecha} onChangeText={setFecha} placeholder="AAAA-MM-DD" />
          </View>

          {!isViewer && (
            <TouchableOpacity style={styles.button} onPress={openNew}>
              <Text style={styles.buttonText}>+ Agregar pesaje</Text>
            </TouchableOpacity>
          )}

          <View style={styles.summaryRow}>
            <SummaryCard label="Movimientos del día" value={dailySummary?.movimientos ?? 0} />
            <SummaryCard
              label="Carga del día (kg)"
              value={(dailySummary?.carga_total ?? 0).toLocaleString('es-CL')}
            />
            <SummaryCard
              label="Acumulado del mes (kg)"
              value={(monthSummary?.carga_total ?? 0).toLocaleString('es-CL')}
            />
          </View>

          {(isLoading || pending.length > 0) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>En Espera</Text>
              {isLoading && <ActivityIndicator />}
              {pending.map((w) => (
                <View key={w.id} style={[styles.card, styles.cardPending]}>
                  <WeighingCardBody w={w} transportistaName={transportistaNameById.get(w.transportista_id ?? '')} />
                  {!isViewer && (
                    <View style={styles.cardActions}>
                      <TouchableOpacity style={styles.actionButton} onPress={() => openEdit(w)}>
                        <Text style={styles.actionButtonText}>Agregar peso bruto</Text>
                      </TouchableOpacity>
                      <TouchableOpacity style={styles.actionButtonGhost} onPress={() => confirmDelete(w.id)}>
                        <Text style={styles.actionButtonGhostText}>Eliminar</Text>
                      </TouchableOpacity>
                    </View>
                  )}
                </View>
              ))}
            </View>
          )}

          <Text style={styles.sectionTitle}>Pesajes del Día</Text>
          {!isLoading && completed.length === 0 && (
            <Text style={styles.muted}>Sin pesajes completados para este día</Text>
          )}
        </View>
      }
      renderItem={({ item: w }) => (
        <View style={styles.card}>
          <WeighingCardBody
            w={w}
            transportistaName={transportistaNameById.get(w.transportista_id ?? '')}
            showNeto
          />
          {!isViewer && (
            <View style={styles.cardActions}>
              <TouchableOpacity
                style={styles.actionButtonGhost}
                onPress={() => navigation.navigate('Ticket', { weighingId: w.id })}
              >
                <Text style={styles.actionButtonGhostText}>Ticket</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButtonGhost} onPress={() => openEdit(w)}>
                <Text style={styles.actionButtonGhostText}>Editar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionButtonGhost} onPress={() => confirmDelete(w.id)}>
                <Text style={styles.actionButtonGhostText}>Eliminar</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
      contentContainerStyle={styles.listContent}
      ListFooterComponent={
        <WeighingForm
          open={formOpen}
          onOpenChange={setFormOpen}
          onSubmit={handleSubmit}
          editing={editing}
          submitting={createMutation.isPending || updateMutation.isPending}
          pendingConductors={pending.map((w) => w.conductor)}
          pendingPatentes={pending.map((w) => w.patente)}
        />
      }
    />
  )
}

function WeighingCardBody({
  w,
  transportistaName,
  showNeto
}: {
  w: Weighing
  transportistaName?: string
  showNeto?: boolean
}): React.JSX.Element {
  return (
    <View>
      <Text style={styles.cardTitle}>
        {w.patente} · {w.conductor}
      </Text>
      <Text style={styles.cardSub}>
        {transportistaName ?? '—'} · Guía {w.n_guia} · {w.producto ?? '—'}
      </Text>
      <Text style={styles.cardSub}>
        Entrada {w.hora_entrada.slice(0, 5)}
        {w.hora_salida ? ` · Salida ${w.hora_salida.slice(0, 5)}` : ''} · Traslado: {w.traslado ?? '—'}
      </Text>
      <Text style={styles.cardWeights}>
        Tara {w.tara?.toLocaleString('es-CL') ?? '—'} kg · Bruto {w.peso_bruto?.toLocaleString('es-CL') ?? '—'} kg
        {showNeto ? ` · Neto ${w.carga?.toLocaleString('es-CL') ?? '—'} kg` : ''}
      </Text>
    </View>
  )
}

function SummaryCard({ label, value }: { label: string; value: string | number }): React.JSX.Element {
  return (
    <View style={styles.summaryCard}>
      <Text style={styles.summaryLabel}>{label}</Text>
      <Text style={styles.summaryValue}>{value}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f4f5f7' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f4f5f7' },
  muted: { color: '#888', fontSize: 13 },
  listContent: { padding: 16, gap: 10 },
  headerArea: { gap: 12, marginBottom: 8 },
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '500', color: '#444' },
  input: {
    borderWidth: 1,
    borderColor: '#d8dadf',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    backgroundColor: '#fff'
  },
  button: { backgroundColor: '#1f6feb', borderRadius: 8, paddingVertical: 12, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: '600' },
  summaryRow: { flexDirection: 'row', gap: 8 },
  summaryCard: { flex: 1, backgroundColor: '#fff', borderRadius: 10, padding: 10 },
  summaryLabel: { fontSize: 11, color: '#888' },
  summaryValue: { fontSize: 16, fontWeight: '700', color: '#111' },
  section: { gap: 8 },
  sectionTitle: { fontSize: 14, fontWeight: '700', color: '#111', marginTop: 4 },
  card: { backgroundColor: '#fff', borderRadius: 10, padding: 12, gap: 8 },
  cardPending: { borderWidth: 1, borderColor: '#f0c36d' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#111' },
  cardSub: { fontSize: 12, color: '#666' },
  cardWeights: { fontSize: 13, fontWeight: '600', color: '#111' },
  cardActions: { flexDirection: 'row', gap: 8, flexWrap: 'wrap' },
  actionButton: { backgroundColor: '#1f6feb', borderRadius: 6, paddingVertical: 8, paddingHorizontal: 12 },
  actionButtonText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  actionButtonGhost: { paddingVertical: 8, paddingHorizontal: 10 },
  actionButtonGhostText: { color: '#1f6feb', fontSize: 12, fontWeight: '600' }
})
