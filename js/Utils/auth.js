const SESSION_KEY = "chantier_session";

export function getSession() {
  try {
    return JSON.parse(sessionStorage.getItem(SESSION_KEY));
  } catch {
    return null;
  }
}

export function setSession(user) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

export function requireAuth() {
  return getSession() !== null;
}

export function isAdmin() {
  return getSession()?.roleGlobal === "Admin";
}

export function isChef() {
  return getSession()?.roleGlobal === "Chef de chantier";
}

export function isOuvrier() {
  return getSession()?.roleGlobal === "Ouvrier";
}

export function isClient() {
  return getSession()?.roleGlobal === "Client";
}

export function canManage() {
  return isAdmin() || isChef();
}