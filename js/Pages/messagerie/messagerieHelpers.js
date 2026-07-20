import { getProjets } from "../../Services/projetService.js";
import { getUtilisateurs } from "../../Services/utilisateurService.js";
import { getMembres } from "../../Services/projetMembreService.js";

/**
 * Charge le contexte nécessaire à la messagerie pour l'utilisateur connecté :
 * ses projets, l'ensemble des utilisateurs, et les contacts avec qui il
 * partage au moins un projet.
 */
export async function getContexteMessagerie(session) {
    const [projets, utilisateurs, membres] = await Promise.all([
        getProjets(),
        getUtilisateurs(),
        getMembres(),
    ]);

    const mesProjetIds = new Set(
        membres.filter(m => m.utilisateurId === session.id).map(m => m.projetId)
    );
    const mesProjets = projets.filter(p => mesProjetIds.has(p.id));

    const contactIds = new Set(
        membres
            .filter(m => mesProjetIds.has(m.projetId) && m.utilisateurId !== session.id)
            .map(m => m.utilisateurId)
    );
    const contacts = utilisateurs.filter(u => contactIds.has(u.id));

    return { mesProjets, contacts, utilisateurs };
}

export function getInitials(nom = "") {
    return nom.split(" ").map(w => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}

export function formatHeure(date) {
    if (!date) return "";
    return new Date(date).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" });
}

export function formatApercuDate(date) {
    if (!date) return "";
    const d = new Date(date);
    const aujourdHui = new Date();
    const estAujourdHui = d.toDateString() === aujourdHui.toDateString();
    if (estAujourdHui) return formatHeure(date);
    return d.toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}

export function estNonLue(conversation, utilisateurId) {
    if (!conversation.dateDernierMessage) return false;
    if (conversation.dernierAuteurId === utilisateurId) return false;
    const derniereLecture = conversation.lecturesParUtilisateur?.[utilisateurId];
    if (!derniereLecture) return true;
    return new Date(conversation.dateDernierMessage) > new Date(derniereLecture);
}