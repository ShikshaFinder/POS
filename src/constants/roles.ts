export const RoleCode = {
  SECURITY: 1,
  SUPERVISOR: 2,
  QC: 3,
  MAINTENANCE: 4,
  PROCUREMENT: 5,
  STORE: 6,
  FINANCE: 7,
  SALES: 8,
  RND: 9,
  HR: 10,
  MANAGEMENT: 11,
  ADMIN: 12,
  POS_OWNER: 13,
} as const;

export type RoleCodeValue = (typeof RoleCode)[keyof typeof RoleCode];
export type RoleHub = 'ADMIN' | 'MANAGER' | 'EMPLOYEE';

export type RoleDefinition = {
  key: keyof typeof RoleCode;
  label: string;
  value: RoleCodeValue;
  hub: RoleHub;
  workHubLabel: string;
};

export const ROLE_DEFINITIONS: RoleDefinition[] = [
  {
    key: 'SECURITY',
    label: 'Security',
    value: RoleCode.SECURITY,
    hub: 'EMPLOYEE',
    workHubLabel: 'Security Hub',
  },
  {
    key: 'SUPERVISOR',
    label: 'Supervisor',
    value: RoleCode.SUPERVISOR,
    hub: 'MANAGER',
    workHubLabel: 'Supervisor Hub',
  },
  {
    key: 'QC',
    label: 'QC',
    value: RoleCode.QC,
    hub: 'EMPLOYEE',
    workHubLabel: 'QC Hub',
  },
  {
    key: 'MAINTENANCE',
    label: 'Maintenance',
    value: RoleCode.MAINTENANCE,
    hub: 'EMPLOYEE',
    workHubLabel: 'Maintenance Hub',
  },
  {
    key: 'PROCUREMENT',
    label: 'Procurement',
    value: RoleCode.PROCUREMENT,
    hub: 'MANAGER',
    workHubLabel: 'Procurement Hub',
  },
  {
    key: 'STORE',
    label: 'Store',
    value: RoleCode.STORE,
    hub: 'EMPLOYEE',
    workHubLabel: 'Store Hub',
  },
  {
    key: 'FINANCE',
    label: 'Finance',
    value: RoleCode.FINANCE,
    hub: 'ADMIN',
    workHubLabel: 'Finance Hub',
  },
  {
    key: 'SALES',
    label: 'Sales',
    value: RoleCode.SALES,
    hub: 'MANAGER',
    workHubLabel: 'Sales Hub',
  },
  {
    key: 'RND',
    label: 'R&D',
    value: RoleCode.RND,
    hub: 'MANAGER',
    workHubLabel: 'R&D Hub',
  },
  {
    key: 'HR',
    label: 'HR',
    value: RoleCode.HR,
    hub: 'ADMIN',
    workHubLabel: 'HR Hub',
  },
  {
    key: 'MANAGEMENT',
    label: 'Management',
    value: RoleCode.MANAGEMENT,
    hub: 'ADMIN',
    workHubLabel: 'Management Hub',
  },
  {
    key: 'ADMIN',
    label: 'Admin',
    value: RoleCode.ADMIN,
    hub: 'ADMIN',
    workHubLabel: 'Admin Hub',
  },
  {
    key: 'POS_OWNER',
    label: 'POS Owner',
    value: RoleCode.POS_OWNER,
    hub: 'MANAGER',
    workHubLabel: 'POS Hub',
  },
];

export const ROLE_VALUE_MAP: Record<string, RoleDefinition> = ROLE_DEFINITIONS.reduce(
  (acc, def) => {
    acc[String(def.value)] = def;
    return acc;
  },
  {} as Record<string, RoleDefinition>
);

export const ROLE_VALUE_SET = new Set(Object.keys(ROLE_VALUE_MAP));

export const DEFAULT_ROLE_VALUE = String(RoleCode.SECURITY);

export const ROLE_HUB_TARGET: Record<RoleHub, { url: string; defaultLabel: string }> = {
  ADMIN: { url: '/Management/Admin', defaultLabel: 'Admin Hub' },
  MANAGER: { url: '/Management/Manager', defaultLabel: 'Manager Hub' },
  EMPLOYEE: { url: '/Management/Employee', defaultLabel: 'Employee Hub' },
};

export const getRoleDefinition = (value?: string | null): RoleDefinition | undefined => {
  if (!value) {
    return undefined;
  }
  return ROLE_VALUE_MAP[value];
};

export const getDashboardRoute = (roleCode: string | null | undefined): string => {
  if (!roleCode) {
    return '/dashboard/security';
  }

  const role = parseInt(roleCode);
  const routeMap: Record<number, string> = {
    1: '/dashboard/security',
    2: '/dashboard/supervisor',
    3: '/dashboard/qc',
    4: '/dashboard/maintenance',
    5: '/dashboard/procurement',
    6: '/dashboard/store',
    7: '/dashboard/finance',
    8: '/dashboard/sales',
    9: '/dashboard/rnd',
    10: '/dashboard/hr',
    11: '/dashboard/management',
    12: '/dashboard/admin',
    13: '/dashboard/pos', // POS Owner - redirects to POS application
  };

  return routeMap[role] || '/dashboard/security';
};

