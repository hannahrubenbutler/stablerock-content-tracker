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

// Internal stages — full granularity for Archway admin
export const STAGES = [
  'Requested',
  'In Progress',
  'In Simplified',
  'Creative Uploaded',
  'Client Review',
  'Changes Requested',
  'Approved',
  'Scheduled',
  'Published',
  'On Hold',
] as const;

export const STAGE_COLORS: Record<string, string> = {
  'Requested': '#F1C40F',
  'Needs Info': '#E67E22',
  'In Progress': '#2980B9',
  'In Simplified': '#8E44AD',
  'Creative Uploaded': '#1ABC9C',
  'Client Review': '#D4AC0D',
  'Changes Requested': '#E67E22',
  'Approved': '#27AE60',
  'Scheduled': '#1ABC9C',
  'Published': '#27AE60',
  'On Hold': '#95A5A6',
};

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

export const OWNER_OPTIONS = [
  'Archway',
  'Kevin + Archway',
  'Archway + J&A',
  'Abby (self-post)',
  'April',
  'Kevin',
] as const;

export type ServiceLine = typeof SERVICE_LINES[number];
export type ContentType = typeof CONTENT_TYPES[number];
export type Stage = typeof STAGES[number];

// Client-facing status mapping
export function getClientStatus(stage: string): { label: string; color: string; tab: 'requests' | 'review' | 'approved' } {
  switch (stage) {
    case 'Requested':
    case 'Needs Info':
      return { label: 'Received', color: '#95A5A6', tab: 'requests' };
    case 'In Progress':
    case 'In Simplified':
      return { label: 'In Progress', color: '#F1C40F', tab: 'requests' };
    case 'Creative Uploaded':
    case 'Client Review':
      return { label: 'Ready for Review', color: '#E67E22', tab: 'review' };
    case 'Changes Requested':
      return { label: 'In Revision', color: '#E67E22', tab: 'review' };
    case 'Approved':
    case 'Scheduled':
      return { label: 'Scheduled', color: '#1ABC9C', tab: 'approved' };
    case 'Published':
      return { label: 'Published', color: '#27AE60', tab: 'approved' };
    case 'On Hold':
      return { label: 'On Hold', color: '#95A5A6', tab: 'requests' };
    default:
      return { label: stage, color: '#6B7280', tab: 'requests' };
  }
}
