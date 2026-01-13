import { useState } from 'react';
import { Radio, HardDrive, Cast, ChevronRight, Copy, Check, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from './StatusBadge';
import { ServiceControl } from './ServiceControl';
import { Channel, ServiceType } from '@/types/channel';
import { cn } from '@/lib/utils';

interface ChannelCardProps {
  channel: Channel;
  onServiceAction: (channelId: number, service: ServiceType, action: 'start' | 'stop' | 'restart') => Promise<void>;
  onOpenDetail: (channelId: number) => void;
  loadingStates: Record<string, boolean>;
}

const serviceIcons = {
  rx: Radio,
  rec: HardDrive,
  rtmp: Cast,
};

const serviceColors = {
  rx: 'text-rx',
  rec: 'text-rec',
  rtmp: 'text-rtmp',
};

const serviceBorderColors = {
  rx: 'border-l-rx',
  rec: 'border-l-rec',
  rtmp: 'border-l-rtmp',
};

export function ChannelCard({ channel, onServiceAction, onOpenDetail, loadingStates }: ChannelCardProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const services: ServiceType[] = ['rx', 'rec', 'rtmp'];
  const getLoadingKey = (service: ServiceType) => `${channel.id}-${service}`;

  // Calculate if all services are running
  const allRunning = services.every(s => channel[s].status === 'running');
  const anyError = services.some(s => channel[s].status === 'error');

  return (
    <div 
      className={cn(
        "group relative overflow-hidden rounded-lg transition-all duration-300",
        "bg-gradient-to-b from-card to-background",
        "border border-border/60 hover:border-border",
        "hover:shadow-lg hover:shadow-primary/5",
        anyError && "border-status-error/30"
      )}
    >
      {/* Top accent line */}
      <div className={cn(
        "absolute top-0 left-0 right-0 h-px",
        "bg-gradient-to-r from-transparent via-primary/50 to-transparent",
        "opacity-0 group-hover:opacity-100 transition-opacity"
      )} />

      {/* Channel header */}
      <div className="relative flex items-center justify-between px-4 py-3 border-b border-border/40">
        <div className="flex items-center gap-3">
          <div className={cn(
            "relative flex h-11 w-11 items-center justify-center rounded-lg",
            "bg-gradient-to-br from-primary/20 to-primary/5",
            "border border-primary/20",
            "font-mono text-lg font-bold text-primary"
          )}>
            {channel.id}
            {allRunning && (
              <div className="absolute -top-1 -right-1">
                <Zap className="h-3 w-3 text-status-running fill-status-running" />
              </div>
            )}
          </div>
          <div>
            <h3 className="font-semibold tracking-tight">Channel 500{channel.id}</h3>
            <p className="text-xs text-muted-foreground font-mono flex items-center gap-1.5">
              <span className="inline-block h-1 w-1 rounded-full bg-primary/60" />
              {channel.ingestSummary}
            </p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1 text-muted-foreground hover:text-foreground opacity-0 group-hover:opacity-100 transition-opacity"
          onClick={() => onOpenDetail(channel.id)}
        >
          Details
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      {/* Service rows */}
      <div className="p-3 space-y-1.5">
        {services.map((service) => {
          const Icon = serviceIcons[service];
          const state = channel[service];
          const isLoading = loadingStates[getLoadingKey(service)];

          return (
            <div
              key={service}
              className={cn(
                "flex items-center justify-between rounded-md px-3 py-2",
                "bg-secondary/40 hover:bg-secondary/60 transition-colors",
                "border-l-2",
                serviceBorderColors[service]
              )}
            >
              <div className="flex items-center gap-3">
                <Icon className={cn('h-4 w-4', serviceColors[service])} />
                <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground w-10">
                  {service}
                </span>
                <StatusBadge status={state.status} size="sm" />
              </div>
              <ServiceControl
                channelId={channel.id}
                service={service}
                status={state.status}
                onStart={() => onServiceAction(channel.id, service, 'start')}
                onStop={() => onServiceAction(channel.id, service, 'stop')}
                onRestart={() => onServiceAction(channel.id, service, 'restart')}
                isLoading={isLoading}
                compact
              />
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div className="px-4 py-2.5 border-t border-border/40 bg-background/50">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-muted-foreground">
            <span className="uppercase tracking-wider text-[10px]">Out</span>
            <code className="rounded bg-secondary/80 px-1.5 py-0.5 font-mono text-foreground/80 border border-border/50">
              {channel.outputSummary}
            </code>
            <button
              onClick={() => copyToClipboard(channel.outputSummary, 'output')}
              className="p-1 rounded hover:bg-secondary transition-colors"
            >
              {copiedField === 'output' ? (
                <Check className="h-3 w-3 text-status-running" />
              ) : (
                <Copy className="h-3 w-3 text-muted-foreground hover:text-foreground" />
              )}
            </button>
          </div>
          {channel.rx.uptime && (
            <span className="text-muted-foreground">
              <span className="text-[10px] uppercase tracking-wider mr-1">Up</span>
              {channel.rx.uptime}
            </span>
          )}
        </div>
      </div>
    </div>
  );
}
