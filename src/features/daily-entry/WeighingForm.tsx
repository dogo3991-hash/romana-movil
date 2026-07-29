import { useEffect, useState } from 'react'
import { Controller, useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import AsyncStorage from '@react-native-async-storage/async-storage'
import DateTimePicker from '@react-native-community/datetimepicker'
import { Picker } from '@react-native-picker/picker'
import {
  ActivityIndicator,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from 'react-native'
import { useCompanyContext } from '../companies/CompanyContext'
import { useTransportistas, useConductorsByTransportista } from '../conductors/useConductorsAdmin'
import { useTrucksByTransportista } from '../trucks/useTrucksAdmin'
import { useTraslados } from '../trucks/useTraslados'
import { useLastGuia } from './useWeighings'
import type { Database } from '../../types/database.types'

type Weighing = Database['public']['Tables']['weighings']['Row']

const PRODUCTOS = ['Min. Bellavista Open 1', 'Min. Bellavista Open 2', 'Gravilla', 'Otro']

function nextGuia(last: string): string {
  const match = last.match(/^(.*?)(\d+)$/)
  if (!match) return ''
  const [, prefix, digits] = match
  const incremented = (BigInt(digits) + 1n).toString().padStart(digits.length, '0')
  return prefix + incremented
}

const schema = z
  .object({
    hora_entrada: z.string().min(1, 'Requerido'),
    hora_salida: z.string().optional(),
    transportista_id: z.string().min(1, 'Requerido'),
    conductor: z.string().min(1, 'Requerido'),
    patente: z.string().min(1, 'Requerido'),
    n_guia: z.string().min(1, 'Requerido'),
    producto: z.string().min(1, 'Requerido'),
    tara: z.coerce.number().int('Debe ser un número entero').positive('Debe ser mayor a 0'),
    peso_bruto: z.coerce.number().int('Debe ser un número entero').min(0),
    traslado: z.string().optional()
  })
  .refine((data) => data.peso_bruto === 0 || data.peso_bruto > data.tara, {
    message: 'El peso bruto debe ser mayor que la tara',
    path: ['peso_bruto']
  })
  .refine((data) => data.peso_bruto === 0 || !!data.hora_salida, {
    message: 'Requerido al completar el pesaje',
    path: ['hora_salida']
  })

export type WeighingFormValues = z.output<typeof schema>
type WeighingFormInput = z.input<typeof schema>

interface WeighingFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSubmit: (values: WeighingFormValues) => Promise<void>
  editing: Weighing | null
  submitting: boolean
  pendingConductors: string[]
  pendingPatentes: string[]
}

function nowHHMM(): string {
  const now = new Date()
  return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`
}

function emptyValues(): WeighingFormInput {
  return {
    hora_entrada: nowHHMM(),
    hora_salida: '',
    transportista_id: '',
    conductor: '',
    patente: '',
    n_guia: '',
    producto: '',
    tara: '' as unknown as number,
    peso_bruto: '' as unknown as number,
    traslado: ''
  }
}

async function getLastTraslado(companyId: string | null): Promise<string> {
  if (!companyId) return ''
  try {
    return (await AsyncStorage.getItem(`lastTraslado:${companyId}`)) ?? ''
  } catch {
    return ''
  }
}

async function setLastTraslado(companyId: string | null, traslado: string): Promise<void> {
  if (!companyId || !traslado) return
  try {
    await AsyncStorage.setItem(`lastTraslado:${companyId}`, traslado)
  } catch {
    // no crítico
  }
}

export function WeighingForm({
  open,
  onOpenChange,
  onSubmit,
  editing,
  submitting,
  pendingConductors,
  pendingPatentes
}: WeighingFormProps): React.JSX.Element {
  const {
    control,
    handleSubmit,
    reset,
    setValue,
    watch,
    formState: { errors }
  } = useForm<WeighingFormInput, unknown, WeighingFormValues>({
    resolver: zodResolver(schema),
    defaultValues: emptyValues()
  })

  const { companyId } = useCompanyContext()
  const { refetch: refetchLastGuia } = useLastGuia()
  const [timePicker, setTimePicker] = useState<'hora_entrada' | 'hora_salida' | null>(null)

  useEffect(() => {
    if (!open) return
    if (editing) {
      reset({
        hora_entrada: editing.hora_entrada.slice(0, 5),
        hora_salida: editing.hora_salida?.slice(0, 5) ?? (editing.carga === null ? nowHHMM() : ''),
        transportista_id: editing.transportista_id ?? '',
        conductor: editing.conductor,
        patente: editing.patente,
        n_guia: editing.n_guia,
        producto: editing.producto ?? '',
        tara: (editing.tara ?? '') as unknown as number,
        peso_bruto: (editing.peso_bruto ?? '') as unknown as number,
        traslado: editing.traslado ?? ''
      })
    } else {
      reset(emptyValues())
      refetchLastGuia().then(({ data }) => {
        if (data) setValue('n_guia', nextGuia(data))
      })
      getLastTraslado(companyId).then((value) => {
        if (value) setValue('traslado', value)
      })
    }
  }, [open, editing, reset, setValue, refetchLastGuia, companyId])

  const transportistaId = watch('transportista_id')
  const { data: transportistas } = useTransportistas()
  const { data: conductors } = useConductorsByTransportista(transportistaId || null)
  const { data: trucks } = useTrucksByTransportista(transportistaId || null)
  const { data: traslados } = useTraslados(companyId)

  const conductorOptions = editing
    ? conductors
    : conductors?.filter((c) => !pendingConductors.includes(c.nombre))
  const patenteOptions = editing
    ? trucks
    : trucks?.filter((t) => !pendingPatentes.includes(t.patente))

  function handlePatenteChange(patente: string, onChange: (v: string) => void): void {
    onChange(patente)
    const truck = trucks?.find((t) => t.patente === patente)
    if (truck) setValue('tara', truck.tara as unknown as number)
  }

  const pesoBruto = Number(watch('peso_bruto')) || 0
  const tara = Number(watch('tara')) || 0
  const neto = pesoBruto > 0 && tara > 0 && pesoBruto > tara ? pesoBruto - tara : null

  async function submit(values: WeighingFormValues): Promise<void> {
    await onSubmit(values)
    setLastTraslado(companyId, values.traslado ?? '')
  }

  return (
    <Modal visible={open} animationType="slide" onRequestClose={() => onOpenChange(false)}>
      <ScrollView style={styles.screen} contentContainerStyle={styles.content}>
        <Text style={styles.title}>
          {!editing ? 'Nuevo pesaje (en espera)' : editing.carga === null ? 'Completar pesaje' : 'Editar pesaje'}
        </Text>

        <Field label="Transportista" error={errors.transportista_id?.message}>
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
        </Field>

        <Field label="Hora Entrada" error={errors.hora_entrada?.message}>
          <Controller
            control={control}
            name="hora_entrada"
            render={({ field }) => (
              <TimeField value={field.value} onPress={() => setTimePicker('hora_entrada')} />
            )}
          />
        </Field>

        <Field label="Conductor" error={errors.conductor?.message}>
          <Controller
            control={control}
            name="conductor"
            render={({ field }) => (
              <View style={styles.pickerWrap}>
                <Picker selectedValue={field.value} onValueChange={field.onChange} enabled={!!transportistaId}>
                  <Picker.Item
                    label={!transportistaId ? 'Elige un transportista primero' : 'Seleccionar'}
                    value=""
                  />
                  {conductorOptions?.map((c) => (
                    <Picker.Item key={c.nombre} label={c.nombre} value={c.nombre} />
                  ))}
                </Picker>
              </View>
            )}
          />
        </Field>

        <Field label="N° Guía" error={errors.n_guia?.message}>
          <Controller
            control={control}
            name="n_guia"
            render={({ field }) => (
              <TextInput style={styles.input} value={field.value} onChangeText={field.onChange} />
            )}
          />
        </Field>

        <Field label="Producto" error={errors.producto?.message}>
          <Controller
            control={control}
            name="producto"
            render={({ field }) => (
              <View style={styles.pickerWrap}>
                <Picker selectedValue={field.value} onValueChange={field.onChange}>
                  <Picker.Item label="Seleccionar" value="" />
                  {PRODUCTOS.map((p) => (
                    <Picker.Item key={p} label={p} value={p} />
                  ))}
                </Picker>
              </View>
            )}
          />
        </Field>

        <Field label="Patente" error={errors.patente?.message}>
          <Controller
            control={control}
            name="patente"
            render={({ field }) => (
              <View style={styles.pickerWrap}>
                <Picker
                  selectedValue={field.value}
                  onValueChange={(v) => handlePatenteChange(v, field.onChange)}
                  enabled={!!transportistaId}
                >
                  <Picker.Item
                    label={!transportistaId ? 'Elige un transportista primero' : 'Seleccionar'}
                    value=""
                  />
                  {patenteOptions?.map((t) => (
                    <Picker.Item key={t.patente} label={t.patente} value={t.patente} />
                  ))}
                </Picker>
              </View>
            )}
          />
        </Field>

        <Field label="Traslado" error={errors.traslado?.message}>
          <Controller
            control={control}
            name="traslado"
            render={({ field }) => (
              <View style={styles.pickerWrap}>
                <Picker selectedValue={field.value ?? ''} onValueChange={field.onChange}>
                  <Picker.Item label="Seleccionar" value="" />
                  {traslados?.map((t) => (
                    <Picker.Item key={t.id} label={t.nombre} value={t.nombre} />
                  ))}
                </Picker>
              </View>
            )}
          />
        </Field>

        <Field label="Peso Bruto (kg)" error={errors.peso_bruto?.message}>
          <Controller
            control={control}
            name="peso_bruto"
            render={({ field }) => (
              <TextInput
                style={[styles.input, styles.pesoInput, !editing && styles.inputDisabled]}
                keyboardType="numeric"
                editable={!!editing}
                value={String(field.value ?? '')}
                onChangeText={field.onChange}
              />
            )}
          />
          {!editing && (
            <Text style={styles.hint}>Se completa después, cuando el camión pase por la báscula.</Text>
          )}
        </Field>

        <Field label="Hora Salida" error={errors.hora_salida?.message}>
          <Controller
            control={control}
            name="hora_salida"
            render={({ field }) => (
              <TimeField
                value={field.value}
                disabled={!editing}
                onPress={() => editing && setTimePicker('hora_salida')}
              />
            )}
          />
        </Field>

        <Field label="Tara (kg)">
          <Controller
            control={control}
            name="tara"
            render={({ field }) => (
              <TextInput
                style={[styles.input, styles.inputDisabled]}
                editable={false}
                value={String(field.value ?? '')}
              />
            )}
          />
        </Field>

        <Field label="Peso Neto (kg)">
          <TextInput
            style={[styles.input, styles.inputDisabled]}
            editable={false}
            value={neto !== null ? neto.toLocaleString('es-CL') : '—'}
          />
        </Field>

        <View style={styles.actions}>
          <TouchableOpacity style={styles.buttonGhost} onPress={() => onOpenChange(false)}>
            <Text style={styles.buttonGhostText}>Cancelar</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, submitting && styles.buttonDisabled]}
            onPress={handleSubmit(submit)}
            disabled={submitting}
          >
            {submitting ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Guardar</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {timePicker && (
        <DateTimePicker
          value={new Date()}
          mode="time"
          is24Hour
          onChange={(_event, date) => {
            const field = timePicker
            setTimePicker(null)
            if (date && field) {
              const hhmm = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`
              setValue(field, hhmm)
            }
          }}
        />
      )}
    </Modal>
  )
}

