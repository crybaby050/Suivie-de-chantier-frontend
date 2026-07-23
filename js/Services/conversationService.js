import { ENDPOINTS } from "../Config/api.js";
import { apiRequest } from "./apiClient.js";
import { createId } from "../Utils/id.js";

function normalizeConversation(data) {
    return {
        id: data.id,
        type: data.type, // "Directe" | "Projet"
        projetId: data.projetId ?? null,
        participants: data.participants ?? [], // utilisé uniquement pour "Directe"
        dernierMessage: data.dernierMessage ?? "",
        dateDernierMessage: data.dateDernierMessage ?? null,
        dernierAuteurId: data.dernierAuteurId ?? null,
        lecturesParUtilisateur: data.lecturesParUtilisateur ?? {},
    };
}

export async function getConversation(id) {
    return apiRequest(`${ENDPOINTS.conversations}/${id}`, {}, "Impossible de charger la conversation.");
}

export async function getConversationsDirectes() {
    return apiRequest(`${ENDPOINTS.conversations}?type=Directe`, {}, "Impossible de charger les conversations.");
}

/**
 * Retrouve la conversation de projet, ou la crée si elle n'existe pas encore.
 */
export async function getOuCreerConversationProjet(projetId) {
    const existantes = await apiRequest(
        `${ENDPOINTS.conversations}?type=Projet&projetId=${projetId}`,
        {},
        "Impossible de charger la conversation du projet."
    );
    if (existantes.length > 0) return existantes[0];

    const conversation = normalizeConversation({ id: createId("conv"), type: "Projet", projetId });
    return apiRequest(
        ENDPOINTS.conversations,
        { method: "POST", body: JSON.stringify(conversation) },
        "Impossible de créer la conversation du projet."
    );
}

/**
 * Retrouve la conversation directe entre deux utilisateurs, ou la crée.
 */
export async function getOuCreerConversationDirecte(userId1, userId2) {
    const toutes = await getConversationsDirectes();
    const existante = toutes.find(c =>
        c.participants.includes(userId1) && c.participants.includes(userId2)
    );
    if (existante) return existante;

    const conversation = normalizeConversation({
        id: createId("conv"),
        type: "Directe",
        participants: [userId1, userId2],
    });
    return apiRequest(
        ENDPOINTS.conversations,
        { method: "POST", body: JSON.stringify(conversation) },
        "Impossible de créer la conversation."
    );
}

export async function marquerConversationLue(conversationId, utilisateurId) {
    const conv = await getConversation(conversationId);
    const lectures = { ...(conv.lecturesParUtilisateur ?? {}), [utilisateurId]: new Date().toISOString() };
    return apiRequest(
        `${ENDPOINTS.conversations}/${conversationId}`,
        { method: "PATCH", body: JSON.stringify({ lecturesParUtilisateur: lectures }) },
        "Impossible de marquer la conversation comme lue."
    );
}

export async function mettreAJourApercu(conversationId, { contenu, photos, auteurId, dateEnvoi }) {
    const apercu = contenu?.trim() ? contenu.trim().slice(0, 80) : (photos?.length ? "Photo" : "");
    return apiRequest(
        `${ENDPOINTS.conversations}/${conversationId}`,
        {
            method: "PATCH",
            body: JSON.stringify({ dernierMessage: apercu, dateDernierMessage: dateEnvoi, dernierAuteurId: auteurId }),
        },
        "Impossible de mettre à jour la conversation."
    );
}