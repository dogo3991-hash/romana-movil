import { Picker } from '@react-native-picker/picker'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { useAuth } from '../../auth/AuthProvider'
import { useCompanyContext } from './CompanyContext'

export function CompanySelector(): React.JSX.Element {
  const { companyId, setCompanyId, companies, loading } = useCompanyContext()
  const { operator } = useAuth()

  if (loading) {
    return <ActivityIndicator style={styles.loading} />
  }

  if (companies.length === 0) {
    return <Text style={styles.muted}>Sin empresas cargadas</Text>
  }

  // El expectador queda restringido a una sola empresa (RLS ya solo le
  // devuelve esa fila) — se muestra fijo, sin selector para cambiarla.
  if (operator?.is_viewer) {
    const name = companies.find((c) => c.id === companyId)?.name ?? '—'
    return <Text style={styles.fixedValue}>{name}</Text>
  }

  return (
    <View style={styles.pickerWrap}>
      <Picker
        selectedValue={companyId ?? undefined}
        onValueChange={(v) => setCompanyId(v)}
        style={styles.picker}
        dropdownIconColor="#111"
      >
        {companies.map((c) => (
          <Picker.Item key={c.id} label={c.name} value={c.id} color="#111" />
        ))}
      </Picker>
    </View>
  )
}

const styles = StyleSheet.create({
  loading: { marginVertical: 8 },
  muted: { color: '#888', fontSize: 13 },
  fixedValue: { fontSize: 15, color: '#111', paddingVertical: 8 },
  pickerWrap: { borderWidth: 1, borderColor: '#d8dadf', borderRadius: 8, overflow: 'hidden' },
  picker: { color: '#111' }
})
