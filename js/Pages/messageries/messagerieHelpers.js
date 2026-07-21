import { getProjets } from "../../Services/projetService.js";
import { getUtilisateurs } from "../../Services/utilisateurService.js";
import { getMembres } from "../../Services/projetMembreService.js";
import { isAdmin } from "../../Utils/auth.js";

// Paires de rôles qui n'ont pas le droit de se contacter en message direct,
// même s'ils partagent un projet (ils se croisent uniquement dans la discussion de groupe).
const PAIRES_INTERDITES = [
    ["Ouvrier", "Client"],
];

function paireAutorisee(roleA, roleB) {
    return !PAIRES_INTERDITES.some(([r1, r2]) =>
        (roleA === r1 && roleB === r2) || (roleA === r2 && roleB === r1)
    );
}

export async function getContexteMessagerie(session) {
    const [projets, utilisateurs, membres] = await Promise.all([
        getProjets(),
        getUtilisateurs(),
        getMembres(),
    ]);

    // L'admin est automatiquement présent sur la discussion de CHAQUE projet
    let mesProjets;
    if (isAdmin()) {
        mesProjets = projets;
    } else {
        const mesProjetIds = new Set(
            membres.filter(m => m.utilisateurId === session.id).map(m => m.projetId)
        );
        mesProjets = projets.filter(p => mesProjetIds.has(p.id));
    }

    const mesProjetIdsSet = new Set(mesProjets.map(p => p.id));

    const contactIds = new Set(
        membres
            .filter(m => mesProjetIdsSet.has(m.projetId) && m.utilisateurId !== session.id)
            .map(m => m.utilisateurId)
    );

    const contacts = utilisateurs.filter(u =>
        contactIds.has(u.id) && paireAutorisee(session.roleGlobal, u.roleGlobal)
    );

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