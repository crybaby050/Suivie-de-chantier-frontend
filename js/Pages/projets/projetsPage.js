import { escapeHtml } from "../../Utils/html.js";
import { getProjets } from "../../Services/projetService.js";
import { getUtilisateurs } from "../../Services/utilisateurService.js";
import { getStatutBadge, formatDate } from "./projetsHelpers.js";
import { allProjets, allUtilisateurs, setAllProjets, setAllUtilisateurs } from "./projetsState.js";
import { openProjetForm } from "./projetForm.js";
import { renderProjetDetail } from "./projetDetail.js";
import { getPhases } from "../../Services/phaseService.js";
import { getTaches } from "../../Services/tacheService.js";
import { calculerProgressionPhase, calculerProgressionProjet } from "../../Utils/progressionHelpers.js";
import { canManage, isAdmin } from "../../Utils/auth.js";
import { getSession } from "../../Utils/auth.js";
import { filtrerProjetsAccessibles } from "../../Utils/projetAccessHelpers.js";
import { paginerListe, renderPagination } from "../../Utils/pagination.js";

let currentFilter = "Tout";
let currentView = "liste";
let searchQuery = "";
let currentPageProjets = 1;

let progressionParProjet = {};

export async function renderProjetsPage() {
    const app = document.getElementById("app");

    app.innerHTML = `
    <div class="grid min-h-[60vh] place-items-center">
      <div class="flex flex-col items-center gap-3">
        <div class="h-10 w-10 animate-spin rounded-full border-4 border-bordure border-t-primary"></div>
        <p class="text-sm font-semibold text-muted">Chargement...</p>
      </div>
    </div>
  `;

    const session = getSession();
    const [projetsBruts, utilisateurs, phases, taches] = await Promise.all([
    getProjets(),
    getUtilisateurs(),
    getPhases(),
    getTaches(),
]);
const projets = await filtrerProjetsAccessibles(projetsBruts, session);
setAllProjets(projets);
setAllUtilisateurs(utilisateurs);
progressionParProjet = calculerProgressionParProjet(projets, phases, taches);

    renderPage();
}

function calculerProgressionParProjet(projets, phases, taches) {
    const map = {};
    projets.forEach(projet => {
        const phasesDuProjet = phases.filter(p => p.projetId === projet.id);
        const phasesAvecProgression = phasesDuProjet.map(phase => ({
            ...phase,
            progression: calculerProgressionPhase(taches.filter(t => t.phaseId === phase.id)),
        }));
        map[projet.id] = calculerProgressionProjet(phasesAvecProgression);
    });
    return map;
}

