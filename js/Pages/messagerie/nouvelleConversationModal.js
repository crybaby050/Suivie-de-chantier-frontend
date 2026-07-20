import { escapeHtml } from "../../Utils/html.js";
import { openModal } from "../../Components/modal.js";
import { getInitials } from "./messagerieHelpers.js";

/**
 * Ouvre une modale de recherche pour démarrer une nouvelle conversation directe.
 * @param {object[]} contacts - utilisateurs partageant un projet avec la personne connectée
 * @param {Function} onSelect - appelé avec l'utilisateur choisi
 */
export function openNouvelleConversationModal(contacts, onSelect) {
    let searchQuery = "";
    let modalRoot;

    openModal({
        title: "Nouveau message",
        icon: "fa-comment-dots",
        confirmLabel: "Fermer",
        confirmClass: "bg-primary shadow-primary/20 hover:bg-secondary",
        body: bodyHTML(contacts, searchQuery),
        onMount: modal => {
            modalRoot = modal;
            bindEvents();
        },
        onConfirm: () => true,
    });

    function bodyHTML(liste, query) {
        const filtered = liste.filter(u => !query || u.nom.toLowerCase().includes(query.toLowerCase()));
        return `
      <div class="space-y-3">
        <div class="relative">
          <i class="fa-solid fa-magnifying-glass absolute left-3 top-1/2 -translate-y-1/2 text-xs text-muted"></i>
          <input
            type="text" id="rechercheContactInput" value="${escapeHtml(query)}"
            placeholder="Rechercher un contact..." autocomplete="off"
            class="w-full rounded-xl border border-bordure bg-fond py-2 pl-8 pr-4 text-sm text-texte outline-none transition placeholder:text-muted/50 focus:border-primary focus:ring-2 focus:ring-primary/20"
          />
        </div>
        <div class="max-h-72 space-y-1 overflow-y-auto">
          ${filtered.length === 0
                ? `<p class="py-6 text-center text-xs italic text-muted">Aucun contact trouvé.</p>`
                : filtered.map(u => `
              <button type="button" class="btn-choisir-contact flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left transition hover:bg-fond" data-utilisateur-id="${escapeHtml(u.id)}">
                <span class="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-black text-primary">${getInitials(u.nom)}</span>
                <span class="min-w-0 flex-1">
                  <span class="block truncate text-sm font-bold text-texte">${escapeHtml(u.nom)}</span>
                  <span class="block truncate text-xs text-muted">${escapeHtml(u.roleGlobal ?? "")}</span>
                </span>
              </button>
            `).join("")
            }
        </div>
      </div>
    `;
    }

    function bindEvents() {
        const input = modalRoot.querySelector("#rechercheContactInput");
        input?.addEventListener("input", e => {
            searchQuery = e.target.value;
            const container = modalRoot.querySelector(".space-y-3");
            if (container) container.outerHTML = bodyHTML(contacts, searchQuery);
            bindEvents();
            modalRoot.querySelector("#rechercheContactInput")?.focus();
        });

        modalRoot.querySelectorAll(".btn-choisir-contact").forEach(btn => {
            btn.addEventListener("click", () => {
                const contact = contacts.find(c => c.id === btn.dataset.utilisateurId);
                if (contact) onSelect(contact);
            });
        });
    }
}