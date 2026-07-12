import { escapeHtml } from "../../Utils/html.js";
import { showToast } from "../../Components/toast.js";
import { isAdmin, isClient, isChef, isOuvrier, canManage, getSession } from "../../Utils/auth.js";
import {
    getRapports,
    getRapportsByProjet,
} from "../../Services/rapportService.js";
import { getProjets } from "../../Services/projetService.js";
import { getUtilisateurs } from "../../Services/utilisateurService.js";
import { apiRequest } from "../../Services/apiClient.js";
import { ENDPOINTS } from "../../Config/api.js";
import { getStatutBadge, formatDate, formatDateCourte, getInitials } from "./rapportsHelpers.js";
import { openRapportForm } from "./rapportForm.js";
import { renderRapportDetail } from "./rapportDetail.js";

// ─── État local ───────────────────────────────────────────────────────────────
let allRapports = [];
let allProjets = [];
let allUtilisateurs = [];
let currentFilter = "Tout";
let searchQuery = "";

// ─── Rendu principal ──────────────────────────────────────────────────────────
export async function renderRapportsPage() {
    const app = document.getElementById("app");
    const session = getSession();

    app.innerHTML = `
    <div class="grid min-h-[60vh] place-items-center">
      <div class="flex flex-col items-center gap-3">
        <div class="h-10 w-10 animate-spin rounded-full border-4 border-bordure border-t-primary"></div>
        <p class="text-sm font-semibold text-muted">Chargement...</p>
      </div>
    </div>
  `;

    [allProjets, allUtilisateurs] = await Promise.all([
        getProjets(),
        getUtilisateurs(),
    ]);

    // Filtrer les projets accessibles selon le rôle
    if (!isAdmin()) {
        const memberships = await apiRequest(
            `${ENDPOINTS.projetMembres}?utilisateurId=${session.id}`,
            {},
            "Impossible de charger vos projets."
        );
        const projetIdsAccessibles = memberships.map(m => m.projetId);
        allProjets = allProjets.filter(p => projetIdsAccessibles.includes(p.id));
    }

    // Charger les rapports selon les projets accessibles
    if (isAdmin()) {
        allRapports = await getRapports();
    } else {
        const rapportsParProjet = await Promise.all(
            allProjets.map(p => getRapportsByProjet(p.id))
        );
        allRapports = rapportsParProjet.flat();

        // Client : uniquement les rapports publiés
        if (isClient()) {
            allRapports = allRapports.filter(r => r.statutRapport === "Publié");
        }
    }

    renderPage();
}

// ─── Rendu page ───────────────────────────────────────────────────────────────
function renderPage() {
    const app = document.getElementById("app");

    const FILTERS = ["Tout", "Brouillon", "Publié"];

    const filtered = allRapports
        .filter(r => currentFilter === "Tout" || r.statutRapport === currentFilter)
        .filter(r => {
            if (!searchQuery) return true;
            const projet = allProjets.find(p => p.id === r.projetId);
            const auteur = allUtilisateurs.find(u => u.id === r.auteurId);
            return (
                r.contenu.toLowerCase().includes(searchQuery.toLowerCase()) ||
                projet?.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
                auteur?.nom.toLowerCase().includes(searchQuery.toLowerCase())
            );
        });

    const stats = [
        { label: "Total", value: allRapports.length, icon: "fa-file-lines", bg: "bg-primary/10", color: "text-primary" },
        { label: "Publiés", value: allRapports.filter(r => r.statutRapport === "Publié").length, icon: "fa-paper-plane", bg: "bg-succes/10", color: "text-succes" },
        { label: "Brouillons", value: allRapports.filter(r => r.statutRapport === "Brouillon").length, icon: "fa-pen-to-square", bg: "bg-attente/10", color: "text-attente" },
        { label: "Avec photos", value: allRapports.filter(r => (r.photos ?? []).length > 0).length, icon: "fa-images", bg: "bg-secondary/10", color: "text-secondary" },
    ];

    app.innerHTML = `
    <div class="space-y-5">

      <!-- En-tête -->
      <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 class="text-2xl font-black text-texte sm:text-3xl">Rapports</h1>
          <p class="mt-1 text-sm text-muted">Suivez les rapports d'avancement de vos chantiers</p>
        </div>
        ${(isChef() || isOuvrier()) ? `
          <button id="btnNewRapport" class="flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-bold text-white shadow-soft transition hover:bg-secondary">
            <i class="fa-solid fa-plus text-xs"></i>
            Nouveau rapport
          </button>
        ` : ""}
      </div>

      <!-- Stats -->
      <div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
        ${stats.map(s => `
          <div class="rounded-2xl bg-carte p-4 shadow-card">
            <div class="flex items-center gap-3">
              <div class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-xl ${s.bg}">
                <i class="fa-solid ${s.icon} text-sm ${s.color}"></i>
              </div>
              <div>
                <p class="text-xs text-muted">${s.label}</p>
                <p class="text-xl font-black text-texte">${s.value}</p>
              </div>
            </div>
          </div>
        `).join("")}
      </div>

      <!-- Filtres + recherche -->
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
        <div class="relative">
          <i class="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted"></i>
          <input
            id="searchRapport"
            type="text"
            value="${escapeHtml(searchQuery)}"
            placeholder="Rechercher un rapport..."
            class="w-full rounded-xl border border-bordure bg-carte py-2 pl-8 pr-4 text-sm text-texte outline-none transition placeholder:text-muted/50 focus:border-primary focus:ring-2 focus:ring-primary/20 sm:w-56"
          />
        </div>
      </div>

      <!-- Compteur -->
      <p class="text-xs text-muted">${filtered.length} rapport(s) affiché(s)</p>

      <!-- Liste -->
      <div>
        ${renderRapportsListe(filtered)}
      </div>

    </div>
  `;

    bindEvents();
}

