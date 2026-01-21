import { useState, useEffect } from 'react';
import { X, Radio, HardDrive, Cast, Clock, Hash, AlertTriangle, Activity } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { StatusBadge } from './StatusBadge';
import { ServiceControl } from './ServiceControl';
import { LogViewer } from './LogViewer';
import { ConfigEditor } from './ConfigEditor';
import { BitrateIndicator } from './BitrateIndicator';
import { PidTable } from './PidTable';
import { Channel, ServiceType } from '@/types/channel';
import { useStreamAnalysis } from '@/hooks/useStreamAnalysis';
import { api } from '@/services/api';
import { cn } from '@/lib/utils';

interface ChannelDetailModalProps {
  channelId: number | null;
  onClose: () => void;
  onServiceAction: (channelId: number, service: ServiceType, action: 'start' | 'stop' | 'restart') => Promise<void>;
  loadingStates: Record<string, boolean>;
}

const serviceConfig = {
  rx: { icon: Radio, label: 'RX', colorClass: 'text-rx', bgClass: 'bg-rx/10' },
  rec: { icon: HardDrive, label: 'REC', colorClass: 'text-rec', bgClass: 'bg-rec/10' },
  rtmp: { icon: Cast, label: 'RTMP', colorClass: 'text-rtmp', bgClass: 'bg-rtmp/10' },
};

