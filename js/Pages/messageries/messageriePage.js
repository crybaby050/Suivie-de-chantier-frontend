import { getSession } from "../../Utils/auth.js";
import { getContexteMessagerie } from "./messagerieHelpers.js";
import { getOuCreerConversationProjet, getOuCreerConversationDirecte, marquerConversationLue, getConversationsDirectes } from "../../Services/conversationService.js";
import { getMessagesByConversation } from "../../Services/messageService.js";
import { renderMessagerieListe } from "./messagerieListe.js";
import { renderMessagerieThread, bindThreadEvents } from "./messagerieThread.js";
import { openNouvelleConversationModal } from "./nouvelleConversationModal.js";
import { showBrickLoader, brickCycleDelay } from "../../Utils/pageLoader.js";
import { refreshSidebarBadges } from "../../Components/sidebar.js";

let session;
let contexte;
let conversations = [];
let conversationActiveId = null;
let messagesActifs = [];
let vueMobile = "liste"; // "liste" | "thread"
let pollingInterval = null;

export async function renderMessageriePage() {
  const app = document.getElementById("app");
  session = getSession();

  const stopLoader = showBrickLoader(app);

  [contexte] = await Promise.all([getContexteMessagerie(session), brickCycleDelay()]);
  await chargerConversations();

  stopLoader();
  renderPage();
  demarrerPolling();
}

async function chargerConversations() {
  const conversationsProjet = await Promise.all(
    contexte.mesProjets.map(async p => {
      const conv = await getOuCreerConversationProjet(p.id);
      return { ...conv, displayNom: p.nom };
    })
  );

  const toutesDirectes = await getConversationsDirectes();
  const mesDirectes = toutesDirectes.filter(c => c.participants.includes(session.id));

  const conversationsDirectes = mesDirectes.map(c => {
    const autreId = c.participants.find(id => id !== session.id);
    const autre = contexte.utilisateurs.find(u => u.id === autreId);
    return { ...c, displayNom: autre?.nom ?? "Utilisateur inconnu" };
  });

  conversations = [...conversationsProjet, ...conversationsDirectes]
    .sort((a, b) => new Date(b.dateDernierMessage ?? 0) - new Date(a.dateDernierMessage ?? 0));
}

function renderPage() {
  const app = document.getElementById("app");
  const conversationActive = conversations.find(c => c.id === conversationActiveId) ?? null;
  const utilisateursParId = Object.fromEntries(contexte.utilisateurs.map(u => [u.id, u]));

  // Capturés AVANT de remplacer le HTML, pour ne pas perdre la position de lecture
  // ni le focus du champ de saisie lors d'un re-rendu (polling, ajout de photo, etc.)
  const zoneAvant = document.getElementById("messagesScrollZone");
  const collerEnBas = zoneAvant
    ? (zoneAvant.scrollHeight - zoneAvant.scrollTop - zoneAvant.clientHeight < 80)
    : true;
  const inputAvaitFocus = document.activeElement?.id === "messageInput";

  app.innerHTML = `
    <div class="h-[calc(100vh-8rem)] overflow-hidden rounded-2xl border border-bordure shadow-card">
      <div class="grid h-full min-h-0 grid-cols-1 md:grid-cols-[320px_1fr]">
        <div class="${vueMobile === "thread" ? "hidden md:block" : ""} h-full min-h-0">
          ${renderMessagerieListe({ conversations, conversationActiveId, session })}
        </div>
        <div class="${vueMobile === "liste" ? "hidden md:block" : ""} h-full min-h-0">
          ${renderMessagerieThread({ conversation: conversationActive, messages: messagesActifs, session, utilisateursParId })}
        </div>
      </div>
    </div>
  `;

  bindEvents();

  if (conversationActive) {
    bindThreadEvents({
      conversationId: conversationActive.id,
      collerEnBas,
      inputAvaitFocus,
      onRetour: () => { vueMobile = "liste"; renderPage(); },
      onEnvoye: async (doitRecharger = true) => {
        if (doitRecharger === null) { renderPage(); return; } // juste réafficher les aperçus de fichiers
        await ouvrirConversation(conversationActive.id, false);
      },
      onSupprime: async () => { await ouvrirConversation(conversationActive.id, false); },
    });
  }
}

function bindEvents() {
  document.getElementById("btnNouvelleConversation")?.addEventListener("click", () => {
    openNouvelleConversationModal(contexte.contacts, async utilisateur => {
      const conv = await getOuCreerConversationDirecte(session.id, utilisateur.id);
      await chargerConversations();
      await ouvrirConversation(conv.id, true);
    });
  });

  document.querySelectorAll(".conversation-item").forEach(btn => {
    btn.addEventListener("click", () => ouvrirConversation(btn.dataset.conversationId, true));
  });
}

async function ouvrirConversation(conversationId, changerVue) {
  conversationActiveId = conversationId;
  messagesActifs = await getMessagesByConversation(conversationId);
  await marquerConversationLue(conversationId, session.id);
  await chargerConversations();
  if (changerVue) vueMobile = "thread";
  renderPage();
  refreshSidebarBadges();
}

function demarrerPolling() {
  if (pollingInterval) clearInterval(pollingInterval);

  pollingInterval = setInterval(async () => {
    if (!document.querySelector("#messagesScrollZone") && !document.getElementById("btnNouvelleConversation")) {
      clearInterval(pollingInterval);
      return;
    }

    const messageInput = document.getElementById("messageInput");
    const utilisateurEnTrainDecrire = document.activeElement === messageInput && messageInput.value.trim().length > 0;
    if (utilisateurEnTrainDecrire) return;

    await chargerConversations();
    if (conversationActiveId) {
      messagesActifs = await getMessagesByConversation(conversationActiveId);
    }
    renderPage();
  }, 6000);
}