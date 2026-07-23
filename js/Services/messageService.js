import { ENDPOINTS } from "../Config/api.js";
import { apiRequest } from "./apiClient.js";
import { createId } from "../Utils/id.js";
import { getSession } from "../Utils/auth.js";
import { mettreAJourApercu } from "./conversationService.js";

function normalizeMessage(data) {
    return {
        id: data.id,
        conversationId: data.conversationId,
        auteurId: data.auteurId,
        contenu: String(data.contenu ?? "").trim(),
        photos: data.photos ?? [],
        dateEnvoi: data.dateEnvoi ?? new Date().toISOString(),
        supprime: data.supprime ?? false,
    };
}

export async function getMessagesByConversation(conversationId) {
    const messages = await apiRequest(
        `${ENDPOINTS.messages}?conversationId=${conversationId}`,
        {},
        "Impossible de charger les messages."
    );
    return messages
        .filter(m => !m.supprime)
        .sort((a, b) => new Date(a.dateEnvoi) - new Date(b.dateEnvoi));
}

export async function envoyerMessage({ conversationId, contenu, photos = [] }) {
    if (!contenu?.trim() && photos.length === 0) {
        throw new Error("Le message ne peut pas être vide.");
    }

    const session = getSession();
    const message = normalizeMessage({
        id: createId("msg"),
        conversationId,
        auteurId: session?.id,
        contenu,
        photos,
        dateEnvoi: new Date().toISOString(),
    });

    const result = await apiRequest(
        ENDPOINTS.messages,
        { method: "POST", body: JSON.stringify(message) },
        "Impossible d'envoyer le message."
    );

    await mettreAJourApercu(conversationId, {
        contenu: message.contenu,
        photos: message.photos,
        auteurId: message.auteurId,
        dateEnvoi: message.dateEnvoi,
    });

    return result;
}

export async function supprimerMessage(id) {
    const session = getSession();
    const message = await apiRequest(`${ENDPOINTS.messages}/${id}`, {}, "Impossible de charger le message.");

    if (message.auteurId !== session?.id) {
        throw new Error("Vous ne pouvez supprimer que vos propres messages.");
    }

    return apiRequest(
        `${ENDPOINTS.messages}/${id}`,
        { method: "PATCH", body: JSON.stringify({ supprime: true }) },
        "Impossible de supprimer le message."
    );
}