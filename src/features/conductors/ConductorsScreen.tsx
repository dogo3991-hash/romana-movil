import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Picker } from '@react-native-picker/picker'
import {
  ActivityIndicator,
  Alert,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native'
import { useAuth } from '../../auth/AuthProvider'
import type { Database } from '../../types/database.types'
import {
  useAllConductors,
  useCreateConductor,
  useCreateTransportista,
  useDeleteConductor,
  useDeleteTransportista,
  useTransportistas,
  useUpdateConductor,
  useUpdateTransportista
} from './useConductorsAdmin'

type Transportista = Database['public']['Tables']['transportistas']['Row']

const transportistaSchema = z.object({
  nombre: z.string().min(1, 'Requerido'),
  rut: z.string().min(1, 'Requerido')
})
type TransportistaValues = z.infer<typeof transportistaSchema>

const conductorSchema = z.object({
  nombre: z.string().min(1, 'Requerido'),
  rut: z.string().min(1, 'Requerido'),
  transportista_id: z.string().min(1, 'Requerido')
})
type ConductorValues = z.infer<typeof conductorSchema>

export function ConductorsScreen(): React.JSX.Element {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <TransportistasSection />
      <ConductorsSection />
    </ScrollView>
  )
}

function TransportistasSection(): React.JSX.Element {
  const { operator } = useAuth()
  const isViewer = !!operator?.is_viewer
  const { data: transportistas, isLoading } = useTransportistas()
  const createMutation = useCreateTransportista()
  const updateMutation = useUpdateTransportista()
  const deleteMutation = useDeleteTransportista()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Transportista | null>(null)

  const { control, handleSubmit, reset } = useForm<TransportistaValues>({
    resolver: zodResolver(transportistaSchema),
    defaultValues: { nombre: '', rut: '' }
  })

  function openNew(): void {
    setEditing(null)
    reset({ nombre: '', rut: '' })
    setFormOpen(true)
  }

  function openEdit(t: Transportista): void {
    setEditing(t)
    reset({ nombre: t.nombre, rut: t.rut })
    setFormOpen(true)
  }

  async function submit(values: TransportistaValues): Promise<void> {
    if (editing) {
      await updateMutation.mutateAsync({ id: editing.id, values })
    } else {
      await createMutation.mutateAsync(values)
    }
    setFormOpen(false)
  }

  function confirmDelete(id: string): void {
    Alert.alert(
      'Eliminar transportista',
      '¿Eliminar este transportista? No se puede si tiene conductores asociados.',
      [
        { text: 'Cancelar', style: 'cancel' },
        { text: 'Eliminar', style: 'destructive', onPress: () => deleteMutation.mutate(id) }
      ]
    )
  }

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Transportistas</Text>
        {!isViewer && (
          <TouchableOpacity style={styles.buttonSmall} onPress={openNew}>
            <Text style={styles.buttonSmallText}>+ Agregar</Text>
          </TouchableOpacity>
        )}
      </View>

      {isLoading && <ActivityIndicator />}
      {!isLoading && transportistas?.length === 0 && (
        <Text style={styles.muted}>Sin transportistas cargados</Text>
      )}
      {transportistas?.map((t) => (
        <View key={t.id} style={styles.card}>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>{t.nombre}</Text>
            <Text style={styles.cardSub}>{t.rut}</Text>
          </View>
          {!isViewer && (
            <View style={styles.cardActions}>
              <TouchableOpacity style={styles.actionGhost} onPress={() => openEdit(t)}>
                <Text style={styles.actionGhostText}>Editar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionGhost} onPress={() => confirmDelete(t.id)}>
                <Text style={styles.actionGhostText}>Eliminar</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      ))}

      <Modal visible={formOpen} animationType="slide" onRequestClose={() => setFormOpen(false)}>
        <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
          <Text style={styles.formTitle}>{editing ? 'Editar transportista' : 'Nuevo transportista'}</Text>
          <FormField label="Nombre">
            <Controller
              control={control}
              name="nombre"
              render={({ field }) => (
                <TextInput style={styles.input} value={field.value} onChangeText={field.onChange} />
              )}
            />
          </FormField>
          <FormField label="Rut">
            <Controller
              control={control}
              name="rut"
              render={({ field }) => (
                <TextInput style={styles.input} value={field.value} onChangeText={field.onChange} />
              )}
            />
          </FormField>
          <FormActions
            onCancel={() => setFormOpen(false)}
            onSubmit={handleSubmit(submit)}
            submitting={createMutation.isPending || updateMutation.isPending}
          />
        </ScrollView>
      </Modal>
    </View>
  )
}

