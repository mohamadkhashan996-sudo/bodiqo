import type { Role } from "@prisma/client";

/** Higher number = more privilege */
export const ROLE_RANK: Record<Role, number> = {
  USER: 0,
  SUPPORT: 20,
  MODERATOR: 40,
  ADMIN: 60,
  OWNER: 80,
  SUPER_ADMIN: 100,
};

export const STAFF_ROLES: Role[] = [
  "SUPPORT",
  "MODERATOR",
  "ADMIN",
  "OWNER",
  "SUPER_ADMIN",
];

export type Permission =
  | "admin:access"
  | "users:read"
  | "users:write"
  | "users:ban"
  | "users:delete"
  | "content:read"
  | "content:moderate"
  | "reports:read"
  | "reports:write"
  | "verification:read"
  | "verification:write"
  | "settings:read"
  | "settings:write"
  | "backups:read"
  | "backups:write"
  | "roles:read"
  | "roles:write"
  | "analytics:read"
  | "monitoring:read"
  | "media:read"
  | "media:write"
  | "search:admin";

const ALL: Permission[] = [
  "admin:access",
  "users:read",
  "users:write",
  "users:ban",
  "users:delete",
  "content:read",
  "content:moderate",
  "reports:read",
  "reports:write",
  "verification:read",
  "verification:write",
  "settings:read",
  "settings:write",
  "backups:read",
  "backups:write",
  "roles:read",
  "roles:write",
  "analytics:read",
  "monitoring:read",
  "media:read",
  "media:write",
  "search:admin",
];

const ROLE_PERMISSIONS: Record<Role, Permission[]> = {
  USER: [],
  SUPPORT: [
    "admin:access",
    "users:read",
    "reports:read",
    "verification:read",
    "content:read",
    "analytics:read",
    "search:admin",
  ],
  MODERATOR: [
    "admin:access",
    "users:read",
    "users:write",
    "users:ban",
    "content:read",
    "content:moderate",
    "reports:read",
    "reports:write",
    "verification:read",
    "verification:write",
    "analytics:read",
    "monitoring:read",
    "media:read",
    "search:admin",
  ],
  ADMIN: ALL.filter((p) => p !== "roles:write" && p !== "backups:write"),
  OWNER: ALL,
  SUPER_ADMIN: ALL,
};

export function isStaff(role: string | undefined | null): boolean {
  return Boolean(role && STAFF_ROLES.includes(role as Role));
}

export function can(role: string | undefined | null, permission: Permission): boolean {
  if (!role) return false;
  const list = ROLE_PERMISSIONS[role as Role];
  return Boolean(list?.includes(permission));
}

export function permissionsFor(role: string | undefined | null): Permission[] {
  if (!role) return [];
  return ROLE_PERMISSIONS[role as Role] ?? [];
}
