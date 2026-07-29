import { useState } from 'react'
import { Alert, Modal, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native'
import { useAuth } from '../../auth/AuthProvider'
import { useTransportistas } from '../conductors/useConductorsAdmin'
import { useDailyWeighings, useDeleteWeighing, useUpdateWeighing } from '../daily-entry/useWeighings'
import { WeighingForm, type WeighingFormValues } from '../daily-entry/WeighingForm'
import type { Database } from '../../types/database.types'

type Weighing = Database['public']['Tables']['weighings']['Row']

interface DayDetailDialogProps {
  companyId: string | null
  fecha: string | null
  onOpenChange: (open: boolean) => void
}

export function DayDetailDialog({ companyId, fecha, onOpenChange }: DayDetailDialogProps): React.JSX.Element {
  const { operator } = useAuth()
  const isViewer = !!operator?.is_viewer
  const [editing, setEditing] = useState<Weighing | null>(null)
  const [formOpen, setFormOpen] = useState(false)

  const { data: weighings, isLoading } = useDailyWeighings(companyId, fecha ?? '')
  const { data: transportistas } = useTransportistas()
  const transportistaNameById = new Map(transportistas?.map((t) => [t.id, t.nombre]))

  const updateMutation = useUpdateWeighing(companyId, fecha ?? '')
  const deleteMutation = useDeleteWeighing(companyId, fecha ?? '')

  function openEdit(w: Weighing): void {
    setEditing(w)
    setFormOpen(true)
  }

  async function handleSubmit(values: WeighingFormValues): Promise<void> {
    if (!editing) return
    const carga = values.peso_bruto > 0 ? values.peso_bruto - values.tara : null
    await updateMutation.mutateAsync({
      id: editing.id,
      values: {
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
    })
    setFormOpen(false)
  }

  function confirmDelete(id: string): void {
    Alert.alert('Eliminar pesaje', '¿Eliminar este registro de pesaje?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => deleteMutation.mutate(id) }
    ])
  }

  return (
    <Modal visible={fecha !== null} animationType="slide" onRequestClose={() => onOpenChange(false)}>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <Text style={styles.title}>Pesajes del {fecha}</Text>
          <TouchableOpacity onPress={() => onOpenChange(false)}>
            <Text style={styles.close}>Cerrar</Text>
          </TouchableOpacity>
        </View>

        {isLoading && <Text style={styles.muted}>Cargando...</Text>}
        {!isLoading && (weighings?.length ?? 0) === 0 && (
          <Text style={styles.muted}>Sin pesajes para este día</Text>
        )}

        {weighings?.map((w) => (
          <View key={w.id} style={styles.card}>
            <Text style={styles.cardTitle}>
              {w.patente} · {w.conductor}
            </Text>
            <Text style={styles.cardSub}>
              {w.transportista_id ? (transportistaNameById.get(w.transportista_id) ?? '—') : '—'} · Guía{' '}
              {w.n_guia} · {w.producto ?? '—'}
            </Text>
            <Text style={styles.cardSub}>
              Entrada {w.hora_entrada.slice(0, 5)}
              {w.hora_salida ? ` · Salida ${w.hora_salida.slice(0, 5)}` : ''} · Traslado: {w.traslado ?? '—'}
            </Text>
            <Text style={styles.cardWeights}>
              Tara {w.tara?.toLocaleString('es-CL') ?? '—'} kg · Bruto{' '}
              {w.peso_bruto?.toLocaleString('es-CL') ?? '—'} kg · Neto {w.carga?.toLocaleString('es-CL') ?? '—'} kg
            </Text>
            {!isViewer && (
              <View style={styles.cardActions}>
                <TouchableOpacity style={styles.actionGhost} onPress={() => openEdit(w)}>
                  <Text style={styles.actionGhostText}>Editar</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.actionGhost} onPress={() => confirmDelete(w.id)}>
                  <Text style={styles.actionGhostText}>Eliminar</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        ))}
      </ScrollView>

      <WeighingForm
        open={formOpen}
        onOpenChange={setFormOpen}
        onSubmit={handleSubmit}
        editing={editing}
        submitting={updateMutation.isPending}
        pendingConductors={[]}
        pendingPatentes={[]}
      />
    </Modal>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f4f5f7' },
  content: { padding: 16, gap: 10 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  title: { fontSize: 17, fontWeight: '700', color: '#111' },
  close: { color: '#1f6feb', fontWeight: '600' },
  muted: { color: '#888', fontSize: 13 },
  card: { backgroundColor: '#fff', borderRadius: 10, padding: 12, gap: 6, borderWidth: 1, borderColor: '#eee' },
  cardTitle: { fontSize: 15, fontWeight: '700', color: '#111' },
  cardSub: { fontSize: 12, color: '#666' },
  cardWeights: { fontSize: 13, fontWeight: '600', color: '#111' },
  cardActions: { flexDirection: 'row', gap: 8 },
  actionGhost: { paddingVertical: 6, paddingHorizontal: 8 },
  actionGhostText: { color: '#1f6feb', fontSize: 12, fontWeight: '600' }
})
