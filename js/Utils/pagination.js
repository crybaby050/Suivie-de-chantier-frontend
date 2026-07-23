/**
 * Découpe une liste en pages.
 * @param {Array} liste
 * @param {number} page - page demandée (sera bornée entre 1 et totalPages)
 * @param {number} parPage
 * @returns { items, page, totalPages, total }
 */
export function paginerListe(liste, page, parPage = 5) {
  const totalPages = Math.max(1, Math.ceil(liste.length / parPage));
  const pageActuelle = Math.min(Math.max(1, page), totalPages);
  const debut = (pageActuelle - 1) * parPage;

  return {
    items: liste.slice(debut, debut + parPage),
    page: pageActuelle,
    totalPages,
    total: liste.length,
  };
}

/**
 * Rend les contrôles de pagination (précédent / numéros / suivant).
 * @param {number} page
 * @param {number} totalPages
 * @param {string} target - identifiant unique de la liste paginée (ex: "projets", "taches-phase-001")
 */
export function renderPagination(page, totalPages, target) {
  if (totalPages <= 1) return "";

  const pages = Array.from({ length: totalPages }, (_, i) => i + 1);

  return `
    <div class="flex items-center justify-center gap-1.5 pt-3">
      <button
        class="pagination-btn flex h-8 w-8 items-center justify-center rounded-lg border border-bordure bg-carte text-xs font-bold text-muted transition hover:bg-fond disabled:cursor-not-allowed disabled:opacity-40"
        data-target="${target}" data-page="${page - 1}" ${page === 1 ? "disabled" : ""}
      >
        <i class="fa-solid fa-chevron-left text-[10px]"></i>
      </button>
      ${pages.map(p => `
        <button
          class="pagination-btn flex h-8 w-8 items-center justify-center rounded-lg text-xs font-bold transition
            ${p === page ? "bg-primary text-white" : "border border-bordure bg-carte text-muted hover:bg-fond"}"
          data-target="${target}" data-page="${p}"
        >
          ${p}
        </button>
      `).join("")}
      <button
        class="pagination-btn flex h-8 w-8 items-center justify-center rounded-lg border border-bordure bg-carte text-xs font-bold text-muted transition hover:bg-fond disabled:cursor-not-allowed disabled:opacity-40"
        data-target="${target}" data-page="${page + 1}" ${page === totalPages ? "disabled" : ""}
      >
        <i class="fa-solid fa-chevron-right text-[10px]"></i>
      </button>
    </div>
  `;
}