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

    // Marquer le chef comme occupé
    await updateDisponibilite(data.chefId, "Occuper");

    return result;
}

export async function updateProjet(id, data) {
    required(data.nom, "Le nom du projet est obligatoire.");
    required(data.chefId, "Le chef de chantier est obligatoire.");

    const result = await apiRequest(
        `${ENDPOINTS.projets}/${id}`,
        { method: "PATCH", body: JSON.stringify(normalizeProjet({ id, ...data })) },
        "Impossible de modifier le projet."
    );

    // Si le projet est terminé ou suspendu, libérer tous les membres
    if (["Terminer", "Suspendu"].includes(data.statutProjet)) {
        await libererMembres(id);
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