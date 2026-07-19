import { escapeHtml } from "../../Utils/html.js";
import { showToast } from "../../Components/toast.js";
import { openConfirm } from "../../Components/modal.js";
import { getOuvriers } from "../../Services/utilisateurService.js";
import { getMembres, getMembresByProjet, ajouterMembre, retirerMembre } from "../../Services/projetMembreService.js";
import { getInitials } from "./projetsHelpers.js";

let searchQuery = "";
let dropdownOuvert = false;

/**
 * Initialise le widget de gestion des ouvriers d'un projet
 * (recherche + sélection, avec désactivation des ouvriers déjà sur un autre chantier).
 */
export async function initMembresOuvriersWidget(container, { projetId, onChanged }) {
    if (!container) return;

    container.innerHTML = `<p class="text-xs text-muted">Chargement des ouvriers...</p>`;

    const [ouvriers, membresProjet, tousLesMembres] = await Promise.all([
        getOuvriers(),
        getMembresByProjet(projetId),
        getMembres(),
    ]);

    const membresOuvrierIds = new Set(
        membresProjet
            .filter(m => ouvriers.some(o => o.id === m.utilisateurId))
            .map(m => m.utilisateurId)
    );

    const occupesAilleurs = new Set(
        tousLesMembres
            .filter(m => m.projetId !== projetId && ouvriers.some(o => o.id === m.utilisateurId))
            .map(m => m.utilisateurId)
    );

    render();

    function render() {
        const membresActuels = ouvriers.filter(o => membresOuvrierIds.has(o.id));

        const filtered = ouvriers.filter(o => {
            if (membresOuvrierIds.has(o.id)) return false; // déjà affiché en chip au-dessus
            if (!searchQuery) return true;
            return o.nom.toLowerCase().includes(searchQuery.toLowerCase());
        });

        container.innerHTML = `
      <div class="space-y-3">

        <div class="flex flex-wrap gap-2">
          ${membresActuels.length === 0
                ? `<p class="text-xs italic text-muted">Aucun ouvrier assigné à ce chantier.</p>`
                : membresActuels.map(o => `
              <span class="flex items-center gap-2 rounded-xl bg-primary/10 py-1.5 pl-3 pr-2 text-xs font-bold text-primary">
                <span class="flex h-5 w-5 items-center justify-center rounded-full bg-primary/20 text-[9px]">${getInitials(o.nom)}</span>
                ${escapeHtml(o.nom)}
                <button
                  class="btn-retirer-membre flex h-4 w-4 items-center justify-center rounded-full text-primary/70 transition hover:bg-primary/20 hover:text-primary"
                  data-utilisateur-id="${escapeHtml(o.id)}"
                  data-membre-nom="${escapeHtml(o.nom)}"
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
              id="rechercheOuvrierInput"
              value="${escapeHtml(searchQuery)}"
              placeholder="Rechercher un ouvrier à ajouter..."
              autocomplete="off"
              class="w-full rounded-xl border border-bordure bg-fond py-2 pl-8 pr-4 text-sm text-texte outline-none transition placeholder:text-muted/50 focus:border-primary focus:ring-2 focus:ring-primary/20"
            />
          </div>

          ${dropdownOuvert ? `
            <div class="absolute z-20 mt-1 max-h-56 w-full overflow-y-auto rounded-xl border border-bordure bg-carte shadow-card">
              ${filtered.length === 0
                    ? `<p class="px-3 py-3 text-xs italic text-muted">Aucun ouvrier trouvé.</p>`
                    : filtered.map(o => {
                        const occupe = occupesAilleurs.has(o.id);
                        return `
                      <button
                        type="button"
                        class="btn-ajouter-membre flex w-full items-center gap-2.5 px-3 py-2 text-left text-sm transition
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

        bindEvents();
    }

    function replacerCurseurFin() {
        const el = container.querySelector("#rechercheOuvrierInput");
        if (el) {
            el.focus();
            el.selectionStart = el.selectionEnd = el.value.length;
        }
    }

    function bindEvents() {
        const input = container.querySelector("#rechercheOuvrierInput");

        input?.addEventListener("focus", () => {
            dropdownOuvert = true;
            render();
            replacerCurseurFin();
        });

        input?.addEventListener("input", e => {
            searchQuery = e.target.value;
            dropdownOuvert = true;
            render();
            replacerCurseurFin();
        });

        input?.addEventListener("blur", () => {
            // délai pour laisser le clic sur une option du dropdown s'exécuter avant fermeture
            setTimeout(() => {
                const inputActuel = container.querySelector("#rechercheOuvrierInput");
                if (document.activeElement === inputActuel) return; // toujours focus, ne pas fermer
                dropdownOuvert = false;
                render();
            }, 150);
        });

        container.querySelectorAll(".btn-ajouter-membre").forEach(btn => {
            btn.addEventListener("click", async () => {
                if (btn.disabled) return;
                const utilisateurId = btn.dataset.utilisateurId;

                try {
                    const nouveauMembre = await ajouterMembre(projetId, utilisateurId);
                    membresProjet.push(nouveauMembre);
                    membresOuvrierIds.add(utilisateurId);
                    searchQuery = "";
                    dropdownOuvert = false;
                    showToast("Ouvrier ajouté au chantier.");
                    render();
                    if (onChanged) await onChanged();
                } catch (err) {
                    showToast(err.message, "error");
                }
            });
        });

        container.querySelectorAll(".btn-retirer-membre").forEach(btn => {
            btn.addEventListener("click", () => {
                const utilisateurId = btn.dataset.utilisateurId;
                const nom = btn.dataset.membreNom;

                openConfirm({
                    message: `Retirer ${nom} de ce chantier ?`,
                    confirmLabel: "Retirer",
                    onConfirm: async () => {
                        try {
                            const membre = membresProjet.find(m => m.utilisateurId === utilisateurId);
                            if (membre) {
                                await retirerMembre(membre.id);
                                membresProjet.splice(membresProjet.indexOf(membre), 1);
                            }
                            membresOuvrierIds.delete(utilisateurId);
                            showToast("Ouvrier retiré du chantier.");
                            render();
                            if (onChanged) await onChanged();
                        } catch (err) {
                            showToast(err.message, "error");
                        }
                    },
                });
            });
        });
    }
}