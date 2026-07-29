import { Picker } from '@react-native-picker/picker'
import { StyleSheet, View } from 'react-native'

interface AppPickerProps {
  selectedValue: string
  onValueChange: (value: string) => void
  items: { label: string; value: string }[]
  placeholder?: string
  enabled?: boolean
}

// Envoltorio de @react-native-picker/picker con color de texto explícito —
// sin esto, Android muestra el texto casi invisible (gris muy claro) en
// varios dispositivos.
export function AppPicker({
  selectedValue,
  onValueChange,
  items,
  placeholder = 'Seleccionar',
  enabled = true
}: AppPickerProps): React.JSX.Element {
  return (
    <View style={styles.wrap}>
      <Picker
        selectedValue={selectedValue}
        onValueChange={(v) => onValueChange(String(v))}
        enabled={enabled}
        style={styles.picker}
        dropdownIconColor="#111"
      >
        <Picker.Item label={placeholder} value="" color="#111" />
        {items.map((item) => (
          <Picker.Item key={item.value} label={item.label} value={item.value} color="#111" />
        ))}
      </Picker>
    </View>
  )
}

const styles = StyleSheet.create({
  wrap: { borderWidth: 1, borderColor: '#d8dadf', borderRadius: 8, overflow: 'hidden' },
  picker: { color: '#111' }
})
