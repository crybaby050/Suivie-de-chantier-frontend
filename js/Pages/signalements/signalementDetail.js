import { escapeHtml } from "../../Utils/html.js";
import { showToast } from "../../Components/toast.js";
import { openConfirm } from "../../Components/modal.js";
import { isAdmin, canManage } from "../../Utils/auth.js";
import { updateStatutSignalement } from "../../Services/signalementService.js";
import { updateProjet } from "../../Services/projetService.js";
import { updatePhase } from "../../Services/phaseService.js";
import { getStatutBadge, getCibleInfo, formatDate, getInitials } from "./signalementsHelpers.js";
import { refreshSidebarBadges } from "../../Components/sidebar.js";

/**
 * @param {object} signalement
 * @param {object} contexte - { projet, phase, tache, rapport, auteur }
 * @param {Function} onBack
 * @param {Function} onSuccess
 */
export function renderSignalementDetail(signalement, contexte, onBack, onSuccess) {
  const app = document.getElementById("app");
  const { projet, phase, tache, rapport, auteur } = contexte;
  const cibleInfo = getCibleInfo(signalement.cibleType);

  function render() {
    app.innerHTML = `
      <div class="space-y-5">

        <div>
          <button id="btnRetourSignalements" class="mb-2 flex items-center gap-1.5 text-xs font-bold text-muted transition hover:text-primary">
            <i class="fa-solid fa-arrow-left text-xs"></i> Retour aux signalements
          </button>
          <h1 class="text-2xl font-black text-texte sm:text-3xl">Signalement</h1>
          <p class="mt-1 text-sm text-muted">${escapeHtml(projet?.nom ?? "—")}</p>
        </div>

        <div class="rounded-2xl border border-bordure bg-carte p-5 shadow-card sm:p-6">

          <div class="mb-5 flex flex-wrap items-start justify-between gap-3 border-b border-bordure pb-5">
            <div class="flex items-center gap-3">
              <div class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-2xl ${cibleInfo.bg} ${cibleInfo.color}">
                <i class="fa-solid ${cibleInfo.icon} text-sm"></i>
              </div>
              <div>
                <p class="font-black text-texte">${escapeHtml(signalement.titre)}</p>
                <p class="text-xs text-muted">${cibleInfo.label} · ${formatDate(signalement.dateDeSignalement)}</p>
              </div>
            </div>
            ${getStatutBadge(signalement.statut)}
          </div>

          ${signalement.description
        ? `<p class="mb-6 whitespace-pre-wrap text-sm leading-7 text-texte">${escapeHtml(signalement.description)}</p>`
        : `<p class="mb-6 text-sm italic text-muted">Aucune description.</p>`}

          <div class="mb-6 flex items-center gap-3 rounded-xl bg-fond p-3">
            <div class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-black text-primary">
              ${getInitials(auteur?.nom ?? "?")}
            </div>
            <div class="min-w-0 flex-1">
              <p class="truncate text-xs font-bold text-texte">${escapeHtml(auteur?.nom ?? "Auteur inconnu")}</p>
              <p class="text-[11px] text-muted">Signalé par</p>
            </div>
          </div>

          <div class="mb-6 border-t border-bordure pt-5">
            <p class="mb-3 text-xs font-black uppercase tracking-wider text-muted">Cible du signalement</p>
            ${renderCibleDetail()}
          </div>

          ${isAdmin() ? renderActionsAdmin() : ""}
          ${canManage() ? renderActionsResolution() : ""}

        </div>
      </div>
    `;

    bindEvents();
  }

  function renderCibleDetail() {
    if (signalement.cibleType === "Projet") {
      return `
        <div class="rounded-xl bg-fond p-3">
          <p class="text-sm font-bold text-texte">${escapeHtml(projet?.nom ?? "Projet introuvable")}</p>
          <p class="mt-1 text-xs text-muted">Statut actuel : <span class="font-bold text-texte">${escapeHtml(projet?.statutProjet ?? "—")}</span></p>
        </div>
      `;
    }
    if (signalement.cibleType === "Phase") {
      return `
        <div class="rounded-xl bg-fond p-3">
          <p class="text-sm font-bold text-texte">${escapeHtml(phase?.libelle ?? "Phase introuvable")}</p>
          <p class="mt-1 text-xs text-muted">Projet : ${escapeHtml(projet?.nom ?? "—")}</p>
          <p class="mt-1 text-xs text-muted">Statut actuel : <span class="font-bold text-texte">${escapeHtml(phase?.statutPhase ?? "—")}</span></p>
        </div>
      `;
    }
    if (signalement.cibleType === "Tache") {
      return `
        <div class="rounded-xl bg-fond p-3">
          <p class="text-sm font-bold text-texte">${escapeHtml(tache?.titre ?? "Tâche introuvable")}</p>
          <p class="mt-1 text-xs text-muted">Phase : ${escapeHtml(phase?.libelle ?? "—")} · Projet : ${escapeHtml(projet?.nom ?? "—")}</p>
          <p class="mt-1 text-xs text-muted">Statut actuel : <span class="font-bold text-texte">${escapeHtml(tache?.statutTache ?? "—")}</span> · ${tache?.progression ?? 0}%</p>
        </div>
      `;
    }
    if (signalement.cibleType === "Rapport") {
      return `
        <div class="rounded-xl bg-fond p-3">
          <p class="line-clamp-3 text-sm text-texte">${escapeHtml(rapport?.contenu ?? "Rapport introuvable")}</p>
          <p class="mt-1 text-xs text-muted">Projet : ${escapeHtml(projet?.nom ?? "—")} · ${formatDate(rapport?.date)}</p>
        </div>
      `;
    }
    return `<p class="text-xs italic text-muted">Cible inconnue.</p>`;
  }

  function renderActionsAdmin() {
    if (signalement.cibleType === "Projet" && projet) {
      const dejaSuspendu = projet.statutProjet === "Suspendu";
      return `
        <div class="mb-6 flex flex-wrap gap-2 border-t border-bordure pt-5">
          ${!dejaSuspendu ? `
            <button id="btnSuspendreProjet" class="flex items-center gap-2 rounded-xl bg-bloque px-4 py-2 text-xs font-bold text-white transition hover:bg-bloque/80">
              <i class="fa-solid fa-pause text-xs"></i> Suspendre le projet
            </button>
          ` : `<span class="rounded-xl bg-bloque/10 px-4 py-2 text-xs font-bold text-bloque">Projet déjà suspendu</span>`}
          <button id="btnVoirProjet" class="flex items-center gap-2 rounded-xl border border-bordure bg-carte px-4 py-2 text-xs font-bold text-texte transition hover:bg-fond">
            <i class="fa-solid fa-arrow-up-right-from-square text-xs"></i> Voir le projet
          </button>
        </div>
      `;
    }

    if (signalement.cibleType === "Phase" && phase) {
      const dejaBloquee = phase.statutPhase === "Bloquer";
      return `
        <div class="mb-6 flex flex-wrap gap-2 border-t border-bordure pt-5">
          ${dejaBloquee ? `
            <button id="btnDebloquerPhase" class="flex items-center gap-2 rounded-xl bg-succes px-4 py-2 text-xs font-bold text-white transition hover:bg-succes/80">
              <i class="fa-solid fa-lock-open text-xs"></i> Débloquer la phase
            </button>
          ` : `
            <button id="btnBloquerPhase" class="flex items-center gap-2 rounded-xl bg-bloque px-4 py-2 text-xs font-bold text-white transition hover:bg-bloque/80">
              <i class="fa-solid fa-lock text-xs"></i> Bloquer la phase
            </button>
          `}
          <button id="btnVoirProjet" class="flex items-center gap-2 rounded-xl border border-bordure bg-carte px-4 py-2 text-xs font-bold text-texte transition hover:bg-fond">
            <i class="fa-solid fa-arrow-up-right-from-square text-xs"></i> Voir le projet
          </button>
        </div>
      `;
    }

    if (signalement.cibleType === "Rapport" && rapport) {
      return `
        <div class="mb-6 flex flex-wrap gap-2 border-t border-bordure pt-5">
          <button id="btnSupprimerRapportSignale" class="flex items-center gap-2 rounded-xl border border-bordure bg-carte px-4 py-2 text-xs font-bold text-muted transition hover:bg-bloque/10 hover:text-bloque">
            <i class="fa-solid fa-trash text-xs"></i> Supprimer le rapport
          </button>
        </div>
      `;
    }

    return "";
  }

  function renderActionsResolution() {
    if (signalement.statut === "Résolu" || signalement.statut === "Rejeté") {
      return `
        <div class="flex items-center justify-between border-t border-bordure pt-5">
          <span class="text-xs text-muted">Ce signalement est déjà traité.</span>
          <button id="btnRouvrirSignalement" class="rounded-xl border border-bordure bg-carte px-4 py-2 text-xs font-bold text-texte transition hover:bg-fond">
            Rouvrir
          </button>
        </div>
      `;
    }
    return `
      <div class="flex flex-wrap items-center justify-end gap-2 border-t border-bordure pt-5">
        <button id="btnRejeterSignalement" class="rounded-xl border border-bordure bg-carte px-4 py-2 text-xs font-bold text-muted transition hover:bg-bloque/10 hover:text-bloque">
          Rejeter
        </button>
        <button id="btnResoudreSignalement" class="rounded-xl bg-succes px-4 py-2 text-xs font-bold text-white transition hover:bg-succes/80">
          Marquer résolu
        </button>
      </div>
    `;
  }

  function bindEvents() {
    document.getElementById("btnRetourSignalements")?.addEventListener("click", onBack);

    document.getElementById("btnVoirProjet")?.addEventListener("click", async () => {
      const { renderProjetDetail } = await import("../projets/projetDetail.js");
      await renderProjetDetail(projet.id);
    });

    document.getElementById("btnSuspendreProjet")?.addEventListener("click", () => {
      openConfirm({
        message: `Suspendre le projet "${projet.nom}" suite à ce signalement ?`,
        confirmLabel: "Suspendre",
        onConfirm: async () => {
          try {
            await updateProjet(projet.id, { ...projet, statutProjet: "Suspendu" });
            projet.statutProjet = "Suspendu";
            showToast("Projet suspendu.");
            render();
          } catch (err) {
            showToast(err.message, "error");
          }
        },
      });
    });

    document.getElementById("btnBloquerPhase")?.addEventListener("click", () => {
      openConfirm({
        message: `Bloquer la phase "${phase.libelle}" suite à ce signalement ?`,
        confirmLabel: "Bloquer",
        onConfirm: async () => {
          try {
            await updatePhase(phase.id, { ...phase, statutPhase: "Bloquer" });
            phase.statutPhase = "Bloquer";
            showToast("Phase bloquée.");
            render();
          } catch (err) {
            showToast(err.message, "error");
          }
        },
      });
    });

    document.getElementById("btnDebloquerPhase")?.addEventListener("click", () => {
      openConfirm({
        message: `Débloquer la phase "${phase.libelle}" ?`,
        confirmLabel: "Débloquer",
        onConfirm: async () => {
          try {
            await updatePhase(phase.id, { ...phase, statutPhase: "En cours" });
            phase.statutPhase = "En cours";
            showToast("Phase débloquée.");
            render();
          } catch (err) {
            showToast(err.message, "error");
          }
        },
      });
    });

    document.getElementById("btnSupprimerRapportSignale")?.addEventListener("click", () => {
      openConfirm({
        message: "Supprimer ce rapport suite au signalement ? Cette action est irréversible.",
        confirmLabel: "Supprimer",
        onConfirm: async () => {
          try {
            const { supprimerRapport } = await import("../../Services/rapportService.js");
            await supprimerRapport(rapport.id);
            showToast("Rapport supprimé.");
            onBack();
          } catch (err) {
            showToast(err.message, "error");
          }
        },
      });
    });

    document.getElementById("btnResoudreSignalement")?.addEventListener("click", async () => {
      try {
        await updateStatutSignalement(signalement.id, "Résolu");
        signalement.statut = "Résolu";
        showToast("Signalement marqué comme résolu.");
        render();
        await onSuccess();
        refreshSidebarBadges();
      } catch (err) {
        showToast(err.message, "error");
      }
    });

    document.getElementById("btnRejeterSignalement")?.addEventListener("click", async () => {
      try {
        await updateStatutSignalement(signalement.id, "Rejeté");
        signalement.statut = "Rejeté";
        showToast("Signalement rejeté.");
        render();
        await onSuccess();
        refreshSidebarBadges();
      } catch (err) {
        showToast(err.message, "error");
      }
    });

    document.getElementById("btnRouvrirSignalement")?.addEventListener("click", async () => {
      try {
        await updateStatutSignalement(signalement.id, "En traitement");
        signalement.statut = "En traitement";
        showToast("Signalement rouvert.");
        render();
        await onSuccess();
      } catch (err) {
        showToast(err.message, "error");
      }
    });
  }

  render();
}