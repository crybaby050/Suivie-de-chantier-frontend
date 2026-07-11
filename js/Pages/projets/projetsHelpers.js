import { escapeHtml } from "../../Utils/html.js";

export function getStatutBadge(statut) {
    const MAP = {
        "En cours": "bg-secondary/10 text-secondary",
        "Planifier": "bg-attente/10 text-attente",
        "Terminer": "bg-succes/10 text-succes",
        "Suspendu": "bg-inactif/10 text-inactif",
        "En attente": "bg-attente/10 text-attente",
        "Bloquer": "bg-bloque/10 text-bloque",
    };
    const cls = MAP[statut] ?? "bg-muted/10 text-muted";
    return `<span class="rounded-full px-2.5 py-1 text-xs font-bold ${cls}">${escapeHtml(statut ?? "—")}</span>`;
}

export function formatDate(date) {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function getInitials(nom) {
    if (!nom) return "?";
    return nom.trim().split(/\s+/).slice(0, 2).map(w => w[0].toUpperCase()).join("");
}