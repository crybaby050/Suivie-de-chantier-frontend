import { escapeHtml } from "../../Utils/html.js";
import { isAdmin, getSession } from "../../Utils/auth.js";
import { apiRequest } from "../../Services/apiClient.js";
import { ENDPOINTS } from "../../Config/api.js";
import { getSignalements, getSignalementsByProjet } from "../../Services/signalementService.js";
import { getProjets } from "../../Services/projetService.js";
import { getPhases } from "../../Services/phaseService.js";
import { getTaches } from "../../Services/tacheService.js";
import { getRapports } from "../../Services/rapportService.js";
import { getUtilisateurs } from "../../Services/utilisateurService.js";
import { getStatutBadge, getCibleInfo, formatDate } from "./signalementsHelpers.js";
import { openSignalementForm } from "./signalementForm.js";
import { renderSignalementDetail } from "./signalementDetail.js";

let allSignalements = [];
let allProjets = [];
let allPhases = [];
let allTaches = [];
let allRapports = [];
let allUtilisateurs = [];
let currentFilterType = "Tout";
let currentFilterStatut = "Tout";

export async function renderSignalementsPage() {
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

    [allProjets, allPhases, allTaches, allRapports, allUtilisateurs] = await Promise.all([
        getProjets(),
        getPhases(),
        getTaches(),
        getRapports(),
        getUtilisateurs(),
    ]);

    if (!isAdmin()) {
        const memberships = await apiRequest(
            `${ENDPOINTS.projetMembres}?utilisateurId=${session.id}`,
            {},
            "Impossible de charger vos projets."
        );
        const projetIdsAccessibles = memberships.map(m => m.projetId);
        allProjets = allProjets.filter(p => projetIdsAccessibles.includes(p.id));
    }

    if (isAdmin()) {
        allSignalements = await getSignalements();
    } else {
        const parProjet = await Promise.all(allProjets.map(p => getSignalementsByProjet(p.id)));
        allSignalements = parProjet.flat();
    }

    renderPage();
}

function renderPage() {
    const app = document.getElementById("app");

    const FILTERS_TYPE = ["Tout", "Projet", "Phase", "Tache", "Rapport"];
    const FILTERS_STATUT = ["Tout", "En traitement", "Résolu", "Rejeté"];

    const filtered = allSignalements
        .filter(s => currentFilterType === "Tout" || s.cibleType === currentFilterType)
        .filter(s => currentFilterStatut === "Tout" || s.statut === currentFilterStatut)
        .sort((a, b) => new Date(b.dateDeSignalement) - new Date(a.dateDeSignalement));

    const stats = [
        { label: "Total", value: allSignalements.length, icon: "fa-flag", bg: "bg-primary/10", color: "text-primary" },
        { label: "En traitement", value: allSignalements.filter(s => s.statut === "En traitement").length, icon: "fa-hourglass-half", bg: "bg-attente/10", color: "text-attente" },
        { label: "Résolus", value: allSignalements.filter(s => s.statut === "Résolu").length, icon: "fa-circle-check", bg: "bg-succes/10", color: "text-succes" },
        { label: "Rejetés", value: allSignalements.filter(s => s.statut === "Rejeté").length, icon: "fa-circle-xmark", bg: "bg-bloque/10", color: "text-bloque" },
    ];

    app.innerHTML = `
    <div class="space-y-5">

      <div class="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 class="text-2xl font-black text-texte sm:text-3xl">Signalements</h1>
          <p class="mt-1 text-sm text-muted">Suivez et traitez les problèmes remontés sur vos chantiers</p>
        </div>
        ${!isAdmin() ? `
          <button id="btnNewSignalement" class="flex items-center gap-2 rounded-xl bg-bloque px-4 py-2.5 text-sm font-bold text-white shadow-soft transition hover:bg-bloque/80">
            <i class="fa-solid fa-triangle-exclamation text-xs"></i>
            Nouveau signalement
          </button>
        ` : ""}
      </div>

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

      <div class="flex flex-col gap-3">
        <div class="flex flex-wrap gap-2">
          ${FILTERS_TYPE.map(f => `
            <button class="filter-type-btn rounded-xl px-4 py-2 text-sm font-bold transition
              ${currentFilterType === f ? "bg-primary text-white shadow-soft" : "bg-carte text-muted border border-bordure hover:bg-fond hover:text-primary"}"
              data-filter="${f}">
              ${f === "Tache" ? "Tâche" : f}
            </button>
          `).join("")}
        </div>
        <div class="flex flex-wrap gap-2">
          ${FILTERS_STATUT.map(f => `
            <button class="filter-statut-btn rounded-xl px-3 py-1.5 text-xs font-bold transition
              ${currentFilterStatut === f ? "bg-texte text-white" : "bg-fond text-muted border border-bordure hover:bg-carte"}"
              data-filter="${f}">
              ${f}
            </button>
          `).join("")}
        </div>
      </div>

      <p class="text-xs text-muted">${filtered.length} signalement(s) affiché(s)</p>

      <div class="space-y-3">
        ${filtered.length === 0 ? `
          <div class="rounded-2xl border border-dashed border-bordure bg-carte py-16 text-center">
            <i class="fa-solid fa-flag text-3xl text-muted/30"></i>
            <p class="mt-3 text-sm font-semibold text-muted">Aucun signalement trouvé.</p>
          </div>
        ` : filtered.map(s => renderSignalementCard(s)).join("")}
      </div>

    </div>
  `;

    bindEvents();
}

