// Single Source of Truth for User Roles & Badges
import type { UserRole } from '@/types/fruit_app';

export interface RoleMeta {
  key: UserRole;
  shortLabel: string; // 'Admin' | 'Owner' | 'Seller'
  fullLabel: string;  // 'System Admin (ผู้ดูแลระบบสูงสุด)' | 'Shop Owner (เจ้าของร้าน)' | 'Seller (ผู้ช่วยขาย)'
  color: string;      // 'purple-9' | 'positive' | 'warning'
}

export const ROLES: Record<UserRole, RoleMeta> = {
  SYSTEM_ADMIN: {
    key: 'SYSTEM_ADMIN',
    shortLabel: 'Admin',
    fullLabel: 'System Admin (ผู้ดูแลระบบสูงสุด)',
    color: 'purple-9'
  },
  SHOP_OWNER: {
    key: 'SHOP_OWNER',
    shortLabel: 'Owner',
    fullLabel: 'Shop Owner (เจ้าของร้าน)',
    color: 'positive'
  },
  SELLER: {
    key: 'SELLER',
    shortLabel: 'Seller',
    fullLabel: 'Seller (ผู้ช่วยขาย)',
    color: 'warning'
  }
};

// Returns short badge label (e.g. 'Admin', 'Owner', 'Seller')
export function getRoleShortLabel(role: UserRole | null | undefined): string {
  if (!role || !ROLES[role]) return '-';
  return ROLES[role].shortLabel;
}

// Returns full descriptive label for form dropdowns
export function getRoleFullLabel(role: UserRole | null | undefined): string {
  if (!role || !ROLES[role]) return 'ไม่มีสิทธิ์';
  return ROLES[role].fullLabel;
}

// Returns Quasar semantic color for role badge
export function getRoleColor(role: UserRole | null | undefined): string {
  if (!role || !ROLES[role]) return 'grey-7';
  return ROLES[role].color;
}
