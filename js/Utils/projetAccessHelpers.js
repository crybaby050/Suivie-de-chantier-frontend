import { isAdmin, isChef } from "./auth.js";
import { apiRequest } from "../Services/apiClient.js";
import { ENDPOINTS } from "../Config/api.js";

/**
 * Filtre une liste de projets selon ce que l'utilisateur connecté a le droit de voir.
 * - Admin       : tous les projets
 * - Chef        : uniquement les projets dont il est le chef (projet.chefId)
 * - Ouvrier/Client : uniquement les projets où il est membre (projetMembres)
 */
export async function filtrerProjetsAccessibles(allProjets, session) {
    if (isAdmin()) return allProjets;

    if (isChef()) {
        return allProjets.filter(p => p.chefId === session.id);
    }

    const memberships = await apiRequest(
        `${ENDPOINTS.projetMembres}?utilisateurId=${session.id}`,
        {},
        "Impossible de charger vos projets."
    );
    const projetIds = memberships.map(m => m.projetId);
    return allProjets.filter(p => projetIds.includes(p.id));
}