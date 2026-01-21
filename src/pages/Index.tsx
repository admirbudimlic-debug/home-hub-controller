import { useState, useEffect, useCallback, useMemo } from 'react';
import { Header } from '@/components/Header';
import { ChannelCard } from '@/components/ChannelCard';
import { ChannelDetailModal } from '@/components/ChannelDetailModal';
import { BulkControls } from '@/components/BulkControls';
import { IloControlPanel } from '@/components/IloControlPanel';
import { CreateChannelDialog } from '@/components/CreateChannelDialog';
import { Channel, ServiceType } from '@/types/channel';
import { api } from '@/services/api';
import { useChannelAnalysis } from '@/hooks/useStreamAnalysis';
import { useToast } from '@/hooks/use-toast';
import { Radio, HardDrive, Cast, Inbox } from 'lucide-react';
import { cn } from '@/lib/utils';

const Index = () => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selectedChannelId, setSelectedChannelId] = useState<number | null>(null);
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const [isBulkLoading, setIsBulkLoading] = useState(false);
  const { toast } = useToast();

  // Get channel IDs for analysis
  const channelIds = useMemo(() => channels.map(c => c.id), [channels]);
  const { analyses } = useChannelAnalysis(2000, channelIds);

  const fetchChannels = useCallback(async (showLoading = false) => {
    if (showLoading) setIsLoading(true);
    setIsRefreshing(true);

    const response = await api.getChannels();
    if (response.success && response.data) {
      setChannels(response.data);
      setLastUpdated(new Date());
    }

    setIsLoading(false);
    setIsRefreshing(false);
  }, []);

  useEffect(() => {
    fetchChannels(true);
    const interval = setInterval(() => fetchChannels(false), 5000);
    return () => clearInterval(interval);
  }, [fetchChannels]);

  const handleServiceAction = async (
    channelId: number,
    service: ServiceType,
    action: 'start' | 'stop' | 'restart'
  ) => {
    const key = `${channelId}-${service}`;
    setLoadingStates((prev) => ({ ...prev, [key]: true }));

    try {
      let response;
      switch (action) {
        case 'start':
          response = await api.startService(channelId, service);
          break;
        case 'stop':
          response = await api.stopService(channelId, service);
          break;
        case 'restart':
          response = await api.restartService(channelId, service);
          break;
      }

      if (response.success) {
        toast({
          title: `${service.toUpperCase()} ${action}ed`,
          description: `Channel ${channelId} ${service.toUpperCase()} has been ${action}ed.`,
        });
        await fetchChannels(false);
      }
    } catch (error) {
      toast({
        title: 'Action failed',
        description: `Failed to ${action} ${service.toUpperCase()} on channel ${channelId}.`,
        variant: 'destructive',
      });
    }

    setLoadingStates((prev) => ({ ...prev, [key]: false }));
  };

  const handleBulkAction = async (service: ServiceType, action: 'start' | 'stop' | 'restart') => {
    setIsBulkLoading(true);

    try {
      const response = await api.bulkOperation(service, action, channelIds);
      if (response.success) {
        toast({
          title: `Bulk ${action} complete`,
          description: `All ${service.toUpperCase()} services have been ${action}ed.`,
        });
        await fetchChannels(false);
      }
    } catch (error) {
      toast({
        title: 'Bulk action failed',
        description: `Failed to ${action} all ${service.toUpperCase()} services.`,
        variant: 'destructive',
      });
    }

    setIsBulkLoading(false);
  };

  // Count running services
  const runningCounts = channels.reduce(
    (acc, ch) => ({
      rx: acc.rx + (ch.rx.status === 'running' ? 1 : 0),
      rec: acc.rec + (ch.rec.status === 'running' ? 1 : 0),
      rtmp: acc.rtmp + (ch.rtmp.status === 'running' ? 1 : 0),
    }),
    { rx: 0, rec: 0, rtmp: 0 }
  );

  const totalChannels = channels.length;

  const stats = [
    { key: 'rx', label: 'RX Active', count: runningCounts.rx, icon: Radio, colorClass: 'text-rx', borderClass: 'border-l-rx' },
    { key: 'rec', label: 'REC Active', count: runningCounts.rec, icon: HardDrive, colorClass: 'text-rec', borderClass: 'border-l-rec' },
    { key: 'rtmp', label: 'RTMP Active', count: runningCounts.rtmp, icon: Cast, colorClass: 'text-rtmp', borderClass: 'border-l-rtmp' },
  ];

  return (
    <div className="min-h-screen bg-background">
      <Header
        onRefresh={() => fetchChannels(false)}
        isRefreshing={isRefreshing}
        lastUpdated={lastUpdated}
      />

      <main className="container py-6 space-y-6">
        {/* iLO Control Panel */}
        <IloControlPanel />

        {/* Stats bar */}
        <div className="grid grid-cols-3 gap-4">
          {stats.map(({ key, label, count, icon: Icon, colorClass, borderClass }) => (
            <div
              key={key}
              className={cn(
                "relative flex items-center justify-between rounded-lg p-4",
                "bg-gradient-to-r from-card to-background",
                "border border-border/60 border-l-2",
                borderClass
              )}
            >
              <div className="flex items-center gap-3">
                <Icon className={cn("h-5 w-5", colorClass)} />
                <span className="text-xs uppercase tracking-wider text-muted-foreground">{label}</span>
              </div>
              <div className="flex items-baseline gap-1">
                <span className={cn("text-2xl font-bold tabular-nums", colorClass)}>{count}</span>
                <span className="text-sm text-muted-foreground">/{totalChannels}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Bulk controls */}
        {channels.length > 0 && (
          <BulkControls onBulkAction={handleBulkAction} isLoading={isBulkLoading} />
        )}

        {/* Section divider with Add Channel button */}
        <div className="relative py-2">
          <div className="section-divider" />
          <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 flex items-center gap-4 bg-background px-4">
            <span className="text-xs uppercase tracking-widest text-muted-foreground">
              Channels
            </span>
            <CreateChannelDialog 
              existingIds={channelIds} 
              onCreated={() => fetchChannels(false)} 
            />
          </div>
        </div>

        {/* Channel list */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-20 animate-pulse rounded-lg bg-card border border-border/40" />
            ))}
          </div>
        ) : channels.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-center">
            <div className={cn(
              "flex h-16 w-16 items-center justify-center rounded-full mb-4",
              "bg-gradient-to-br from-muted/50 to-muted/20",
              "border border-border/50"
            )}>
              <Inbox className="h-8 w-8 text-muted-foreground" />
            </div>
            <h3 className="text-lg font-semibold mb-2">No Channels</h3>
            <p className="text-muted-foreground max-w-md mb-6">
              Get started by adding your first streaming channel. Each channel can have its own SRT input, 
              recording settings, and RTMP output configuration.
            </p>
            <CreateChannelDialog 
              existingIds={[]} 
              onCreated={() => fetchChannels(false)} 
            />
          </div>
        ) : (
          <div className="space-y-2">
            {channels.map((channel) => (
              <ChannelCard
                key={channel.id}
                channel={channel}
                analysis={analyses[channel.id]}
                onServiceAction={handleServiceAction}
                onOpenDetail={setSelectedChannelId}
                loadingStates={loadingStates}
              />
            ))}
          </div>
        )}
      </main>

      {/* Channel detail modal */}
      <ChannelDetailModal
        channelId={selectedChannelId}
        onClose={() => setSelectedChannelId(null)}
        onServiceAction={handleServiceAction}
        loadingStates={loadingStates}
      />
    </div>
  );
};

export default Index;
