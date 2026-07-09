import { ENDPOINTS } from "../Config/api.js";
import { apiRequest } from "./apiClient.js";
import { createId } from "../Utils/id.js";
import { required, requirePositiveNumber, requireNonNegativeNumber } from "../Utils/validators.js";

function normalizeMateriau(data) {
    return {
        id: data.id,
        projetId: data.projetId,
        nom: String(data.nom).trim(),
        quantiteCommander: Number(data.quantiteCommander ?? 0),
        quantiteLivrer: Number(data.quantiteLivrer ?? 0),
        prix: Number(data.prix ?? 0),
    };
}

export async function getMateriaux() {
    return apiRequest(ENDPOINTS.materiaux, {}, "Impossible de charger les matériaux.");
}

export async function getMateriauxByProjet(projetId) {
    return apiRequest(
        `${ENDPOINTS.materiaux}?projetId=${projetId}`,
        {},
        "Impossible de charger les matériaux du projet."
    );
}

export async function createMateriau(data) {
    required(data.nom, "Le nom du matériau est obligatoire.");
    required(data.projetId, "Le projet est obligatoire.");
    requirePositiveNumber(data.quantiteCommander, "La quantité commandée doit être supérieure à 0.");

    const materiau = normalizeMateriau({
        id: createId("mat"),
        ...data,
    });

    return apiRequest(
        ENDPOINTS.materiaux,
        { method: "POST", body: JSON.stringify(materiau) },
        "Impossible de créer le matériau."
    );
}

export async function updateMateriau(id, data) {
    required(data.nom, "Le nom du matériau est obligatoire.");

    return apiRequest(
        `${ENDPOINTS.materiaux}/${id}`,
        { method: "PATCH", body: JSON.stringify(normalizeMateriau({ id, ...data })) },
        "Impossible de modifier le matériau."
    );
}

export async function enregistrerLivraison(id, quantiteLivree) {
    requireNonNegativeNumber(quantiteLivree, "La quantité livrée doit être un nombre positif.");

    return apiRequest(
        `${ENDPOINTS.materiaux}/${id}`,
        {
            method: "PATCH",
            body: JSON.stringify({ quantiteLivrer: Number(quantiteLivree) }),
        },
        "Impossible d'enregistrer la livraison."
    );
}

export function isEnAlerte(materiau) {
    if (!materiau.quantiteCommander) return false;
    return (materiau.quantiteLivrer / materiau.quantiteCommander) < 0.8;
}

export async function deleteMateriau(id) {
    return apiRequest(
        `${ENDPOINTS.materiaux}/${id}`,
        { method: "DELETE" },
        "Impossible de supprimer le matériau."
    );
}