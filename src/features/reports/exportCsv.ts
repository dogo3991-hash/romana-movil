import * as FileSystem from 'expo-file-system/legacy'
import * as Sharing from 'expo-sharing'
import type { Database } from '../../types/database.types'

type Weighing = Database['public']['Tables']['weighings']['Row']

interface PatenteTotals {
  viajes: number
  kg: number
}

function csvEscape(value: unknown): string {
  const str = value === null || value === undefined ? '' : String(value)
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`
  }
  return str
}

function buildTransportistaSummary(
  rows: Weighing[],
  transportistaNameById: Map<string, string>
): Map<string, Map<string, PatenteTotals>> {
  const summary = new Map<string, Map<string, PatenteTotals>>()

  for (const w of rows) {
    const transportistaName = w.transportista_id
      ? (transportistaNameById.get(w.transportista_id) ?? 'Sin transportista')
      : 'Sin transportista'
    const patente = w.patente ?? 'Sin patente'

    if (!summary.has(transportistaName)) {
      summary.set(transportistaName, new Map())
    }
    const patentes = summary.get(transportistaName)!
    const totals = patentes.get(patente) ?? { viajes: 0, kg: 0 }
    totals.viajes += 1
    totals.kg += w.carga ?? 0
    patentes.set(patente, totals)
  }

  return new Map(
    [...summary.entries()]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([transportista, patentes]) => [
        transportista,
        new Map([...patentes.entries()].sort(([a], [b]) => a.localeCompare(b)))
      ])
  )
}

// Genera un CSV (en vez de .xlsx como en escritorio, por compatibilidad
// garantizada con React Native) con el mismo contenido: detalle de pesajes
// + resumen por transportista/patente al final. Abre Excel/Sheets igual.
export async function exportWeighingsReport(
  rows: Weighing[],
  companyName: string,
  from: string,
  to: string,
  transportistas: { id: string; nombre: string }[]
): Promise<void> {
  const transportistaNameById = new Map(transportistas.map((t) => [t.id, t.nombre]))

  const header = [
    'N° Ticket',
    'Fecha',
    'Hora Entrada',
    'Hora Salida',
    'Transportista',
    'Conductor',
    'Patente',
    'N° Guía',
    'Producto',
    'Tara (kg)',
    'Peso Bruto (kg)',
    'Peso Neto (kg)',
    'Traslado'
  ]

  const lines: string[] = [header.map(csvEscape).join(',')]

  for (const w of rows) {
    lines.push(
      [
        w.ticket_number,
        w.fecha,
        w.hora_entrada.slice(0, 5),
        w.hora_salida?.slice(0, 5) ?? '',
        w.transportista_id ? (transportistaNameById.get(w.transportista_id) ?? '') : '',
        w.conductor,
        w.patente,
        w.n_guia,
        w.producto,
        w.tara,
        w.peso_bruto,
        w.carga,
        w.traslado
      ]
        .map(csvEscape)
        .join(',')
    )
  }

  const summary = buildTransportistaSummary(rows, transportistaNameById)

  lines.push('')
  lines.push('RESUMEN POR TRANSPORTISTA')
  lines.push(['Transportista', 'Patente', 'N° Viajes', 'Kg Totales'].map(csvEscape).join(','))

  let totalViajes = 0
  let totalKg = 0

  for (const [transportista, patentes] of summary) {
    const transportistaViajes = [...patentes.values()].reduce((sum, p) => sum + p.viajes, 0)
    const transportistaKg = [...patentes.values()].reduce((sum, p) => sum + p.kg, 0)

    lines.push([transportista, '', transportistaViajes, transportistaKg].map(csvEscape).join(','))
    for (const [patente, totals] of patentes) {
      lines.push(['', patente, totals.viajes, totals.kg].map(csvEscape).join(','))
    }

    totalViajes += transportistaViajes
    totalKg += transportistaKg
  }

  lines.push(['TOTAL GENERAL', '', totalViajes, totalKg].map(csvEscape).join(','))

  const csvContent = lines.join('\n')
  const fileName = `Pesajes ${companyName} ${from} a ${to}.csv`.replace(/[/\\]/g, '-')
  const fileUri = `${FileSystem.cacheDirectory}${fileName}`

  await FileSystem.writeAsStringAsync(fileUri, csvContent, {
    encoding: FileSystem.EncodingType.UTF8
  })

  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(fileUri, { mimeType: 'text/csv', dialogTitle: fileName })
  }
}
