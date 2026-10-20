import type { ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Table on md+ screens; each row becomes a labelled card on phones (no horizontal scrolling).
 */
export function ResponsiveTable({
  columns,
  rows,
  caption,
  empty = 'Nothing here yet.',
}: {
  columns: { key: string; label: ReactNode; className?: string }[];
  rows: { id: string; cells: Record<string, ReactNode>; className?: string }[];
  caption?: string;
  empty?: ReactNode;
}) {
  if (!rows.length)
    return (
      <p className="rounded-sm border border-dashed border-line p-8 text-center text-sm text-muted">
        {empty}
      </p>
    );
  return (
    <table className="table-stack block w-full text-sm md:table">
      {caption && <caption className="sr-only">{caption}</caption>}
      <thead className="hidden border-b border-line md:table-header-group">
        <tr>
          {columns.map((c) => (
            <th
              key={c.key}
              scope="col"
              className={cn('label px-3 py-2 text-left font-normal', c.className)}
            >
              {c.label}
            </th>
          ))}
        </tr>
      </thead>
      <tbody className="block space-y-3 md:table-row-group md:space-y-0">
        {rows.map((r) => (
          <tr
            key={r.id}
            className={cn(
              'block rounded-sm border border-line p-3 md:table-row md:rounded-none md:border-0 md:border-b md:p-0',
              r.className,
            )}
          >
            {columns.map((c) => (
              <td
                key={c.key}
                data-label={typeof c.label === 'string' ? c.label : undefined}
                className={cn(
                  'block py-1.5 md:table-cell md:px-3 md:py-3 md:align-middle',
                  c.className,
                )}
              >
                {r.cells[c.key]}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  );
}
