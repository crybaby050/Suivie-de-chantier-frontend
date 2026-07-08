export function renderTable({ columns, rows, emptyMessage = "Aucune donnée disponible." }) {
  if (!rows || rows.length === 0) {
    return `
      <div class="rounded-3xl border border-dashed border-slate-300 bg-slate-50 px-5 py-10 text-center text-sm font-semibold text-slate-500">
        ${emptyMessage}
      </div>
    `;
  }

  const headers = columns
    .map((column) => `<th class="whitespace-nowrap px-5 py-4 text-left text-xs font-black uppercase tracking-[0.14em] text-slate-500">${column.label}</th>`)
    .join(""); 

  const body = rows
    .map((row) => {
      const cells = columns
        .map((column) => {
          const value = typeof column.render === "function" ? column.render(row) : row[column.key];
          return `<td class="border-t border-slate-100 px-5 py-4 align-middle text-sm text-slate-700">${value ?? "-"}</td>`;
        })
        .join("");

      return `<tr class="transition hover:bg-slate-50">${cells}</tr>`;
    })
    .join("");

  return `
    <div class="overflow-hidden rounded-3xl border border-slate-200 bg-white">
      <div class="overflow-x-auto">
        <table class="min-w-full border-collapse">
          <thead class="bg-slate-50">
            <tr>${headers}</tr>
          </thead>
          <tbody class="divide-y divide-slate-100">${body}</tbody>
        </table>
      </div>
    </div>
  `;
}
