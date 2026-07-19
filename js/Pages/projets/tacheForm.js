import { escapeHtml } from "../../Utils/html.js";
import { showToast } from "../../Components/toast.js";
import { openModal, openConfirm } from "../../Components/modal.js";
import { createFormValidator, Rules } from "../../Utils/formValidator.js";
import { createTache, updateTache } from "../../Services/tacheService.js";
import { affecterUtilisateur, supprimerAffectation } from "../../Services/affectationService.js";
import { getMembresByProjet, getMembres } from "../../Services/projetMembreService.js";
import { allUtilisateurs } from "./projetsState.js";
import { getInitials } from "./projetsHelpers.js";

const TACHE_SCHEMA = {
    tacheTitre: { rules: [Rules.required("Le titre est obligatoire.")], transform: v => v.trim(), as: "titre" },
    tacheDescription: { rules: [], transform: v => v.trim(), as: "description" },
    tacheDebut: { rules: [Rules.required("La date de début est obligatoire.")], transform: v => v, as: "dateDeDebut" },
    tacheFin: { rules: [Rules.required("La date de fin est obligatoire.")], transform: v => v, as: "dateDeFin" },
    tacheStatut: { rules: [], transform: v => v, as: "statutTache" },
};

/**
 * @param {string} phaseId
 * @param {string} projetId - projet auquel appartient la phase (pour déterminer qui est "sur ce chantier")
 * @param {Function} onSuccess
 * @param {object|null} [tache]
 * @param {object[]} [currentAffectations]
 */
