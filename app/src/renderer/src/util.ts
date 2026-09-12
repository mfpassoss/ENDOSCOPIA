export function fmtDate(iso: string | null | undefined): string {
  if (!iso) return ''
  const [y, m, d] = iso.slice(0, 10).split('-')
  return d && m && y ? `${d}/${m}/${y}` : iso
}

export function fmtDateTime(iso: string | null | undefined): string {
  if (!iso) return ''
  const d = new Date(iso)
  if (isNaN(d.getTime())) return iso
  return d.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}

export function today(): string {
  const d = new Date()
  const pad = (n: number): string => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

export function idade(dn: string, ref?: string): string {
  if (!dn) return ''
  const a = new Date(dn + 'T00:00:00')
  const b = new Date((ref || today()) + 'T00:00:00')
  if (isNaN(a.getTime()) || isNaN(b.getTime())) return ''
  let y = b.getFullYear() - a.getFullYear()
  const m = b.getMonth() - a.getMonth()
  if (m < 0 || (m === 0 && b.getDate() < a.getDate())) y--
  return y >= 0 ? `${y} anos` : ''
}

export function tipoLabel(t: string): string {
  return t === 'EDA' ? 'Endoscopia digestiva alta' : t === 'COLONO' ? 'Colonoscopia' : t
}

export function fotoUrl(path: string): string {
  return 'foto://' + encodeURIComponent(path)
}

export function errMsg(e: unknown): string {
  const m = e instanceof Error ? e.message : String(e)
  return m.replace(/^Error invoking remote method '[^']+': (Error: )?/, '')
}