export function ChannelDetailModal({ channelId, onClose, onServiceAction, loadingStates }: ChannelDetailModalProps) {
  const [channel, setChannel] = useState<Channel | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { analysis, isLoading: analysisLoading } = useStreamAnalysis(channelId, 3000);

  const fetchChannel = async () => {
    if (!channelId) return;
    setIsLoading(true);
    const response = await api.getChannel(channelId);
    if (response.success && response.data) {
      setChannel(response.data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchChannel();
  }, [channelId]);

  useEffect(() => {
    // Refresh channel data when loading states change
    if (channelId) {
      const timer = setTimeout(fetchChannel, 500);
      return () => clearTimeout(timer);
    }
  }, [loadingStates]);

  const formatDate = (iso: string | undefined) => {
    if (!iso) return 'N/A';
    return new Date(iso).toLocaleString();
  };

  return (
    <Dialog open={channelId !== null} onOpenChange={() => onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader className="shrink-0">
          <DialogTitle className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 font-mono text-lg font-bold text-primary">
              {channelId}
            </div>
            <span>Channel 500{channelId}</span>
          </DialogTitle>
        </DialogHeader>

        {isLoading || !channel ? (
          <div className="flex-1 flex items-center justify-center">
            <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
          </div>
        ) : (
          <Tabs defaultValue="status" className="flex-1 flex flex-col overflow-hidden">
            <TabsList className="shrink-0 w-full justify-start bg-secondary">
              <TabsTrigger value="status">Status</TabsTrigger>
              <TabsTrigger value="stream">Stream Analysis</TabsTrigger>
              <TabsTrigger value="logs">Logs</TabsTrigger>
              <TabsTrigger value="config">Configuration</TabsTrigger>
            </TabsList>

            <TabsContent value="status" className="flex-1 overflow-auto mt-4 space-y-4">
              {/* Service status cards */}
              {(['rx', 'rec', 'rtmp'] as ServiceType[]).map((service) => {
                const config = serviceConfig[service];
                const Icon = config.icon;
                const state = channel[service];
                const isLoading = loadingStates[`${channel.id}-${service}`];

                return (
                  <div
                    key={service}
                    className={cn(
                      'rounded-lg border border-border p-4',
                      config.bgClass
                    )}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="flex items-center gap-3">
                        <Icon className={cn('h-5 w-5', config.colorClass)} />
                        <span className="font-semibold text-lg">{config.label}</span>
                        <StatusBadge status={state.status} />
                      </div>
                      <ServiceControl
                        channelId={channel.id}
                        service={service}
                        status={state.status}
                        onStart={() => onServiceAction(channel.id, service, 'start')}
                        onStop={() => onServiceAction(channel.id, service, 'stop')}
                        onRestart={() => onServiceAction(channel.id, service, 'restart')}
                        isLoading={isLoading}
                      />
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Hash className="h-4 w-4" />
                        <span>PID:</span>
                        <code className="font-mono text-foreground">{state.pid || '—'}</code>
                      </div>
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Clock className="h-4 w-4" />
                        <span>Uptime:</span>
                        <span className="text-foreground">{state.uptime || '—'}</span>
                      </div>
                      <div className="col-span-2 text-muted-foreground">
                        <span>Last start: </span>
                        <span className="text-foreground">{formatDate(state.lastStartTime)}</span>
                      </div>
                      {state.status === 'error' && (
                        <div className="col-span-2 flex items-center gap-2 text-status-error">
                          <AlertTriangle className="h-4 w-4" />
                          <span>Exit code: {state.lastExitCode}</span>
                          {state.lastFailureTime && (
                            <span className="text-muted-foreground">
                              at {formatDate(state.lastFailureTime)}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Quick summary */}
              <div className="rounded-lg border border-border bg-secondary/50 p-4">
                <h4 className="font-semibold mb-3">Connection Summary</h4>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-muted-foreground">Ingest: </span>
                    <code className="font-mono bg-background px-2 py-0.5 rounded">
                      {channel.ingestSummary}
                    </code>
                  </div>
                  <div>
                    <span className="text-muted-foreground">Output: </span>
                    <code className="font-mono bg-background px-2 py-0.5 rounded">
                      {channel.outputSummary}
                    </code>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="stream" className="flex-1 overflow-auto mt-4 space-y-4">
              {/* Stream bitrate card */}
              <div className="rounded-lg border border-border bg-card p-4">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold flex items-center gap-2">
                    <Activity className="h-5 w-5 text-primary" />
                    Stream Bitrate
                  </h4>
                  <BitrateIndicator
                    bitrateMbps={analysis?.bitrate?.totalMbps || null}
                    available={analysis?.available || false}
                    showLabel
                  />
                </div>
                {analysis?.available && (
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">Total packets: </span>
                      <span className="font-mono">{analysis.packets?.toLocaleString() || '—'}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Invalid sync: </span>
                      <span className={cn("font-mono", analysis.invalid && analysis.invalid > 0 ? "text-status-error" : "")}>
                        {analysis.invalid || 0}
                      </span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Last update: </span>
                      <span className="font-mono text-xs">
                        {analysis.timestamp ? new Date(analysis.timestamp).toLocaleTimeString() : '—'}
                      </span>
                    </div>
                  </div>
                )}
                {!analysis?.available && (
                  <p className="text-muted-foreground text-sm">
                    {analysis?.error || 'No stream data available. Start the RX service to see stream analysis.'}
                  </p>
                )}
              </div>

              {/* PID table */}
              <div className="rounded-lg border border-border bg-card p-4">
                <h4 className="font-semibold mb-4">PID Analysis</h4>
                {analysis?.available && analysis.pids ? (
                  <PidTable pids={analysis.pids} />
                ) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertTriangle className="h-8 w-8 mx-auto mb-2 opacity-50" />
                    <p>No PID data available</p>
                  </div>
                )}
              </div>

              {/* Services in stream */}
              {analysis?.services && analysis.services.length > 0 && (
                <div className="rounded-lg border border-border bg-card p-4">
                  <h4 className="font-semibold mb-4">Detected Services</h4>
                  <div className="space-y-2">
                    {analysis.services.map((svc) => (
                      <div key={svc.id} className="flex items-center justify-between p-3 rounded-md bg-secondary/50">
                        <div>
                          <span className="font-medium">{svc.name}</span>
                          {svc.provider && (
                            <span className="text-muted-foreground text-sm ml-2">({svc.provider})</span>
                          )}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <span>PMT: {svc.pmtPid}</span>
                          <span className="mx-2">|</span>
                          <span>PCR: {svc.pcrPid}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            <TabsContent value="logs" className="flex-1 overflow-hidden mt-4">
              <LogViewer channelId={channel.id} />
            </TabsContent>

            <TabsContent value="config" className="flex-1 overflow-auto mt-4">
              <ConfigEditor channelId={channel.id} onApply={() => fetchChannel()} />
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  );
}
