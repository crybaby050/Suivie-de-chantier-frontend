import { ENDPOINTS } from "../Config/api.js";
import { apiRequest } from "./apiClient.js";
import { createId } from "../Utils/id.js";
import { required } from "../Utils/validators.js";
import { updateDisponibilite } from "./utilisateurService.js";

function normalizeProjet(data) {
    return {
        id: data.id,
        nom: String(data.nom).trim(),
        adresse: String(data.adresse ?? "").trim(),
        description: String(data.description ?? "").trim(),
        dateDeDebut: data.dateDeDebut,
        dateDeFinPrevue: data.dateDeFinPrevue,
        statutProjet: data.statutProjet ?? "Planifier",
        chefId: data.chefId ?? null,
    };
}

export async function getProjets() {
    return apiRequest(ENDPOINTS.projets, {}, "Impossible de charger les projets.");
}

export async function getProjet(id) {
    return apiRequest(
        `${ENDPOINTS.projets}/${id}`,
        {},
        "Impossible de charger le projet."
    );
}

export async function createProjet(data) {
required(data.nom, "Le nom du projet est obligatoire.");
required(data.dateDeDebut, "La date de début est obligatoire.");
required(data.chefId, "Le chef de chantier est obligatoire.");

const projet = normalizeProjet({
id: createId("projet"),
...data,
    });

const result = await apiRequest(
ENDPOINTS.projets,
        { method: "POST", body: JSON.stringify(projet) },
"Impossible de créer le projet."
    );

await assurerChefDansMembres(projet.id, projet.chefId);

return result;
}

export async function updateProjet(id, data) {
    required(data.nom, "Le nom du projet est obligatoire.");
    required(data.chefId, "Le chef de chantier est obligatoire.");

    // Récupérer l'ancien projet pour comparer le chef
    const ancienProjet = await apiRequest(
        `${ENDPOINTS.projets}/${id}`,
        {},
        "Impossible de charger le projet."
    );

    const result = await apiRequest(
        `${ENDPOINTS.projets}/${id}`,
        { method: "PATCH", body: JSON.stringify(normalizeProjet({ id, ...data })) },
        "Impossible de modifier le projet."
    );

    // Chef changé : libérer l'ancien, occuper le nouveau
    if (ancienProjet.chefId && ancienProjet.chefId !== data.chefId) {
        await updateDisponibilite(ancienProjet.chefId, "Disponible");
        await updateDisponibilite(data.chefId, "Occuper");
    }

    // Projet terminé ou suspendu : libérer tout le monde
    if (["Terminer", "Suspendu"].includes(data.statutProjet)) {
        await libererMembres(id);
        // Libérer aussi le chef
        await updateDisponibilite(data.chefId, "Disponible");
    }

    return result;
}

export async function deleteProjet(id) {
    // Libérer les membres avant suppression
    await libererMembres(id);

    return apiRequest(
        `${ENDPOINTS.projets}/${id}`,
        { method: "DELETE" },
        "Impossible de supprimer le projet."
    );
}

// Repasse tous les membres du projet en "Disponible"
async function libererMembres(projetId) {
    const membres = await apiRequest(
        `${ENDPOINTS.projetMembres}?projetId=${projetId}`,
        {},
        "Impossible de charger les membres du projet."
    );

    await Promise.all(
        membres.map((m) => updateDisponibilite(m.utilisateurId, "Disponible"))
    );
}

/**
 * S'assure que le chef de chantier désigné du projet figure bien
 * dans projetMembres (ne fait rien s'il y est déjà).
 */
async function assurerChefDansMembres(projetId, chefId) {
    if (!chefId) return;

    const membres = await apiRequest(
        `${ENDPOINTS.projetMembres}?projetId=${projetId}&utilisateurId=${chefId}`,
        {},
        "Impossible de vérifier les membres du projet."
    );

    if (membres.length > 0) return; // déjà membre

    const membre = {
        id: createId("pm"),
        projetId,
        utilisateurId: chefId,
        dateAjout: new Date().toISOString(),
    };

    await apiRequest(
        ENDPOINTS.projetMembres,
        { method: "POST", body: JSON.stringify(membre) },
        "Impossible d'ajouter le chef aux membres du projet."
    );
}