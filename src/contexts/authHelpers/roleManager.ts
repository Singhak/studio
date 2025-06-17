// src/contexts/authHelpers/roleManager.ts
import type { UserRole } from '@/lib/types';
import type { CourtlyUser } from '@/contexts/AuthContext'; // For the function that updates AuthContext's state
import { COURTLY_USER_ROLES_PREFIX } from './constants';

export const ALL_USER_ROLES_VALUES: ReadonlyArray<UserRole> = ['user', 'owner', 'admin', 'editor'];

export const isValidUserRole = (role: any): role is UserRole => {
  return ALL_USER_ROLES_VALUES.includes(role);
};

export const getStoredRoles = (uid: string): UserRole[] => {
  const defaultRoles: UserRole[] = ['user'];
  if (typeof window === 'undefined') return defaultRoles;

  const storedRolesString = localStorage.getItem(`${COURTLY_USER_ROLES_PREFIX}${uid}`);
  if (!storedRolesString) return defaultRoles;

  try {
    const parsedRoles = JSON.parse(storedRolesString);
    if (Array.isArray(parsedRoles) && parsedRoles.every(isValidUserRole)) {
      const rolesSet = new Set<UserRole>(parsedRoles as UserRole[]);
      if (rolesSet.size > 0) rolesSet.add('user'); // Ensure 'user' role is always present if others are
      return rolesSet.size > 0 ? Array.from(rolesSet) : defaultRoles;
    }
  } catch (e) {
    console.error(`Error parsing stored roles for user ${uid}. Defaulting. Error: ${e}`);
  }
  return defaultRoles;
};

export const updateCurrentUserRoles = (
  currentUser: CourtlyUser | null,
  newRolesInput: UserRole[],
  setCurrentUser: React.Dispatch<React.SetStateAction<CourtlyUser | null>>
): CourtlyUser | null => {
  if (currentUser && typeof window !== 'undefined') {
    const rolesToSet = new Set<UserRole>(newRolesInput.filter(isValidUserRole));

    // Ensure 'user' role is always present if any role is assigned.
    if (rolesToSet.size > 0 || newRolesInput.length > 0) { // if any valid roles are provided, or if intention is to set roles (even if empty initially)
        rolesToSet.add('user');
    } else { // If newRolesInput is empty and rolesToSet is empty, default to ['user']
        rolesToSet.add('user');
    }
    
    const finalRoles = Array.from(rolesToSet);
    const updatedUser: CourtlyUser = { ...currentUser, roles: finalRoles };
    
    localStorage.setItem(`${COURTLY_USER_ROLES_PREFIX}${currentUser.uid}`, JSON.stringify(finalRoles));
    setCurrentUser(updatedUser);
    return updatedUser;
  }
  return currentUser; // Or null if currentUser was null
};
