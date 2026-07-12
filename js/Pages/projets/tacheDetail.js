import { escapeHtml } from "../../Utils/html.js";
import { openModal } from "../../Components/modal.js";
import { canManage, isAdmin } from "../../Utils/auth.js";
import { openSignalementForm } from "../signalements/signalementForm.js";
import { getStatutBadge, formatDate, getInitials } from "./projetsHelpers.js";
import { allUtilisateurs } from "./projetsState.js";
import { openTacheForm } from "./tacheForm.js";

/**
 * Affiche le détail complet d'une tâche : description, dates,
 * statut, et la liste des personnes assignées avec leur statut individuel.
 */
export function openTacheDetail(tache, affectations, phaseId, projetId, onChanged) {
    const assignes = affectations
        .map(a => ({ user: allUtilisateurs.find(u => u.id === a.utilisateurId), statutPersonnel: a.statutPersonnel }))
        .filter(a => a.user);

    let modalRoot;

    openModal({
        title: tache.titre,
        icon: "fa-list-check",
        confirmLabel: "Fermer",
        confirmClass: "bg-primary shadow-primary/20 hover:bg-secondary",
        body: `
      <div class="space-y-4">
        <div class="flex items-center gap-2">
          ${getStatutBadge(tache.statutTache)}
          <span class="text-xs text-muted">${tache.progression ?? 0}% complété</span>
        </div>

        ${tache.description
                ? `<p class="text-sm leading-6 text-muted">${escapeHtml(tache.description)}</p>`
                : `<p class="text-sm italic text-muted">Aucune description.</p>`}

        <div class="grid grid-cols-2 gap-3 text-xs">
          <div class="rounded-lg bg-fond p-2">
            <p class="text-muted">Début</p>
            <p class="font-semibold text-texte">${formatDate(tache.dateDeDebut)}</p>
          </div>
          <div class="rounded-lg bg-fond p-2">
            <p class="text-muted">Fin prévue</p>
            <p class="font-semibold text-texte">${formatDate(tache.dateDeFin)}</p>
          </div>
        </div>

        <div>
          <p class="mb-2 text-xs font-black uppercase tracking-wider text-muted">Assigné à</p>
          ${assignes.length === 0
                ? `<p class="text-sm italic text-muted">Personne assigné.</p>`
                : `
              <div class="space-y-2">
                ${assignes.map(a => `
                  <div class="flex items-center gap-3 rounded-xl bg-fond p-2.5">
                    <div class="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-[11px] font-black text-primary">
                      ${getInitials(a.user.nom)}
                    </div>
                    <span class="flex-1 truncate text-sm font-semibold text-texte">${escapeHtml(a.user.nom)}</span>
                    <span class="text-xs text-muted">${escapeHtml(a.statutPersonnel ?? "—")}</span>
                  </div>
                `).join("")}
              </div>
            `}
        </div>

        ${canManage() ? `
          <button id="btnModifierTache" type="button"
            class="w-full rounded-xl border border-bordure bg-carte px-4 py-2 text-sm font-bold text-texte transition hover:bg-fond">
            <i class="fa-solid fa-pen text-xs"></i> Modifier la tâche
          </button>
        ` : ""}
        ${!isAdmin() ? `
          <button id="btnSignalerTache" type="button"
            class="w-full rounded-xl border border-bloque/30 bg-bloque/5 px-4 py-2 text-sm font-bold text-bloque transition hover:bg-bloque/10">
            <i class="fa-solid fa-triangle-exclamation text-xs"></i> Signaler cette tâche
          </button>
        ` : ""}
      </div>
    `,
        onMount: (modal) => { modalRoot = modal; },
        onConfirm: () => true,
    });

    // Note : on suppose ici que ta modale se ferme/se remplace proprement
    // si on en ouvre une seconde par-dessus. Si `openTacheForm` ne s'affiche
    // pas correctement après un clic sur "Modifier", montre-moi Components/modal.js.
    setTimeout(() => {
    modalRoot?.querySelector("#btnModifierTache")?.addEventListener("click", () => {
        openTacheForm(phaseId, onChanged, tache, affectations);
    });
    modalRoot?.querySelector("#btnSignalerTache")?.addEventListener("click", () => {
        openSignalementForm([], () => {}, {
            cibleType: "Tache",
            cibleLabel: tache.titre,
            projetId,
            phaseId,
            tacheId: tache.id,
        });
    });
}, 0);
}