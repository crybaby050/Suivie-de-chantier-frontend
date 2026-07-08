import { ENDPOINTS } from "../Config/api.js";
import { apiRequest } from "./apiClient.js";
import { setSession, clearSession } from "../Utils/auth.js";

export async function login(email, password) {
  const users = await apiRequest(
    `${ENDPOINTS.utilisateurs}?email=${encodeURIComponent(email)}`,
    {},
    "Impossible de contacter le serveur."
  );

  if (!users || users.length === 0) {
    throw new Error("Aucun compte trouvé avec cet email.");
  }

  const user = users[0];

  if (user.motDePasse !== password) {
    throw new Error("Mot de passe incorrect.");
  }

  const { motDePasse: _pwd, ...safeUser } = user;
  setSession(safeUser);

  return safeUser;
}

export function logout() {
  clearSession();
}