function ConductorsSection(): React.JSX.Element {
  const { operator } = useAuth()
  const isViewer = !!operator?.is_viewer
  const { data: conductors, isLoading } = useAllConductors()
  const { data: transportistas } = useTransportistas()
  const createMutation = useCreateConductor()
  const updateMutation = useUpdateConductor()
  const deleteMutation = useDeleteConductor()
  const [formOpen, setFormOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)

  const { control, handleSubmit, reset } = useForm<ConductorValues>({
    resolver: zodResolver(conductorSchema),
    defaultValues: { nombre: '', rut: '', transportista_id: '' }
  })

  function openNew(): void {
    setEditingId(null)
    reset({ nombre: '', rut: '', transportista_id: '' })
    setFormOpen(true)
  }

  function openEdit(c: { id: string; nombre: string; rut: string; transportista_id: string }): void {
    setEditingId(c.id)
    reset({ nombre: c.nombre, rut: c.rut, transportista_id: c.transportista_id })
    setFormOpen(true)
  }

  async function submit(values: ConductorValues): Promise<void> {
    if (editingId) {
      await updateMutation.mutateAsync({ id: editingId, values })
    } else {
      await createMutation.mutateAsync(values)
    }
    setFormOpen(false)
  }

  function confirmDelete(id: string): void {
    Alert.alert('Eliminar conductor', '¿Eliminar este conductor?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => deleteMutation.mutate(id) }
    ])
  }

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Conductores</Text>
        {!isViewer && (
          <TouchableOpacity style={styles.buttonSmall} onPress={openNew}>
            <Text style={styles.buttonSmallText}>+ Agregar</Text>
          </TouchableOpacity>
        )}
      </View>

      {isLoading && <ActivityIndicator />}
      {!isLoading && conductors?.length === 0 && <Text style={styles.muted}>Sin conductores cargados</Text>}
      {conductors?.map((c) => (
        <View key={c.id} style={styles.card}>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>{c.nombre}</Text>
            <Text style={styles.cardSub}>
              {c.rut} · {c.transportistas?.nombre ?? '—'}
            </Text>
          </View>
          {!isViewer && (
            <View style={styles.cardActions}>
              <TouchableOpacity
                style={styles.actionGhost}
                onPress={() => openEdit({ id: c.id, nombre: c.nombre, rut: c.rut, transportista_id: c.transportista_id })}
              >
                <Text style={styles.actionGhostText}>Editar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.actionGhost} onPress={() => confirmDelete(c.id)}>
                <Text style={styles.actionGhostText}>Eliminar</Text>
              </TouchableOpacity>
            </View>
          )}
        </View>
      ))}

      <Modal visible={formOpen} animationType="slide" onRequestClose={() => setFormOpen(false)}>
        <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
          <Text style={styles.formTitle}>{editingId ? 'Editar conductor' : 'Nuevo conductor'}</Text>
          <FormField label="Nombre">
            <Controller
              control={control}
              name="nombre"
              render={({ field }) => (
                <TextInput style={styles.input} value={field.value} onChangeText={field.onChange} />
              )}
            />
          </FormField>
          <FormField label="Rut">
            <Controller
              control={control}
              name="rut"
              render={({ field }) => (
                <TextInput style={styles.input} value={field.value} onChangeText={field.onChange} />
              )}
            />
          </FormField>
          <FormField label="Transportista">
            <Controller
              control={control}
              name="transportista_id"
              render={({ field }) => (
                <View style={styles.pickerWrap}>
                  <Picker selectedValue={field.value} onValueChange={field.onChange}>
                    <Picker.Item label="Seleccionar" value="" />
                    {transportistas?.map((t) => (
                      <Picker.Item key={t.id} label={t.nombre} value={t.id} />
                    ))}
                  </Picker>
                </View>
              )}
            />
          </FormField>
          <FormActions
            onCancel={() => setFormOpen(false)}
            onSubmit={handleSubmit(submit)}
            submitting={createMutation.isPending || updateMutation.isPending}
          />
        </ScrollView>
      </Modal>
    </View>
  )
}

function FormField({ label, children }: { label: string; children: React.ReactNode }): React.JSX.Element {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
    </View>
  )
}

function FormActions({
  onCancel,
  onSubmit,
  submitting
}: {
  onCancel: () => void
  onSubmit: () => void
  submitting: boolean
}): React.JSX.Element {
  return (
    <View style={styles.formActions}>
      <TouchableOpacity style={styles.buttonGhost} onPress={onCancel}>
        <Text style={styles.buttonGhostText}>Cancelar</Text>
      </TouchableOpacity>
      <TouchableOpacity style={[styles.button, submitting && styles.buttonDisabled]} onPress={onSubmit} disabled={submitting}>
        {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Guardar</Text>}
      </TouchableOpacity>
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 16, gap: 12 },
  section: { gap: 10, marginBottom: 24 },
  sectionHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: '#111' },
  muted: { color: '#888', fontSize: 13 },
  card: { backgroundColor: '#fff', borderRadius: 10, padding: 12, gap: 6, borderWidth: 1, borderColor: '#eee' },
  cardBody: { gap: 2 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#111' },
  cardSub: { fontSize: 12, color: '#666' },
  cardActions: { flexDirection: 'row', gap: 8 },
  actionGhost: { paddingVertical: 6, paddingHorizontal: 8 },
  actionGhostText: { color: '#1f6feb', fontSize: 12, fontWeight: '600' },
  buttonSmall: { backgroundColor: '#1f6feb', borderRadius: 6, paddingVertical: 6, paddingHorizontal: 10 },
  buttonSmallText: { color: '#fff', fontSize: 12, fontWeight: '600' },
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
  pickerWrap: { borderWidth: 1, borderColor: '#d8dadf', borderRadius: 8, overflow: 'hidden' },
  formTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8, color: '#111' },
  formActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 10 },
  button: { backgroundColor: '#1f6feb', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 20 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: '600' },
  buttonGhost: { paddingVertical: 12, paddingHorizontal: 16 },
  buttonGhostText: { color: '#444', fontWeight: '500' }
})
