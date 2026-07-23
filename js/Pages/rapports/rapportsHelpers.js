import { escapeHtml } from "../../Utils/html.js";

export function getStatutBadge(statut) {
    const MAP = {
        "Brouillon": "bg-attente/10 text-attente",
        "Publié": "bg-succes/10 text-succes",
    };
    const cls = MAP[statut] ?? "bg-muted/10 text-muted";
    return `<span class="rounded-full px-2.5 py-1 text-xs font-bold ${cls}">${escapeHtml(statut ?? "—")}</span>`;
}

export function getInitials(nom) {
    return String(nom ?? "")
        .split(" ")
        .map(w => w[0])
        .join("")
        .toUpperCase()
        .slice(0, 2);
}

export function formatDate(date) {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("fr-FR", {
        day: "2-digit", month: "long", year: "numeric"
    });
}

export function formatDateCourte(date) {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("fr-FR", {
        day: "2-digit", month: "2-digit", year: "numeric"
    });
}