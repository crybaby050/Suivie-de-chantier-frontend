import { escapeHtml } from "../../Utils/html.js";

export function getInitials(nom) {
  return String(nom ?? "")
    .split(" ")
    .map(w => w[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export function getRoleBadge(role) {
  const MAP = {
    "Admin":            "bg-role-admin/10 text-role-admin",
    "Chef de chantier": "bg-role-chef/10 text-role-chef",
    "Ouvrier":          "bg-role-ouvrier/10 text-role-ouvrier",
    "Client":           "bg-role-client/10 text-role-client",
  };
  const cls = MAP[role] ?? "bg-muted/10 text-muted";
  return `<span class="rounded-full px-2.5 py-1 text-xs font-bold ${cls}">${escapeHtml(role ?? "—")}</span>`;
}

export function getDisponibiliteBadge(dispo) {
  if (!dispo) return "";
  const cls = dispo === "Disponible"
    ? "bg-succes/10 text-succes"
    : "bg-inactif/10 text-inactif";
  return `<span class="rounded-full px-2.5 py-1 text-xs font-bold ${cls}">${escapeHtml(dispo)}</span>`;
}

export function getRoleAvatarBg(role) {
  const MAP = {
    "Admin":            "bg-role-admin/10",
    "Chef de chantier": "bg-role-chef/10",
    "Ouvrier":          "bg-role-ouvrier/10",
    "Client":           "bg-role-client/10",
  };
  return MAP[role] ?? "bg-muted/10";
}

export function getRoleAvatarText(role) {
  const MAP = {
    "Admin":            "text-role-admin",
    "Chef de chantier": "text-role-chef",
    "Ouvrier":          "text-role-ouvrier",
    "Client":           "text-role-client",
  };
  return MAP[role] ?? "text-muted";
}

export function formatDate(date) {
  if (!date) return "—";
  return new Date(date).toLocaleDateString("fr-FR", {
    day: "2-digit", month: "2-digit", year: "numeric"
  });
}