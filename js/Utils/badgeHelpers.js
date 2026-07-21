import { getSession, isAdmin, isChef } from "./auth.js";
import { filtrerProjetsAccessibles } from "./projetAccessHelpers.js";
import { getProjets } from "../Services/projetService.js";
import { getSignalements, getSignalementsByProjet } from "../Services/signalementService.js";
import { getContexteMessagerie, estNonLue } from "../Pages/messageries/messagerieHelpers.js";
import { getOuCreerConversationProjet, getConversationsDirectes } from "../Services/conversationService.js";

/**
 * Nombre de conversations (projet ou directes) contenant un message non lu
 * par l'utilisateur connecté.
 */
export async function compterConversationsNonLues() {
    const session = getSession();
    if (!session) return 0;

    const contexte = await getContexteMessagerie(session);

    const conversationsProjet = await Promise.all(
        contexte.mesProjets.map(p => getOuCreerConversationProjet(p.id))
    );

    const toutesDirectes = await getConversationsDirectes();
    const mesDirectes = toutesDirectes.filter(c => c.participants.includes(session.id));

    const toutes = [...conversationsProjet, ...mesDirectes];
    return toutes.filter(c => estNonLue(c, session.id)).length;
}

/**
 * Nombre de signalements encore "En traitement" — pertinent uniquement
 * pour l'admin (tous) et le chef (ses projets).
 */
export async function compterSignalementsATraiter() {
    const session = getSession();
    if (!session) return 0;
    if (!isAdmin() && !isChef()) return 0;

    let signalements;
    if (isAdmin()) {
        signalements = await getSignalements();
    } else {
        const projets = await filtrerProjetsAccessibles(await getProjets(), session);
        const parProjet = await Promise.all(projets.map(p => getSignalementsByProjet(p.id)));
        signalements = parProjet.flat();
    }

    return signalements.filter(s => s.statut === "En traitement").length;
}