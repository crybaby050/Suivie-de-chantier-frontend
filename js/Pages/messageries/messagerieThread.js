import { escapeHtml } from "../../Utils/html.js";
import { showToast } from "../../Components/toast.js";
import { openConfirm } from "../../Components/modal.js";
import { envoyerMessage, supprimerMessage } from "../../Services/messageService.js";
import { uploadImageCloudinary } from "../../Services/cloudinaryService.js";
import { getInitials, formatHeure } from "./messagerieHelpers.js";

let fichiersEnAttente = [];

/**
 * Rend le panneau de droite : fil de messages + composeur.
 */
export function renderMessagerieThread({ conversation, messages, session, utilisateursParId }) {
    if (!conversation) {
        return `
      <div class="flex h-full flex-col items-center justify-center bg-fond text-center">
        <i class="fa-solid fa-comments text-4xl text-muted/30"></i>
        <p class="mt-3 text-sm font-semibold text-muted">Sélectionnez une conversation pour commencer.</p>
      </div>
    `;
    }

    return `
    <div class="flex h-full min-h-0 flex-col bg-fond">

      <div class="flex flex-shrink-0 items-center gap-3 border-b border-bordure bg-carte px-4 py-3.5">
        <button id="btnRetourListe" class="flex h-8 w-8 items-center justify-center rounded-lg text-muted transition hover:bg-fond md:hidden">
          <i class="fa-solid fa-arrow-left text-xs"></i>
        </button>
        ${conversation.type === "Projet"
            ? `<span class="flex h-9 w-9 items-center justify-center rounded-xl bg-secondary/10 text-secondary"><i class="fa-solid fa-building text-sm"></i></span>`
            : `<span class="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-black text-primary">${getInitials(conversation.displayNom)}</span>`
        }
        <div class="min-w-0 flex-1">
          <p class="truncate text-sm font-black text-texte">${escapeHtml(conversation.displayNom)}</p>
          ${conversation.type === "Projet" ? `<p class="text-[11px] text-muted">Discussion du chantier</p>` : ""}
        </div>
      </div>

        <div id="messagesScrollZone" class="min-h-0 flex-1 space-y-3 overflow-y-auto px-4 py-4">
        ${messages.length === 0
            ? `<p class="py-8 text-center text-xs italic text-muted">Aucun message pour l'instant. Dites bonjour.</p>`
            : messages.map(m => renderBulle(m, session, utilisateursParId, conversation.type)).join("")
        }
      </div>

        <div class="flex-shrink-0 border-t border-bordure bg-carte p-3">
        ${fichiersEnAttente.length > 0 ? `
          <div class="mb-2 flex flex-wrap gap-2">
            ${fichiersEnAttente.map((f, i) => `
              <div class="relative h-14 w-14 overflow-hidden rounded-lg">
                <img src="${f.preview}" class="h-full w-full object-cover" />
                <button type="button" class="btn-retirer-fichier absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-bloque text-white text-[9px]" data-index="${i}">
                  <i class="fa-solid fa-xmark"></i>
                </button>
              </div>
            `).join("")}
          </div>
        ` : ""}
        <div class="flex items-end gap-2">
          <label for="messagePhotoInput" class="flex h-10 w-10 flex-shrink-0 cursor-pointer items-center justify-center rounded-xl border border-bordure bg-fond text-muted transition hover:bg-primary/10 hover:text-primary">
            <i class="fa-solid fa-paperclip text-sm"></i>
          </label>
          <input type="file" id="messagePhotoInput" accept="image/*" multiple class="hidden" />
          <textarea
            id="messageInput" rows="1" placeholder="Écrire un message..."
            class="max-h-28 flex-1 resize-none rounded-xl border border-bordure bg-fond px-3 py-2.5 text-sm text-texte outline-none transition placeholder:text-muted/50 focus:border-primary focus:ring-2 focus:ring-primary/20"
          ></textarea>
          <button id="btnEnvoyerMessage" class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-primary text-white shadow-soft transition hover:bg-secondary">
            <i class="fa-solid fa-paper-plane text-sm"></i>
          </button>
        </div>
      </div>
    </div>
  `;
}

function renderBulle(message, session, utilisateursParId, typeConv) {
    const estMoi = message.auteurId === session.id;
    const auteur = utilisateursParId[message.auteurId];

    return `
    <div class="flex ${estMoi ? "justify-end" : "justify-start"}" data-message-id="${escapeHtml(message.id)}">
      <div class="group max-w-[75%]">
        ${!estMoi && typeConv === "Projet" ? `<p class="mb-0.5 px-1 text-[11px] font-bold text-muted">${escapeHtml(auteur?.nom ?? "Inconnu")}</p>` : ""}
        <div class="rounded-2xl px-3.5 py-2.5 ${estMoi ? "bg-primary text-white" : "bg-carte text-texte shadow-card"}">
          ${message.photos?.length > 0 ? `
            <div class="mb-1.5 grid grid-cols-2 gap-1.5">
              ${message.photos.map(url => `
                <a href="${escapeHtml(url)}" target="_blank" rel="noopener" class="block aspect-square overflow-hidden rounded-lg">
                  <img src="${escapeHtml(url)}" class="h-full w-full object-cover" />
                </a>
              `).join("")}
            </div>
          ` : ""}
          ${message.contenu ? `<p class="whitespace-pre-wrap text-sm leading-6">${escapeHtml(message.contenu)}</p>` : ""}
        </div>
        <div class="mt-0.5 flex items-center gap-2 px-1 ${estMoi ? "justify-end" : "justify-start"}">
          <span class="text-[10px] text-muted">${formatHeure(message.dateEnvoi)}</span>
          ${estMoi ? `
            <button class="btn-supprimer-message text-[10px] text-muted opacity-0 transition hover:text-bloque group-hover:opacity-100" data-message-id="${escapeHtml(message.id)}">
              Supprimer
            </button>
          ` : ""}
        </div>
      </div>
    </div>
  `;
}

let conversationIdPrecedente = null;

export function bindThreadEvents({ conversationId, onEnvoye, onRetour, onSupprime }) {
    if (conversationId !== conversationIdPrecedente) {
        fichiersEnAttente = [];
        conversationIdPrecedente = conversationId;
    }

    document.getElementById("btnRetourListe")?.addEventListener("click", onRetour);

    const scrollZone = document.getElementById("messagesScrollZone");
    if (scrollZone) scrollZone.scrollTop = scrollZone.scrollHeight;

    const input = document.getElementById("messagePhotoInput");
    input?.addEventListener("change", () => {
        Array.from(input.files).forEach(file => {
            fichiersEnAttente.push({ file, preview: URL.createObjectURL(file) });
        });
        onEnvoye(null); // redemande un rendu pour afficher les aperçus, sans envoyer
    });

    document.querySelectorAll(".btn-retirer-fichier").forEach(btn => {
        btn.addEventListener("click", () => {
            fichiersEnAttente.splice(Number(btn.dataset.index), 1);
            onEnvoye(null);
        });
    });

    const messageInput = document.getElementById("messageInput");
    const btnEnvoyer = document.getElementById("btnEnvoyerMessage");

    const envoyer = async () => {
        const contenu = messageInput?.value ?? "";
        if (!contenu.trim() && fichiersEnAttente.length === 0) return;

        btnEnvoyer.disabled = true;
        try {
            const photos = [];
            for (const f of fichiersEnAttente) {
                const url = await uploadImageCloudinary(f.file);
                photos.push(url);
            }
            await envoyerMessage({ conversationId, contenu, photos });
            fichiersEnAttente = [];
            if (messageInput) messageInput.value = "";
            await onEnvoye();
        } catch (err) {
            showToast(err.message, "error");
        } finally {
            btnEnvoyer.disabled = false;
        }
    };

    btnEnvoyer?.addEventListener("click", envoyer);
    messageInput?.addEventListener("keydown", e => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            envoyer();
        }
    });

    document.querySelectorAll(".btn-supprimer-message").forEach(btn => {
        btn.addEventListener("click", () => {
            openConfirm({
                message: "Supprimer ce message ?",
                confirmLabel: "Supprimer",
                onConfirm: async () => {
                    try {
                        await supprimerMessage(btn.dataset.messageId);
                        await onSupprime();
                    } catch (err) {
                        showToast(err.message, "error");
                    }
                },
            });
        });
    });
}