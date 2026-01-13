import { useState } from 'react';
import { Radio, HardDrive, Cast, ChevronRight, Copy, Check } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
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

const serviceBgColors = {
  rx: 'bg-rx/10',
  rec: 'bg-rec/10',
  rtmp: 'bg-rtmp/10',
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

  return (
    <Card className="group relative overflow-hidden border-border/50 bg-card/80 backdrop-blur transition-all hover:border-border hover:shadow-lg">
      {/* Channel header */}
      <div className="flex items-center justify-between border-b border-border/50 px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 font-mono text-lg font-bold text-primary">
            {channel.id}
          </div>
          <div>
            <h3 className="font-semibold">Channel 500{channel.id}</h3>
            <p className="text-xs text-muted-foreground font-mono">{channel.ingestSummary}</p>
          </div>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="gap-1 opacity-0 transition-opacity group-hover:opacity-100"
          onClick={() => onOpenDetail(channel.id)}
        >
          Details
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <CardContent className="p-4 space-y-3">
        {/* Service rows */}
        {services.map((service) => {
          const Icon = serviceIcons[service];
          const state = channel[service];
          const isLoading = loadingStates[getLoadingKey(service)];

          return (
            <div
              key={service}
              className={cn(
                'flex items-center justify-between rounded-lg px-3 py-2',
                serviceBgColors[service]
              )}
            >
              <div className="flex items-center gap-3">
                <Icon className={cn('h-4 w-4', serviceColors[service])} />
                <span className="text-sm font-medium uppercase">{service}</span>
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

        {/* Quick info */}
        <div className="flex items-center justify-between pt-2 text-xs text-muted-foreground">
          <div className="flex items-center gap-2">
            <span>Output:</span>
            <code className="rounded bg-secondary px-1.5 py-0.5 font-mono">
              {channel.outputSummary}
            </code>
            <button
              onClick={() => copyToClipboard(channel.outputSummary, 'output')}
              className="text-muted-foreground hover:text-foreground transition-colors"
            >
              {copiedField === 'output' ? (
                <Check className="h-3 w-3 text-status-running" />
              ) : (
                <Copy className="h-3 w-3" />
              )}
            </button>
          </div>
          {channel.rx.uptime && (
            <span>Uptime: {channel.rx.uptime}</span>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
