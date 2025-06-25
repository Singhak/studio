// src/contexts/authHelpers/tokenManager.ts
import type { User as FirebaseUser, Auth } from 'firebase/auth';
import type { CourtlyUser } from '@/contexts/AuthContext';
import type { UserRole } from '@/lib/types';
import type { ToastFn } from '@/hooks/use-toast';
import { getStoredRoles } from './roleManager';
import { CUSTOM_ACCESS_TOKEN_KEY, CUSTOM_REFRESH_TOKEN_KEY, COURTLY_USER_ROLES_PREFIX } from './constants';

interface HandleCustomApiLoginArgs {
  firebaseUser: FirebaseUser;
  auth: Auth;
  toast: ToastFn;
  setAndStoreAccessToken: (token: string | null) => void;
  setAndStoreRefreshToken: (token: string | null) => void;
  clientInstanceId: string;
}

interface CustomApiLoginResult {
  accessToken: string;
  refreshToken: string;
  courtlyUser: CourtlyUser;
}

export const handleCustomApiLogin = async ({
  firebaseUser,
  auth,
  toast,
  setAndStoreAccessToken,
  setAndStoreRefreshToken,
  clientInstanceId,
}: HandleCustomApiLoginArgs): Promise<CourtlyUser | null> => {
  try {
    const firebaseIdToken = await firebaseUser.getIdToken();
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        idToken: firebaseIdToken,
        clientInstanceId: clientInstanceId,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: "Custom login failed after Firebase sign-in." }));
      toast({ variant: "destructive", toastTitle: "Custom Login Failed", toastDescription: errorData.message || `Error ${response.status}` });
      return null;
    }

    const customTokenData = await response.json();
    setAndStoreAccessToken(customTokenData.accessToken);
    setAndStoreRefreshToken(customTokenData.refreshToken);

    const userRoles = getStoredRoles(firebaseUser.uid);
    let finalRoles = userRoles.length > 0 ? userRoles : (['user'] as UserRole[]);
    if (userRoles.length === 0 && typeof window !== 'undefined') {
        localStorage.setItem(`${COURTLY_USER_ROLES_PREFIX}${firebaseUser.uid}`, JSON.stringify(finalRoles));
    }
    if (finalRoles.length > 0 && !finalRoles.includes('user')) {
        finalRoles = ['user', ...finalRoles];
    } else if (finalRoles.length === 0) {
        finalRoles = ['user'];
    }

    const courtlyUser: CourtlyUser = {
      displayName: firebaseUser.displayName,
      email: firebaseUser.email,
      phoneNumber: firebaseUser.phoneNumber,
      photoURL: firebaseUser.photoURL,
      uid: firebaseUser.uid,
      roles: finalRoles,
      ...(firebaseUser as any),
    };
    
    return courtlyUser;

  } catch (error) {
    console.error("Error during custom API login:", error);
    toast({ variant: "destructive", toastTitle: "Login Error", toastDescription: "Failed to communicate with authentication server." });
    return null;
  }
};

interface AttemptTokenRefreshArgs {
  currentRefreshToken: string | null;
  toast: ToastFn;
  setAndStoreAccessToken: (token: string | null) => void;
  setAndStoreRefreshToken: (token: string | null) => void;
  performLogout: () => Promise<void>; 
}

export const attemptTokenRefresh = async ({
  currentRefreshToken,
  toast,
  setAndStoreAccessToken,
  setAndStoreRefreshToken,
  performLogout,
}: AttemptTokenRefreshArgs): Promise<boolean> => {
  let tokenToUse = currentRefreshToken;
  if (!tokenToUse && typeof window !== 'undefined') {
    tokenToUse = localStorage.getItem(CUSTOM_REFRESH_TOKEN_KEY);
  }

  if (!tokenToUse) {
    console.log("TokenManager: No refresh token available for refresh attempt.");
    return false;
  }

  console.log("TokenManager: Attempting to refresh token...");
  try {
    const response = await fetch('/api/auth/refresh', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: tokenToUse }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: "Token refresh failed with status " + response.status }));
      console.error("TokenManager: Token refresh failed.", errorData.message);
      if (response.status === 401 || response.status === 403) {
        toast({ variant: "destructive", toastTitle: "Session Expired", toastDescription: "Please log in again." });
        await performLogout();
      } else {
        toast({ variant: "destructive", toastTitle: "Refresh Error", toastDescription: errorData.message });
      }
      return false;
    }

    const newTokens = await response.json();
    if (!newTokens.accessToken) {
      console.error("TokenManager: Token refresh successful but no new access token received.");
      await performLogout();
      return false;
    }

    setAndStoreAccessToken(newTokens.accessToken);
    if (newTokens.refreshToken) {
      setAndStoreRefreshToken(newTokens.refreshToken);
    }
    console.log("TokenManager: Tokens refreshed successfully.");
    return true;
  } catch (error) {
    console.error("TokenManager: Error during token refresh:", error);
    toast({ variant: "destructive", toastTitle: "Network Error", toastDescription: "Could not refresh session. Please check connection." });
    return false;
  }
};

export const clearCustomTokens = () => {
  if (typeof window !== 'undefined') {
    localStorage.removeItem(CUSTOM_ACCESS_TOKEN_KEY);
    localStorage.removeItem(CUSTOM_REFRESH_TOKEN_KEY);
  }
};

export const loadTokensFromStorage = (): { accessToken: string | null, refreshToken: string | null } => {
    if (typeof window !== 'undefined') {
        return {
            accessToken: localStorage.getItem(CUSTOM_ACCESS_TOKEN_KEY),
            refreshToken: localStorage.getItem(CUSTOM_REFRESH_TOKEN_KEY),
        };
    }
    return { accessToken: null, refreshToken: null };
};
