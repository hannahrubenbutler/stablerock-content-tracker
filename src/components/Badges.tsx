import { SERVICE_LINE_COLORS, CONTENT_TYPE_COLORS, PRIORITY_COLORS, ASSET_STATUS_COLORS } from '@/lib/constants';

interface BadgeProps {
  label: string;
  colorMap: Record<string, string>;
  className?: string;
}

export function ColorBadge({ label, colorMap, className = '' }: BadgeProps) {
  const color = colorMap[label] || '#6B7280';
  return (
    <span
      className={`inline-block px-2 py-0.5 rounded text-xs font-medium font-body ${className}`}
      style={{ backgroundColor: color, color: '#fff' }}
    >
      {label}
    </span>
  );
}

export function ServiceLineBadge({ label }: { label: string }) {
  return <ColorBadge label={label} colorMap={SERVICE_LINE_COLORS} />;
}

export function ContentTypeBadge({ label }: { label: string }) {
  return <ColorBadge label={label} colorMap={CONTENT_TYPE_COLORS} />;
}

export function PriorityDot({ priority }: { priority: string }) {
  const color = PRIORITY_COLORS[priority] || '#6B7280';
  return (
    <span
      className="inline-block w-2.5 h-2.5 rounded-full"
      style={{ backgroundColor: color }}
      title={priority}
    />
  );
}

export function AssetStatusBadge({ status }: { status: string }) {
  return <ColorBadge label={status} colorMap={ASSET_STATUS_COLORS} />;
}
