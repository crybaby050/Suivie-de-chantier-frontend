export function getStatutBadge(statut) {
    const MAP = {
        "En traitement": "bg-attente/10 text-attente",
        "Résolu": "bg-succes/10 text-succes",
        "Rejeté": "bg-bloque/10 text-bloque",
    };
    const cls = MAP[statut] ?? "bg-muted/10 text-muted";
    return `<span class="rounded-full px-2.5 py-1 text-xs font-bold ${cls}">${statut ?? "—"}</span>`;
}

export function getCibleInfo(cibleType) {
    const MAP = {
        "Projet": { icon: "fa-building", color: "text-primary", bg: "bg-primary/10", label: "Projet" },
        "Phase": { icon: "fa-layer-group", color: "text-secondary", bg: "bg-secondary/10", label: "Phase" },
        "Tache": { icon: "fa-list-check", color: "text-accent", bg: "bg-accent/10", label: "Tâche" },
        "Rapport": { icon: "fa-file-lines", color: "text-role-chef", bg: "bg-role-chef/10", label: "Rapport" },
    };
    return MAP[cibleType] ?? { icon: "fa-flag", color: "text-muted", bg: "bg-muted/10", label: cibleType ?? "—" };
}

export function formatDate(date) {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit", year: "numeric" });
}

export function formatDateCourte(date) {
    if (!date) return "—";
    return new Date(date).toLocaleDateString("fr-FR", { day: "2-digit", month: "2-digit" });
}

export function getInitials(nom = "") {
    return nom.split(" ").map(w => w[0]).filter(Boolean).slice(0, 2).join("").toUpperCase();
}