// ─── Card rapport ─────────────────────────────────────────────────────────────
function renderRapportCard(rapport) {
    const projet = allProjets.find(p => p.id === rapport.projetId);
    const auteur = allUtilisateurs.find(u => u.id === rapport.auteurId);
    const photos = rapport.photos ?? [];

    return `
    <div
      class="rapport-card group cursor-pointer rounded-2xl border border-bordure bg-carte p-5 shadow-card transition hover:shadow-soft"
      data-rapport-id="${escapeHtml(rapport.id)}"
    >
      <div class="flex items-start gap-4">

        <!-- Avatar auteur -->
        <div class="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl bg-primary/10 text-sm font-black text-primary">
          ${getInitials(auteur?.nom ?? "?")}
        </div>

        <!-- Contenu -->
        <div class="min-w-0 flex-1">
          <div class="mb-1 flex flex-wrap items-center gap-2">
            ${getStatutBadge(rapport.statutRapport)}
            <span class="text-xs text-muted">${escapeHtml(projet?.nom ?? "—")}</span>
          </div>
          <p class="mb-1 text-sm font-black text-texte">${escapeHtml(auteur?.nom ?? "Auteur inconnu")}</p>
          <p class="line-clamp-2 text-sm text-muted">${escapeHtml(rapport.contenu)}</p>

          <div class="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted">
            <span class="flex items-center gap-1">
              <i class="fa-solid fa-calendar text-primary/40"></i>
              ${formatDate(rapport.date)}
            </span>
            ${photos.length > 0 ? `
              <span class="flex items-center gap-1">
                <i class="fa-solid fa-images text-primary/40"></i>
                ${photos.length} photo(s)
              </span>
            ` : ""}
          </div>
        </div>

        <!-- Flèche -->
        <div class="flex-shrink-0 text-muted transition group-hover:text-primary">
          <i class="fa-solid fa-chevron-right text-xs"></i>
        </div>

      </div>
    </div>
  `;
}

// ─── Événements ───────────────────────────────────────────────────────────────
function bindEvents() {
    document.getElementById("btnNewRapport")?.addEventListener("click", () => {
        openRapportForm(null, allProjets, async () => {
            await renderRapportsPage();
        });
    });

    document.querySelectorAll(".filter-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            currentFilter = btn.dataset.filter;
            renderPage();
        });
    });

    document.getElementById("searchRapport")?.addEventListener("input", e => {
        searchQuery = e.target.value;
        renderPage();
    });

    document.querySelectorAll(".rapport-card").forEach(card => {
        card.addEventListener("click", () => {
            const rapport = allRapports.find(r => r.id === card.dataset.rapportId);
            if (!rapport) return;

            const auteur = allUtilisateurs.find(u => u.id === rapport.auteurId);
            const projet = allProjets.find(p => p.id === rapport.projetId);

            renderRapportDetail(
                rapport,
                auteur,
                projet,
                allProjets,
                () => renderRapportsPage(),
                async () => {
                    allRapports = isAdmin()
                        ? await getRapports()
                        : (await Promise.all(allProjets.map(p => getRapportsByProjet(p.id)))).flat();
                }
            );
        });
    });
}