function renderSignalementCard(signalement) {
    const projet = allProjets.find(p => p.id === signalement.projetId);
    const auteur = allUtilisateurs.find(u => u.id === signalement.auteurId);
    const cibleInfo = getCibleInfo(signalement.cibleType);

    return `
    <div class="signalement-card group cursor-pointer rounded-2xl border border-bordure bg-carte p-5 shadow-card transition hover:shadow-soft" data-signalement-id="${escapeHtml(signalement.id)}">
      <div class="flex items-start gap-4">
        <div class="flex h-11 w-11 flex-shrink-0 items-center justify-center rounded-2xl ${cibleInfo.bg} ${cibleInfo.color}">
          <i class="fa-solid ${cibleInfo.icon} text-sm"></i>
        </div>
        <div class="min-w-0 flex-1">
          <div class="mb-1 flex flex-wrap items-center gap-2">
            ${getStatutBadge(signalement.statut)}
            <span class="text-xs text-muted">${cibleInfo.label} · ${escapeHtml(projet?.nom ?? "—")}</span>
          </div>
          <p class="mb-1 text-sm font-black text-texte">${escapeHtml(signalement.titre)}</p>
          ${signalement.description ? `<p class="line-clamp-2 text-sm text-muted">${escapeHtml(signalement.description)}</p>` : ""}
          <div class="mt-2 flex flex-wrap items-center gap-3 text-xs text-muted">
            <span class="flex items-center gap-1">
              <i class="fa-solid fa-calendar text-primary/40"></i>
              ${formatDate(signalement.dateDeSignalement)}
            </span>
            <span class="flex items-center gap-1">
              <i class="fa-solid fa-user text-primary/40"></i>
              ${escapeHtml(auteur?.nom ?? "Inconnu")}
            </span>
          </div>
        </div>
        <div class="flex-shrink-0 text-muted transition group-hover:text-primary">
          <i class="fa-solid fa-chevron-right text-xs"></i>
        </div>
      </div>
    </div>
  `;
}

function bindEvents() {
    document.getElementById("btnNewSignalement")?.addEventListener("click", () => {
        openSignalementForm(allProjets, async () => {
            await renderSignalementsPage();
        });
    });

    document.querySelectorAll(".filter-type-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            currentFilterType = btn.dataset.filter;
            renderPage();
        });
    });

    document.querySelectorAll(".filter-statut-btn").forEach(btn => {
        btn.addEventListener("click", () => {
            currentFilterStatut = btn.dataset.filter;
            renderPage();
        });
    });

    document.querySelectorAll(".signalement-card").forEach(card => {
        card.addEventListener("click", () => {
            const signalement = allSignalements.find(s => s.id === card.dataset.signalementId);
            if (!signalement) return;

            const contexte = {
                projet: allProjets.find(p => p.id === signalement.projetId),
                phase: allPhases.find(p => p.id === signalement.phaseId),
                tache: allTaches.find(t => t.id === signalement.tacheId),
                rapport: allRapports.find(r => r.id === signalement.rapportId),
                auteur: allUtilisateurs.find(u => u.id === signalement.auteurId),
            };

            renderSignalementDetail(
                signalement,
                contexte,
                () => renderSignalementsPage(),
                async () => {
                    allSignalements = isAdmin()
                        ? await getSignalements()
                        : (await Promise.all(allProjets.map(p => getSignalementsByProjet(p.id)))).flat();
                }
            );
        });
    });
}