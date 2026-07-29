import { useState } from 'react'
import { format } from 'date-fns'
import { ActivityIndicator, StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native'
import { FlatList } from 'react-native'
import { useCompanyContext } from '../companies/CompanyContext'
import { CompanySelector } from '../companies/CompanySelector'
import { useDailyBreakdown, useMonthTotal } from './useMonthlySummary'
import { DayDetailDialog } from './DayDetailDialog'

export function MonthlySummaryScreen(): React.JSX.Element {
  const { companyId, loading: companyLoading } = useCompanyContext()
  const [monthValue, setMonthValue] = useState(() => format(new Date(), 'yyyy-MM'))
  const [year, month] = monthValue.split('-').map(Number)
  const [selectedDay, setSelectedDay] = useState<string | null>(null)

  const { data: days, isLoading } = useDailyBreakdown(companyId, year, month)
  const { data: monthTotal } = useMonthTotal(companyId, year, month)

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
      <FlatList
        data={days ?? []}
        keyExtractor={(d) => d.fecha ?? ''}
        contentContainerStyle={styles.content}
        ListHeaderComponent={
          <View style={styles.headerArea}>
            <CompanySelector />
            <View style={styles.field}>
              <Text style={styles.label}>Mes (AAAA-MM)</Text>
              <TextInput style={styles.input} value={monthValue} onChangeText={setMonthValue} />
            </View>
            {monthTotal && (
              <Text style={styles.badge}>
                {monthTotal.is_detailed && monthTotal.is_historical
                  ? 'Mixto (Detallado + Histórico)'
                  : monthTotal.is_detailed
                    ? 'Detallado'
                    : 'Histórico'}
              </Text>
            )}
            {isLoading && <ActivityIndicator />}
            {!isLoading && days?.length === 0 && (
              <Text style={styles.muted}>Sin pesajes detallados para este mes</Text>
            )}
          </View>
        }
        renderItem={({ item: d }) => (
          <TouchableOpacity style={styles.row} onPress={() => setSelectedDay(d.fecha)}>
            <Text style={styles.rowDate}>{d.fecha}</Text>
            <Text style={styles.rowValue}>{d.movimientos} mov.</Text>
            <Text style={styles.rowValue}>{d.carga_total?.toLocaleString('es-CL')} kg</Text>
          </TouchableOpacity>
        )}
        ListFooterComponent={
          <View style={styles.footer}>
            <Text style={styles.footerLabel}>TOTAL MES</Text>
            <Text style={styles.footerValue}>{monthTotal?.movimientos ?? 0} mov.</Text>
            <Text style={styles.footerValue}>{(monthTotal?.carga_total ?? 0).toLocaleString('es-CL')} kg</Text>
          </View>
        }
      />

      <DayDetailDialog
        companyId={companyId}
        fecha={selectedDay}
        onOpenChange={(open) => !open && setSelectedDay(null)}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: '#f4f5f7' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', backgroundColor: '#f4f5f7' },
  muted: { color: '#888', fontSize: 13 },
  content: { padding: 16, gap: 8 },
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
  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#e6f4ea',
    color: '#1a7f37',
    fontSize: 12,
    fontWeight: '600',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999
  },
  row: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6
  },
  rowDate: { fontSize: 14, fontWeight: '600', color: '#111' },
  rowValue: { fontSize: 13, color: '#444' },
  footer: {
    backgroundColor: '#111',
    borderRadius: 10,
    padding: 12,
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 8
  },
  footerLabel: { color: '#fff', fontWeight: '700', fontSize: 13 },
  footerValue: { color: '#fff', fontWeight: '700', fontSize: 13 }
})