export async function openTacheForm(phaseId, projetId, onSuccess, tache = null, currentAffectations = []) {
    const ouvriers = allUtilisateurs.filter(u => u.roleGlobal === "Ouvrier");

    // Qui est déjà membre de CE projet, et qui est membre d'un AUTRE projet
    const [membresProjetActuel, tousLesMembres] = await Promise.all([
        getMembresByProjet(projetId),
        getMembres(),
    ]);
    const membresIciIds = new Set(membresProjetActuel.map(m => m.utilisateurId));
    const occupesAilleurs = new Set(
        tousLesMembres
            .filter(m => m.projetId !== projetId && ouvriers.some(o => o.id === m.utilisateurId))
            .map(m => m.utilisateurId)
    );

    let validator;
    let modalRoot;

    // Etat local de sélection (initialisé sur les affectations actuelles)
    let selectedIds = new Set(currentAffectations.map(a => a.utilisateurId));
    let searchQuery = "";
    let dropdownOuvert = false;

    openModal({
        title: tache ? "Modifier la tâche" : "Nouvelle tâche",
        icon: "fa-list-check",
        confirmLabel: tache ? "Enregistrer" : "Créer",
        confirmClass: "bg-primary shadow-primary/20 hover:bg-secondary",
        body: `
      <div class="grid gap-4">
        <div>
          <label for="tacheTitre" class="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">
            Titre <span class="text-bloque">*</span>
          </label>
          <input type="text" id="tacheTitre" value="${escapeHtml(tache?.titre ?? "")}"
            placeholder="ex: Montage des murs RDC"
            class="w-full rounded-xl border border-bordure bg-fond px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div>
          <label for="tacheDescription" class="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">Description</label>
          <textarea id="tacheDescription" rows="3"
            class="w-full rounded-xl border border-bordure bg-fond px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          >${escapeHtml(tache?.description ?? "")}</textarea>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label for="tacheDebut" class="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">Début <span class="text-bloque">*</span></label>
            <input type="date" id="tacheDebut" value="${escapeHtml(tache?.dateDeDebut ?? "")}"
              class="w-full rounded-xl border border-bordure bg-fond px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
          <div>
            <label for="tacheFin" class="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">Fin <span class="text-bloque">*</span></label>
            <input type="date" id="tacheFin" value="${escapeHtml(tache?.dateDeFin ?? "")}"
              class="w-full rounded-xl border border-bordure bg-fond px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>
        </div>
        <div>
          <label for="tacheStatut" class="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">Statut</label>
          <select id="tacheStatut"
            class="w-full rounded-xl border border-bordure bg-fond px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
          >
            <option value="A faire"  ${tache?.statutTache === "A faire" ? "selected" : ""}>A faire</option>
            <option value="En cours" ${tache?.statutTache === "En cours" ? "selected" : ""}>En cours</option>
            <option value="Terminer" ${tache?.statutTache === "Terminer" ? "selected" : ""}>Terminer</option>
            <option value="Valider"  ${tache?.statutTache === "Valider" ? "selected" : ""}>Valider</option>
            <option value="Renvoyer" ${tache?.statutTache === "Renvoyer" ? "selected" : ""}>Renvoyer</option>
          </select>
        </div>
        <div>
          <label class="mb-1.5 block text-xs font-bold uppercase tracking-wider text-muted">Ouvriers assignés</label>
          <div id="tacheOuvriersWidget"></div>
        </div>
      </div>
    `,
        onMount: modal => {
            validator = createFormValidator(modal, TACHE_SCHEMA);
            modalRoot = modal;
            renderOuvriersWidget();
        },
        onConfirm: async () => {
            const data = validator.validate();
            if (!data) return false;

            const checkedIds = [...selectedIds];

            try {
                let savedTache;
                if (tache) {
                    savedTache = await updateTache(tache.id, { ...data, phaseId });
                    showToast("Tâche modifiée.");
                } else {
                    savedTache = await createTache({ ...data, phaseId });
                    showToast("Tâche créée.");
                }

                const assignedIds = new Set(currentAffectations.map(a => a.utilisateurId));
                const toAdd = checkedIds.filter(id => !assignedIds.has(id));
                const toRemove = currentAffectations.filter(a => !checkedIds.includes(a.utilisateurId));

                await Promise.all([
                    ...toAdd.map(utilisateurId => affecterUtilisateur({ tacheId: savedTache.id, utilisateurId })),
                    ...toRemove.map(a => supprimerAffectation(a.id, a.utilisateurId)),
                ]);

                await onSuccess();
                return true;
            } catch (err) {
                showToast(err.message, "error");
                return false;
            }
        },
    });

    // ─── Widget recherche + sélection des ouvriers ─────────────────────────────
    function renderOuvriersWidget() {
        const widget = modalRoot.querySelector("#tacheOuvriersWidget");
        if (!widget) return;

        const selectionnes = ouvriers.filter(o => selectedIds.has(o.id));
        const filtered = ouvriers.filter(o => {
            if (selectedIds.has(o.id)) return false;
            if (!searchQuery) return true;
            return o.nom.toLowerCase().includes(searchQuery.toLowerCase());
        });

        widget.innerHTML = `
          <div class="space-y-2">
            <div class="flex flex-wrap gap-2">
              ${selectionnes.length === 0
                ? `<p class="text-xs italic text-muted">Aucun ouvrier assigné.</p>`
                : selectionnes.map(o => `
                  <span class="flex items-center gap-2 rounded-xl bg-primary/10 py-1.5 pl-3 pr-2 text-xs font-bold text-primary">
                    <span class="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-[9px]">${getInitials(o.nom)}</span>
                    ${escapeHtml(o.nom)}
                    <button
                      type="button"
                      class="btn-retirer-ouvrier-tache flex h-4 w-4 items-center justify-center rounded-full text-primary/70 transition hover:bg-primary/20 hover:text-primary"
                      data-utilisateur-id="${escapeHtml(o.id)}"
                      data-nom="${escapeHtml(o.nom)}"
                      title="Retirer"
                    >
                      <i class="fa-solid fa-xmark text-[10px]"></i>
                    </button>
                  </span>
                `).join("")}
            </div>

            <div class="relative">
              <div class="relative">
                <i class="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted"></i>
                <input
                  type="text"
                  id="rechercheOuvrierTacheInput"
                  value="${escapeHtml(searchQuery)}"
                  placeholder="Rechercher un ouvrier..."
                  autocomplete="off"
                  class="w-full rounded-xl border border-bordure bg-fond py-2 pl-8 pr-4 text-sm text-texte outline-none transition placeholder:text-muted/50 focus:border-primary focus:ring-2 focus:ring-primary/20"
                />
              </div>

              ${dropdownOuvert ? `
                <div class="absolute z-20 mt-1 max-h-48 w-full overflow-y-auto rounded-xl border border-bordure bg-carte shadow-card">
                  ${filtered.length === 0
                    ? `<p class="px-3 py-3 text-xs italic text-muted">Aucun ouvrier trouvé.</p>`
                    : filtered.map(o => {
                        const estIci = membresIciIds.has(o.id);
                        const occupe = !estIci && occupesAilleurs.has(o.id);
                        return `
                          <button
                            type="button"
                            class="btn-ajouter-ouvrier-tache flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition
                              ${occupe ? "cursor-not-allowed text-muted/50" : "text-texte hover:bg-fond"}"
                            data-utilisateur-id="${escapeHtml(o.id)}"
                            ${occupe ? "disabled" : ""}
                          >
                            <span class="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full ${occupe ? "bg-muted/10 text-muted" : "bg-primary/10 text-primary"} text-[10px] font-black">
                              ${getInitials(o.nom)}
                            </span>
                            <span class="min-w-0 flex-1 truncate">${escapeHtml(o.nom)}</span>
                            ${occupe ? `<span class="flex-shrink-0 text-[10px] italic text-muted">Sur un autre chantier</span>` : ""}
                          </button>
                        `;
                      }).join("")
                  }
                </div>
              ` : ""}
            </div>
          </div>
        `;

        bindWidgetEvents(widget);
    }

    function bindWidgetEvents(widget) {
        const input = widget.querySelector("#rechercheOuvrierTacheInput");

        input?.addEventListener("focus", () => {
            dropdownOuvert = true;
            renderOuvriersWidget();
            focusFinTexte();
        });

        input?.addEventListener("input", e => {
            searchQuery = e.target.value;
            dropdownOuvert = true;
            renderOuvriersWidget();
            focusFinTexte();
        });

        input?.addEventListener("blur", () => {
            setTimeout(() => {
                dropdownOuvert = false;
                renderOuvriersWidget();
            }, 150);
        });

        widget.querySelectorAll(".btn-ajouter-ouvrier-tache").forEach(btn => {
            btn.addEventListener("click", () => {
                if (btn.disabled) return;
                selectedIds.add(btn.dataset.utilisateurId);
                searchQuery = "";
                dropdownOuvert = false;
                renderOuvriersWidget();
            });
        });

        widget.querySelectorAll(".btn-retirer-ouvrier-tache").forEach(btn => {
            btn.addEventListener("click", () => {
                const utilisateurId = btn.dataset.utilisateurId;
                const nom = btn.dataset.nom;

                openConfirm({
                    message: `Retirer ${nom} de cette tâche ?`,
                    confirmLabel: "Retirer",
                    onConfirm: () => {
                        selectedIds.delete(utilisateurId);
                        renderOuvriersWidget();
                    },
                });
            });
        });
    }

    function focusFinTexte() {
        const el = modalRoot.querySelector("#rechercheOuvrierTacheInput");
        if (el) {
            el.focus();
            el.selectionStart = el.selectionEnd = el.value.length;
        }
    }
}