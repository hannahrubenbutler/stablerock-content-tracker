export const SERVICE_LINES = [
  'Investment Management',
  'Accounting / CFO / Tax',
  'Insurance',
  'HR Advisory',
  'PEO',
  'General / Stable Rock',
] as const;

export const SERVICE_LINE_COLORS: Record<string, string> = {
  'Investment Management': '#1A5276',
  'Accounting / CFO / Tax': '#117A65',
  'Insurance': '#6C3483',
  'HR Advisory': '#C0392B',
  'PEO': '#D35400',
  'General / Stable Rock': '#2C3E50',
};

export const CONTENT_TYPES = [
  'LinkedIn Post',
  'Blog Post',
  'SEO Article',
  'Email Campaign',
  'Email Nurture',
  'Newsletter',
  'Event Promotion',
  'Landing Page',
  'Website Update',
] as const;

export const CONTENT_TYPE_COLORS: Record<string, string> = {
  'LinkedIn Post': '#2980B9',
  'Blog Post': '#E67E22',
  'SEO Article': '#27AE60',
  'Email Campaign': '#8E44AD',
  'Email Nurture': '#8E44AD',
  'Newsletter': '#7D3C98',
  'Event Promotion': '#C0392B',
  'Landing Page': '#34495E',
  'Website Update': '#34495E',
};

export const STAGES = [
  'Requested',
  'Needs Info',
  'In Progress',
  'In Simplified',
  'Client Review',
  'Scheduled',
  'Published',
  'On Hold',
] as const;

export const PRIORITY_COLORS: Record<string, string> = {
  'High': '#C0392B',
  'Medium': '#F1C40F',
  'Low': '#95A5A6',
};

export const ASSET_STATUS_COLORS: Record<string, string> = {
  'Waiting': '#F1C40F',
  'Blocking': '#C0392B',
  'Received': '#27AE60',
  'Partial': '#2980B9',
};

export type ServiceLine = typeof SERVICE_LINES[number];
export type ContentType = typeof CONTENT_TYPES[number];
export type Stage = typeof STAGES[number];