function renderPage() {
    const app = document.getElementById("app");

    const filtered = allProjets
        .filter(p => currentFilter === "Tout" || p.statutProjet === currentFilter)
        .filter(p => !searchQuery || p.nom.toLowerCase().includes(searchQuery.toLowerCase()) || p.adresse.toLowerCase().includes(searchQuery.toLowerCase()));

    const { items: projetsPagines, page: pageProjets, totalPages: totalPagesProjets } = paginerListe(filtered, currentPageProjets, 10);
    currentPageProjets = pageProjets;

    const FILTERS = ["Tout", "En cours", "Terminer", "Suspendu"];

    app.innerHTML = `
    <div class="space-y-5">

      <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 class="text-2xl font-black text-texte sm:text-3xl">Projets</h1>
          <p class="mt-1 text-sm text-muted">Contrôler et suivre la progression de vos chantiers en temps réel</p>
        </div>
        ${canManage() ? `
  <div class="flex flex-shrink-0 gap-2">
    <button id="btnRapport" class="flex items-center gap-2 rounded-xl border border-bordure bg-carte px-4 py-2.5 text-sm font-bold text-texte shadow-card transition hover:bg-fond">
      <i class="fa-solid fa-file-lines text-xs"></i>
      <span class="hidden sm:inline">Rapport</span>
    </button>
    ${isAdmin() ? `
      <button id="btnNewProjet" class="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-soft transition hover:bg-secondary">
        <i class="fa-solid fa-plus text-xs"></i>
        <span>Nouveau projet</span>
      </button>
    ` : ""}
  </div>
` : ""}
      </div>

      <div class="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div class="flex flex-wrap gap-2">
          ${FILTERS.map(f => `
            <button
              class="filter-btn rounded-xl px-4 py-2 text-sm font-bold transition
                ${currentFilter === f
            ? "bg-primary text-white shadow-soft"
            : "bg-carte text-muted border border-bordure hover:bg-fond hover:text-primary"}"
              data-filter="${f}"
            >
              ${f}
            </button>
          `).join("")}
        </div>

        <div class="flex items-center gap-2">
          <div class="relative flex-1 sm:flex-none">
            <i class="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted"></i>
            <input
              id="searchProjet"
              type="text"
              value="${escapeHtml(searchQuery)}"
              placeholder="Recherche projets..."
              class="w-full rounded-xl border border-bordure bg-carte py-2 pl-8 pr-4 text-sm text-texte outline-none transition placeholder:text-muted/50 focus:border-primary focus:ring-2 focus:ring-primary/20 sm:w-48"
            />
          </div>
          <div class="flex rounded-xl border border-bordure bg-carte overflow-hidden">
            <button id="viewListe" class="flex h-9 w-9 items-center justify-center transition ${currentView === "liste" ? "bg-primary text-white" : "text-muted hover:bg-fond"}">
              <i class="fa-solid fa-list text-xs"></i>
            </button>
            <button id="viewCards" class="flex h-9 w-9 items-center justify-center transition ${currentView === "cards" ? "bg-primary text-white" : "text-muted hover:bg-fond"}">
              <i class="fa-solid fa-grip text-xs"></i>
            </button>
          </div>
        </div>
      </div>

      <p class="text-xs text-muted">${filtered.length} projet(s) affiché(s)</p>

      <div id="projetsContent">
        ${currentView === "liste" ? renderListeView(projetsPagines) : renderCardsView(projetsPagines)}
      </div>
      ${renderPagination(pageProjets, totalPagesProjets, "projets")}

    </div>
  `;

    bindEvents();
}

