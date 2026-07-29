import { StyleSheet, Text, View } from 'react-native'

export function PlaceholderScreen({ label }: { label: string }): React.JSX.Element {
  return (
    <View style={styles.container}>
      <Text style={styles.text}>{label}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f4f5f7' },
  text: { color: '#666', fontSize: 14 }
})