function TimeField({
  value,
  onPress,
  disabled
}: {
  value?: string
  onPress: () => void
  disabled?: boolean
}): React.JSX.Element {
  return (
    <TouchableOpacity
      style={[styles.input, disabled && styles.inputDisabled]}
      onPress={disabled ? undefined : onPress}
      disabled={disabled}
    >
      <Text>{value || '--:--'}</Text>
    </TouchableOpacity>
  )
}

function Field({
  label,
  error,
  children
}: {
  label: string
  error?: string
  children: React.ReactNode
}): React.JSX.Element {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      {children}
      {error && <Text style={styles.error}>{error}</Text>}
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#fff' },
  content: { padding: 20, gap: 14 },
  title: { fontSize: 18, fontWeight: '700', marginBottom: 4, color: '#111' },
  field: { gap: 6 },
  label: { fontSize: 13, fontWeight: '500', color: '#444' },
  input: {
    borderWidth: 1,
    borderColor: '#d8dadf',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 15,
    color: '#111',
    justifyContent: 'center'
  },
  pesoInput: { fontSize: 18, fontWeight: '600', borderWidth: 2, borderColor: '#1f6feb' },
  inputDisabled: { backgroundColor: '#f0f1f3', color: '#888' },
  pickerWrap: { borderWidth: 1, borderColor: '#d8dadf', borderRadius: 8, overflow: 'hidden' },
  hint: { fontSize: 12, color: '#888' },
  error: { color: '#c0392b', fontSize: 12 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 8, marginBottom: 40 },
  button: { backgroundColor: '#1f6feb', borderRadius: 8, paddingVertical: 12, paddingHorizontal: 20 },
  buttonDisabled: { opacity: 0.6 },
  buttonText: { color: '#fff', fontWeight: '600' },
  buttonGhost: { paddingVertical: 12, paddingHorizontal: 16 },
  buttonGhostText: { color: '#444', fontWeight: '500' }
})