function renderListeView(projets) {
    if (projets.length === 0) {
        return `
      <div class="rounded-2xl border border-dashed border-bordure bg-carte py-16 text-center">
        <i class="fa-solid fa-building text-3xl text-muted/30"></i>
        <p class="mt-3 text-sm font-semibold text-muted">Aucun projet trouvé.</p>
      </div>
    `;
    }

    return `
    <div class="overflow-hidden rounded-2xl border border-bordure bg-carte shadow-card">
      <div class="overflow-x-auto">
        <table class="min-w-full border-collapse">
          <thead class="bg-fond">
            <tr>
              ${["Projet", "Adresse", "Avancement & Statut", "Chef de chantier", "Timeline", ""].map(h => `
                <th class="whitespace-nowrap px-5 py-3.5 text-left text-xs font-black uppercase tracking-wider text-muted">${h}</th>
              `).join("")}
            </tr>
          </thead>
          <tbody>
            ${projets.map(projet => {
        const chef = allUtilisateurs.find(u => u.id === projet.chefId);
        const statut = getStatutBadge(projet.statutProjet);
        const progression = progressionParProjet[projet.id] ?? 0;

        return `
                <tr class="border-t border-bordure transition hover:bg-fond/50">
                  <td class="px-5 py-4">
                    <div class="flex items-center gap-3">
                      <div class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10">
                        <i class="fa-solid fa-building text-xs text-primary"></i>
                      </div>
                      <span class="font-bold text-texte">${escapeHtml(projet.nom)}</span>
                    </div>
                  </td>
                  <td class="px-5 py-4 text-sm text-muted">${escapeHtml(projet.adresse)}</td>
                  <td class="px-5 py-4">
                    <div class="flex items-center gap-3">
                      <div class="h-1.5 w-24 overflow-hidden rounded-full bg-fond">
                        <div class="h-1.5 rounded-full bg-primary transition-all" style="width:${progression}%"></div>
                      </div>
                      <span class="text-xs font-semibold text-muted">${progression}%</span>
                      ${statut}
                    </div>
                  </td>
                  <td class="px-5 py-4 text-sm font-semibold text-texte">
                    ${chef ? escapeHtml(chef.nom) : "—"}
                  </td>
                  <td class="px-5 py-4 text-xs text-muted">
                    <div>${formatDate(projet.dateDeDebut)}</div>
                    <div>${formatDate(projet.dateDeFinPrevue)}</div>
                  </td>
                  <td class="px-5 py-4">
                    <button
                      class="rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-white transition hover:bg-secondary"
                      data-detail="${escapeHtml(projet.id)}"
                    >
                      Détail
                    </button>
                  </td>
                </tr>
              `;
    }).join("")}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function renderCardsView(projets) {
    if (projets.length === 0) {
        return `
      <div class="rounded-2xl border border-dashed border-bordure bg-carte py-16 text-center">
        <i class="fa-solid fa-building text-3xl text-muted/30"></i>
        <p class="mt-3 text-sm font-semibold text-muted">Aucun projet trouvé.</p>
      </div>
    `;
    }

    return `
    <div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      ${projets.map(projet => {
        const chef = allUtilisateurs.find(u => u.id === projet.chefId);
        const statut = getStatutBadge(projet.statutProjet);
        const progression = progressionParProjet[projet.id] ?? 0;

        return `
          <div class="flex flex-col rounded-2xl border border-bordure bg-carte p-5 shadow-card transition hover:shadow-soft">
            <div class="mb-4 flex items-start justify-between">
              <div class="flex items-center gap-3 min-w-0">
                <div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary/10">
                  <i class="fa-solid fa-building text-sm text-primary"></i>
                </div>
                <div class="min-w-0">
                  <h3 class="truncate font-black text-texte">${escapeHtml(projet.nom)}</h3>
                  <p class="truncate text-xs text-muted">${escapeHtml(projet.adresse)}</p>
                </div>
              </div>
              ${statut}
            </div>
            <div class="mb-4">
              <div class="mb-1 flex items-center justify-between">
                <span class="text-xs font-semibold text-muted">Progression</span>
                <span class="text-xs font-black text-primary">${progression}%</span>
              </div>
              <div class="h-2 w-full overflow-hidden rounded-full bg-fond">
                <div class="h-2 rounded-full bg-primary transition-all" style="width:${progression}%"></div>
              </div>
            </div>
            <div class="mb-4 grid grid-cols-2 gap-2 text-xs">
              <div class="rounded-lg bg-fond p-2">
                <p class="text-muted">Chef</p>
                <p class="font-semibold text-texte truncate">${chef ? escapeHtml(chef.nom) : "—"}</p>
              </div>
              <div class="rounded-lg bg-fond p-2">
                <p class="text-muted">Fin prévue</p>
                <p class="font-semibold text-texte">${formatDate(projet.dateDeFinPrevue)}</p>
              </div>
            </div>
            <div class="mt-auto flex items-center justify-between border-t border-bordure pt-4">
              <span class="text-xs text-muted">${formatDate(projet.dateDeDebut)} → ${formatDate(projet.dateDeFinPrevue)}</span>
              <button
                class="rounded-xl bg-primary px-3 py-1.5 text-xs font-bold text-white transition hover:bg-secondary"
                data-detail="${escapeHtml(projet.id)}"
              >
                Détail
              </button>
            </div>
          </div>
        `;
    }).join("")}
    </div>
  `;
}

function bindEvents() {
    document.getElementById("btnNewProjet")?.addEventListener("click", () => openProjetForm(null, renderProjetsPage));

    document.querySelectorAll(".filter-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            currentFilter = btn.dataset.filter;
            currentPageProjets = 1;
            renderPage();
        });
    });

    document.getElementById("searchProjet")?.addEventListener("input", e => {
        searchQuery = e.target.value;
        currentPageProjets = 1;
        renderPage();
    });

    document.getElementById("viewListe")?.addEventListener("click", () => {
        currentView = "liste";
        renderPage();
    });

    document.getElementById("viewCards")?.addEventListener("click", () => {
        currentView = "cards";
        renderPage();
    });

    document.querySelectorAll('.pagination-btn[data-target="projets"]').forEach(btn => {
        btn.addEventListener("click", () => {
            currentPageProjets = Number(btn.dataset.page);
            renderPage();
        });
    });

    document.querySelectorAll("[data-detail]").forEach(btn => {
        btn.addEventListener("click", () => {
            renderProjetDetail(btn.dataset.detail);
        });
    });
}