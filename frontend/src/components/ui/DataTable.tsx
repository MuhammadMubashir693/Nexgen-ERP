import { type ReactNode, useState } from 'react'
import Button from './Button'

export interface Column<T> {
  key: string
  header: string
  width?: string
  render?: (row: T, index: number) => ReactNode
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
interface DataTableProps<T extends Record<string, any>> {
  columns: Column<T>[]
  data: T[]
  pageSize?: number
  keyField?: keyof T
  className?: string
  striped?: boolean
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export default function DataTable<T extends Record<string, any>>({
  columns,
  data,
  pageSize = 12,
  keyField,
  className = '',
  striped = false,
}: DataTableProps<T>) {
  const [page, setPage] = useState(1)
  const [perPage, setPerPage] = useState(pageSize)

  const totalPages = Math.ceil(data.length / perPage)
  const start = (page - 1) * perPage
  const rows = data.slice(start, start + perPage)

  const pages = Array.from({ length: Math.min(totalPages, 5) }, (_, i) => {
    if (totalPages <= 5) return i + 1
    if (page <= 3) return i + 1
    if (page >= totalPages - 2) return totalPages - 4 + i
    return page - 2 + i
  })

  return (
    <div className={`flex flex-col gap-0 ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-b border-border">
              {columns.map((col) => (
                <th
                  key={col.key}
                  className="text-left px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wide whitespace-nowrap"
                  style={col.width ? { width: col.width } : undefined}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr
                key={keyField ? String(row[keyField]) : idx}
                className={`border-b border-border last:border-0 transition-colors hover:bg-muted/40 ${
                  striped && idx % 2 === 1 ? 'bg-muted/20' : ''
                }`}
              >
                {columns.map((col) => (
                  <td
                    key={col.key}
                    className="px-4 py-3 text-sm text-foreground whitespace-nowrap"
                  >
                    {col.render
                      ? col.render(row, start + idx)
                      : String(row[col.key] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-10 text-center text-sm text-muted-foreground"
                >
                  No records found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-border">
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="ghost"
              disabled={page === 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              ‹
            </Button>
            {pages.map((p) => (
              <Button
                key={p}
                size="sm"
                variant={p === page ? 'primary' : 'ghost'}
                onClick={() => setPage(p)}
                className="min-w-[32px]"
              >
                {p}
              </Button>
            ))}
            {totalPages > 5 && page < totalPages - 2 && (
              <span className="px-1 text-muted-foreground text-xs">»</span>
            )}
            <Button
              size="sm"
              variant="ghost"
              disabled={page === totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              ›
            </Button>
          </div>

          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span>Showing</span>
            <select
              value={perPage}
              onChange={(e) => {
                setPerPage(Number(e.target.value))
                setPage(1)
              }}
              className="h-7 px-2 rounded border border-border bg-card text-foreground text-xs focus:outline-none"
            >
              {[10, 12, 25, 50].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
            <span>per page</span>
          </div>
        </div>
      )}
    </div>
  )
}
