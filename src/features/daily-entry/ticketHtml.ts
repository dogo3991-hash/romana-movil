import { format } from 'date-fns'
import type { Database } from '../../types/database.types'

type Weighing = Database['public']['Tables']['weighings']['Row']
type Transportista = Database['public']['Tables']['transportistas']['Row']

function formatKg(value: number | null): string {
  return value !== null ? value.toLocaleString('es-CL') : '—'
}

export function buildTicketHtml(
  weighing: Weighing,
  transportista: Transportista | undefined,
  conductorRut: string | undefined
): string {
  const titulo =
    weighing.ticket_number != null
      ? `TICKET DE PESAJE N° ${weighing.ticket_number}`
      : 'TICKET PROVISORIO — pendiente de sincronizar'

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<style>
  body { font-family: -apple-system, Helvetica, Arial, sans-serif; font-size: 12px; color: #111; padding: 16px; }
  .header { border-bottom: 1px solid #333; padding-bottom: 8px; margin-bottom: 12px; }
  .header .name { font-size: 14px; font-weight: 700; }
  .banner { border: 2px solid #1f6feb; text-align: center; font-weight: 700; padding: 6px 0; margin-bottom: 8px; }
  .warning { border: 1px solid #d9a441; background: #fdf3de; text-align: center; font-size: 10px; font-weight: 600; padding: 6px 0; margin-bottom: 8px; color: #8a6a1e; }
  .subheader { border: 1px solid #333; text-align: center; font-weight: 600; padding: 4px 0; margin-bottom: 12px; }
  .box { border: 1px solid #333; padding: 10px; margin-bottom: 12px; }
  .row { display: flex; justify-content: space-between; margin-bottom: 4px; }
  .row-simple { margin-bottom: 4px; }
  .label { font-weight: 600; text-decoration: underline; margin-right: 6px; }
  .weights .row span:last-child { font-variant-numeric: tabular-nums; }
  .neto { font-weight: 700; font-size: 14px; }
  .footer { display: flex; justify-content: space-between; font-size: 10px; color: #666; margin-top: 8px; }
</style>
</head>
<body>
  <div class="header">
    <div class="name">SLM BELLAVISTA</div>
    <div>RUT: 76.900.250-2</div>
    <div>RUTA C-327 KM 6</div>
  </div>

  <div class="banner">${titulo}</div>
  ${
    weighing.ticket_number == null
      ? '<div class="warning">Documento provisorio: el N° de Ticket definitivo se asignará al reconectar con el servidor.</div>'
      : ''
  }
  <div class="subheader">Despacho de Carga</div>

  <div class="box">
    <div class="row">
      <span><span class="label">Patente</span>${weighing.patente}</span>
      <span><span class="label">N° Guía de Despacho</span>${weighing.n_guia}</span>
    </div>
    <div class="row-simple"><span class="label">Cliente</span>${weighing.traslado ?? '—'}</div>
    <div class="row-simple"><span class="label">Producto</span>${weighing.producto ?? '—'}</div>
    <div class="row-simple"><span class="label">Transportista</span>${transportista?.rut ?? '—'} ${transportista?.nombre ?? '—'}</div>
    <div class="row-simple"><span class="label">Chofer</span>${conductorRut ?? '—'} ${weighing.conductor}</div>
  </div>

  <div class="box">
    <div class="row-simple"><span class="label">Fecha</span>${format(new Date(`${weighing.fecha}T00:00:00`), 'dd-MM-yyyy')}</div>
    <div class="row-simple"><span class="label">Hora Entrada</span>${weighing.hora_entrada.slice(0, 5)}</div>
    <div class="row-simple"><span class="label">Hora Salida</span>${weighing.hora_salida?.slice(0, 5) ?? '—'}</div>
  </div>

  <div class="box weights">
    <div class="row"><span>Peso Bruto</span><span>${formatKg(weighing.peso_bruto)} kg</span></div>
    <div class="row"><span>Peso Tara</span><span>${formatKg(weighing.tara)} kg</span></div>
    <div class="row neto"><span>Peso Neto</span><span>${formatKg(weighing.carga)} kg</span></div>
  </div>

  <div class="footer">
    <span>SLM Bellavista</span>
    <span>Fecha Impresión: ${format(new Date(), 'dd-MM-yyyy')}</span>
  </div>
</body>
</html>
`
}
