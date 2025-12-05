/**
 * Simple helpers for persisting wallet connection across pages.
 */

export const WALLET_STORAGE_KEY = 'commitmint_wallet_address';

export function persistWalletAddress(address: string) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(WALLET_STORAGE_KEY, address);
  } catch {
    // Ignore storage errors
  }
}

export function clearPersistedWalletAddress() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(WALLET_STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}

export function getPersistedWalletAddress(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(WALLET_STORAGE_KEY);
  } catch {
    return null;
  }
}

/**
 * GitHub connection state management
 */
export const GITHUB_USERNAME_STORAGE_KEY = 'commitmint_github_username';

export function persistGitHubUsername(username: string) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(GITHUB_USERNAME_STORAGE_KEY, username);
  } catch {
    // Ignore storage errors
  }
}

export function clearPersistedGitHubUsername() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.removeItem(GITHUB_USERNAME_STORAGE_KEY);
  } catch {
    // Ignore storage errors
  }
}

export function getPersistedGitHubUsername(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(GITHUB_USERNAME_STORAGE_KEY);
  } catch {
    return null;
  }
}



