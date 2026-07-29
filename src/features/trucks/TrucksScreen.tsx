import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
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
import { AppPicker } from '../../components/AppPicker'
import { useAuth } from '../../auth/AuthProvider'
import { useCompanyContext } from '../companies/CompanyContext'
import { CompanySelector } from '../companies/CompanySelector'
import { useTransportistas } from '../conductors/useConductorsAdmin'
import type { Database } from '../../types/database.types'
import { useAllTrucks, useCreateTruck, useDeleteTruck, useUpdateTruck } from './useTrucksAdmin'
import { useCreateTraslado, useDeleteTraslado, useTraslados, useUpdateTraslado } from './useTraslados'

type Truck = Database['public']['Tables']['trucks']['Row']
type Traslado = Database['public']['Tables']['traslados']['Row']

const truckSchema = z.object({
  patente: z.string().min(1, 'Requerido'),
  tara: z.coerce.number().int().positive('Debe ser mayor a 0'),
  transportista_id: z.string().min(1, 'Requerido')
})
type TruckValues = z.output<typeof truckSchema>
type TruckFormInput = z.input<typeof truckSchema>

const trasladoSchema = z.object({ nombre: z.string().min(1, 'Requerido') })
type TrasladoValues = z.infer<typeof trasladoSchema>

export function TrucksScreen(): React.JSX.Element {
  return (
    <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
      <TrucksSection />
      <TrasladosSection />
    </ScrollView>
  )
}

function TrucksSection(): React.JSX.Element {
  const { operator } = useAuth()
  const isViewer = !!operator?.is_viewer
  const { data: trucks, isLoading } = useAllTrucks()
  const { data: transportistas } = useTransportistas()
  const createMutation = useCreateTruck()
  const updateMutation = useUpdateTruck()
  const deleteMutation = useDeleteTruck()
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Truck | null>(null)

  const { control, handleSubmit, reset } = useForm<TruckFormInput, unknown, TruckValues>({
    resolver: zodResolver(truckSchema),
    defaultValues: { patente: '', tara: '' as unknown as number, transportista_id: '' }
  })

  function openNew(): void {
    setEditing(null)
    reset({ patente: '', tara: '' as unknown as number, transportista_id: '' })
    setFormOpen(true)
  }

  function openEdit(t: Truck): void {
    setEditing(t)
    reset({ patente: t.patente, tara: t.tara as unknown as number, transportista_id: t.transportista_id ?? '' })
    setFormOpen(true)
  }

  async function submit(values: TruckValues): Promise<void> {
    if (editing) {
      await updateMutation.mutateAsync({ id: editing.id, values })
    } else {
      await createMutation.mutateAsync(values)
    }
    setFormOpen(false)
  }

  function confirmDelete(id: string): void {
    Alert.alert('Eliminar camión', '¿Eliminar este camión?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => deleteMutation.mutate(id) }
    ])
  }

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Camiones</Text>
        {!isViewer && (
          <TouchableOpacity style={styles.buttonSmall} onPress={openNew}>
            <Text style={styles.buttonSmallText}>+ Agregar</Text>
          </TouchableOpacity>
        )}
      </View>

      {isLoading && <ActivityIndicator />}
      {!isLoading && trucks?.length === 0 && <Text style={styles.muted}>Sin camiones cargados</Text>}
      {trucks?.map((t) => (
        <View key={t.id} style={styles.card}>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>{t.patente}</Text>
            <Text style={styles.cardSub}>
              Tara {t.tara.toLocaleString('es-CL')} kg · {t.transportistas?.nombre ?? 'Sin asignar'}
            </Text>
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
          <Text style={styles.formTitle}>{editing ? 'Editar camión' : 'Nuevo camión'}</Text>
          <FormField label="Patente">
            <Controller
              control={control}
              name="patente"
              render={({ field }) => (
                <TextInput style={styles.input} value={field.value} onChangeText={field.onChange} />
              )}
            />
          </FormField>
          <FormField label="Tara (kg)">
            <Controller
              control={control}
              name="tara"
              render={({ field }) => (
                <TextInput
                  style={styles.input}
                  keyboardType="numeric"
                  value={String(field.value ?? '')}
                  onChangeText={field.onChange}
                />
              )}
            />
          </FormField>
          <FormField label="Transportista">
            <Controller
              control={control}
              name="transportista_id"
              render={({ field }) => (
                <AppPicker
                  selectedValue={field.value}
                  onValueChange={field.onChange}
                  items={transportistas?.map((t) => ({ label: t.nombre, value: t.id })) ?? []}
                />
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

function TrasladosSection(): React.JSX.Element {
  const { operator } = useAuth()
  const isViewer = !!operator?.is_viewer
  const { companyId } = useCompanyContext()
  const { data: traslados, isLoading } = useTraslados(companyId)
  const createMutation = useCreateTraslado(companyId)
  const updateMutation = useUpdateTraslado(companyId)
  const deleteMutation = useDeleteTraslado(companyId)
  const [formOpen, setFormOpen] = useState(false)
  const [editing, setEditing] = useState<Traslado | null>(null)

  const { control, handleSubmit, reset } = useForm<TrasladoValues>({
    resolver: zodResolver(trasladoSchema),
    defaultValues: { nombre: '' }
  })

  function openNew(): void {
    setEditing(null)
    reset({ nombre: '' })
    setFormOpen(true)
  }

  function openEdit(t: Traslado): void {
    setEditing(t)
    reset({ nombre: t.nombre })
    setFormOpen(true)
  }

  async function submit(values: TrasladoValues): Promise<void> {
    if (editing) {
      await updateMutation.mutateAsync({ id: editing.id, nombre: values.nombre })
    } else {
      await createMutation.mutateAsync(values.nombre)
    }
    setFormOpen(false)
  }

  function confirmDelete(id: string): void {
    Alert.alert('Eliminar traslado', '¿Eliminar este lugar de traslado?', [
      { text: 'Cancelar', style: 'cancel' },
      { text: 'Eliminar', style: 'destructive', onPress: () => deleteMutation.mutate(id) }
    ])
  }

  return (
    <View style={styles.section}>
      <View style={styles.sectionHeader}>
        <Text style={styles.sectionTitle}>Traslados</Text>
        {!isViewer && (
          <TouchableOpacity style={styles.buttonSmall} onPress={openNew} disabled={!companyId}>
            <Text style={styles.buttonSmallText}>+ Agregar</Text>
          </TouchableOpacity>
        )}
      </View>

      <CompanySelector />

      {isLoading && <ActivityIndicator />}
      {!isLoading && traslados?.length === 0 && (
        <Text style={styles.muted}>Sin lugares de traslado cargados</Text>
      )}
      {traslados?.map((t) => (
        <View key={t.id} style={styles.card}>
          <View style={styles.cardBody}>
            <Text style={styles.cardTitle}>{t.nombre}</Text>
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
          <Text style={styles.formTitle}>{editing ? 'Editar traslado' : 'Nuevo traslado'}</Text>
          <FormField label="Lugar">
            <Controller
              control={control}
              name="nombre"
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
  formTitle: { fontSize: 18, fontWeight: '700', marginBottom: 8, color: '#111' },
  formActions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 10 },
  button: { backgroundColor: '#1f6feb', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 20 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: '600' },
  buttonGhost: { paddingVertical: 12, paddingHorizontal: 16 },
  buttonGhostText: { color: '#444', fontWeight: '500' }
})
