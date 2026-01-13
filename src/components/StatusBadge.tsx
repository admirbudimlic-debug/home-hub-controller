import { cn } from '@/lib/utils';
import { ServiceStatus } from '@/types/channel';

interface StatusBadgeProps {
  status: ServiceStatus;
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
}

const statusConfig = {
  running: {
    label: 'Running',
    dotClass: 'bg-status-running',
    textClass: 'text-status-running',
    glowClass: 'glow-running',
  },
  stopped: {
    label: 'Stopped',
    dotClass: 'bg-status-stopped',
    textClass: 'text-status-stopped',
    glowClass: 'glow-stopped',
  },
  error: {
    label: 'Error',
    dotClass: 'bg-status-error',
    textClass: 'text-status-error',
    glowClass: 'glow-error',
  },
  unknown: {
    label: 'Unknown',
    dotClass: 'bg-status-unknown',
    textClass: 'text-status-unknown',
    glowClass: '',
  },
};

const sizeConfig = {
  sm: { dot: 'h-2 w-2', text: 'text-xs', gap: 'gap-1.5' },
  md: { dot: 'h-2.5 w-2.5', text: 'text-sm', gap: 'gap-2' },
  lg: { dot: 'h-3 w-3', text: 'text-base', gap: 'gap-2' },
};

export function StatusBadge({ status, showLabel = true, size = 'md', pulse = true }: StatusBadgeProps) {
  const config = statusConfig[status];
  const sizeClasses = sizeConfig[size];

  return (
    <div className={cn('flex items-center', sizeClasses.gap)}>
      <span
        className={cn(
          'rounded-full',
          sizeClasses.dot,
          config.dotClass,
          pulse && status === 'running' && 'status-pulse',
          config.glowClass
        )}
      />
      {showLabel && (
        <span className={cn('font-medium', sizeClasses.text, config.textClass)}>
          {config.label}
        </span>
      )}
    </div>
  );
}
