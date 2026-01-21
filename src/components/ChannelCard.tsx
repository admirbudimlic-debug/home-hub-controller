import { useState } from 'react';
import { Radio, HardDrive, Cast, ChevronRight, Copy, Check, Zap } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { StatusBadge } from './StatusBadge';
import { ServiceControl } from './ServiceControl';
import { BitrateIndicator } from './BitrateIndicator';
import { Channel, ServiceType } from '@/types/channel';
import { ChannelAnalysis } from '@/types/stream';
import { cn } from '@/lib/utils';

interface ChannelCardProps {
  channel: Channel;
  analysis?: ChannelAnalysis;
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
  rx: 'border-rx/40',
  rec: 'border-rec/40',
  rtmp: 'border-rtmp/40',
};

const serviceBgColors = {
  rx: 'bg-rx/5',
  rec: 'bg-rec/5',
  rtmp: 'bg-rtmp/5',
};

export function ChannelCard({ channel, analysis, onServiceAction, onOpenDetail, loadingStates }: ChannelCardProps) {
  const [copiedField, setCopiedField] = useState<string | null>(null);

  const copyToClipboard = (text: string, field: string) => {
    navigator.clipboard.writeText(text);
    setCopiedField(field);
    setTimeout(() => setCopiedField(null), 2000);
  };

  const services: ServiceType[] = ['rx', 'rec', 'rtmp'];
  const getLoadingKey = (service: ServiceType) => `${channel.id}-${service}`;

  const allRunning = services.every(s => channel[s].status === 'running');
  const anyError = services.some(s => channel[s].status === 'error');

  return (
    <div 
      className={cn(
        "group relative overflow-hidden rounded-lg transition-all duration-300",
        "bg-gradient-to-r from-card via-card to-background",
        "border border-border/60 hover:border-border",
        "hover:shadow-lg hover:shadow-primary/5",
        anyError && "border-status-error/30"
      )}
    >
      {/* Left accent line */}
      <div className={cn(
        "absolute left-0 top-0 bottom-0 w-0.5",
        "bg-gradient-to-b from-primary via-primary/50 to-transparent"
      )} />

      <div className="flex items-center">
        {/* Channel ID */}
        <div className="flex items-center gap-4 px-5 py-4 border-r border-border/40">
          <div className={cn(
            "relative flex h-12 w-12 items-center justify-center rounded-lg",
            "bg-gradient-to-br from-primary/20 to-primary/5",
            "border border-primary/20",
            "font-mono text-xl font-bold text-primary"
          )}>
            {channel.id}
            {allRunning && (
              <div className="absolute -top-1 -right-1">
                <Zap className="h-3.5 w-3.5 text-status-running fill-status-running" />
              </div>
            )}
          </div>
          <div className="min-w-[100px]">
            <h3 className="font-semibold tracking-tight">CH 500{channel.id}</h3>
            <p className="text-xs text-muted-foreground font-mono flex items-center gap-1.5">
              <span className="inline-block h-1 w-1 rounded-full bg-primary/60" />
              {channel.ingestSummary}
            </p>
          </div>
        </div>

        {/* Services - horizontal layout */}
        <div className="flex-1 flex items-center gap-2 px-4 py-3">
          {services.map((service) => {
            const Icon = serviceIcons[service];
            const state = channel[service];
            const isLoading = loadingStates[getLoadingKey(service)];

            return (
              <div
                key={service}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-4 py-2.5 flex-1",
                  "border",
                  serviceBorderColors[service],
                  serviceBgColors[service]
                )}
              >
                <div className="flex items-center gap-2 min-w-[80px]">
                  <Icon className={cn('h-4 w-4', serviceColors[service])} />
                  <span className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                    {service}
                  </span>
                </div>
                <StatusBadge status={state.status} size="sm" />
                <div className="ml-auto">
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
              </div>
            );
          })}
        </div>

        {/* Right side info with bitrate */}
        <div className="flex items-center gap-4 px-5 py-4 border-l border-border/40">
          <div className="text-right text-xs space-y-1.5">
            {/* Bitrate indicator */}
            <div className="flex items-center justify-end">
              <BitrateIndicator
                bitrateMbps={analysis?.bitrate?.totalMbps || null}
                available={analysis?.available || false}
                compact
                showLabel
              />
            </div>
            <div className="flex items-center gap-2 text-muted-foreground justify-end">
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
              <div className="text-muted-foreground">
                <span className="text-[10px] uppercase tracking-wider mr-1">Uptime</span>
                <span className="font-mono text-foreground/80">{channel.rx.uptime}</span>
              </div>
            )}
          </div>
          
          <Button
            variant="ghost"
            size="icon"
            className="text-muted-foreground hover:text-foreground opacity-60 group-hover:opacity-100 transition-opacity"
            onClick={() => onOpenDetail(channel.id)}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>
      </div>
    </div>
  );
}
