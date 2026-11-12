/** Downloads rows as a UTF-8 (BOM) semicolon CSV, which Excel pt-BR opens correctly. */
export function downloadCsv(rows: Record<string, unknown>[], name: string) {
  if (!rows.length) return
  const cols = Object.keys(rows[0])
  const esc = (v: unknown) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const csv = '﻿' + [cols.join(';'), ...rows.map((r) => cols.map((c) => esc(r[c])).join(';'))].join('\n')
  const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
  Object.assign(document.createElement('a'), { href: url, download: `${name}.csv` }).click()
  URL.revokeObjectURL(url)
}
