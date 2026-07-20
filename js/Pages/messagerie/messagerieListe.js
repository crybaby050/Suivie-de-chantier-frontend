import { escapeHtml } from "../../Utils/html.js";
import { getInitials, formatApercuDate, estNonLue } from "./messagerieHelpers.js";

/**
 * Rend le panneau de gauche : liste des conversations (projets puis directes).
 */
export function renderMessagerieListe({ conversations, conversationActiveId, session }) {
    return `
    <div class="flex h-full flex-col border-r border-bordure bg-carte">
      <div class="flex items-center justify-between border-b border-bordure px-4 py-3.5">
        <h2 class="text-base font-black text-texte">Messages</h2>
        <button id="btnNouvelleConversation" class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary transition hover:bg-primary/20" title="Nouveau message">
          <i class="fa-solid fa-square-pen text-xs"></i>
        </button>
      </div>
      <div class="flex-1 overflow-y-auto">
        ${conversations.length === 0
            ? `<p class="px-4 py-8 text-center text-xs italic text-muted">Aucune conversation pour le moment.</p>`
            : conversations.map(c => renderItem(c, conversationActiveId, session)).join("")
        }
      </div>
    </div>
  `;
}

function renderItem(conv, activeId, session) {
    const nonLue = estNonLue(conv, session.id);
    const estActive = conv.id === activeId;
    const icone = conv.type === "Projet"
        ? `<span class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-secondary/10 text-secondary"><i class="fa-solid fa-building text-sm"></i></span>`
        : `<span class="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-black text-primary">${getInitials(conv.displayNom)}</span>`;

    return `
    <button
      class="conversation-item flex w-full items-center gap-3 border-b border-bordure/60 px-4 py-3 text-left transition hover:bg-fond ${estActive ? "bg-fond" : ""}"
      data-conversation-id="${escapeHtml(conv.id)}"
    >
      ${icone}
      <div class="min-w-0 flex-1">
        <div class="flex items-center justify-between gap-2">
          <span class="truncate text-sm ${nonLue ? "font-black text-texte" : "font-bold text-texte"}">${escapeHtml(conv.displayNom)}</span>
          <span class="flex-shrink-0 text-[10px] text-muted">${formatApercuDate(conv.dateDernierMessage)}</span>
        </div>
        <div class="flex items-center justify-between gap-2">
          <span class="truncate text-xs ${nonLue ? "font-bold text-texte" : "text-muted"}">${escapeHtml(conv.dernierMessage || "Aucun message")}</span>
          ${nonLue ? `<span class="h-2 w-2 flex-shrink-0 rounded-full bg-primary"></span>` : ""}
        </div>
      </div>
    </button>
  `;
}