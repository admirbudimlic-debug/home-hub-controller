import { useState, useEffect, useCallback } from 'react';
import { Header } from '@/components/Header';
import { ChannelCard } from '@/components/ChannelCard';
import { ChannelDetailModal } from '@/components/ChannelDetailModal';
import { BulkControls } from '@/components/BulkControls';
import { Channel, ServiceType } from '@/types/channel';
import { api } from '@/services/mockApi';
import { useToast } from '@/hooks/use-toast';

const Index = () => {
  const [channels, setChannels] = useState<Channel[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [selectedChannelId, setSelectedChannelId] = useState<number | null>(null);
  const [loadingStates, setLoadingStates] = useState<Record<string, boolean>>({});
  const [isBulkLoading, setIsBulkLoading] = useState(false);
  const { toast } = useToast();

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

    // Auto-refresh every 5 seconds
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
          description: `Channel ${5000 + channelId} ${service.toUpperCase()} has been ${action}ed.`,
        });
        await fetchChannels(false);
      }
    } catch (error) {
      toast({
        title: 'Action failed',
        description: `Failed to ${action} ${service.toUpperCase()} on channel ${5000 + channelId}.`,
        variant: 'destructive',
      });
    }

    setLoadingStates((prev) => ({ ...prev, [key]: false }));
  };

  const handleBulkAction = async (service: ServiceType, action: 'start' | 'stop' | 'restart') => {
    setIsBulkLoading(true);

    try {
      const response = await api.bulkOperation(service, action);
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

  return (
    <div className="min-h-screen bg-background">
      <Header
        onRefresh={() => fetchChannels(false)}
        isRefreshing={isRefreshing}
        lastUpdated={lastUpdated}
      />

      <main className="container py-6">
        {/* Stats bar */}
        <div className="mb-6 grid grid-cols-3 gap-4">
          {[
            { label: 'RX Running', count: runningCounts.rx, color: 'bg-rx' },
            { label: 'REC Running', count: runningCounts.rec, color: 'bg-rec' },
            { label: 'RTMP Running', count: runningCounts.rtmp, color: 'bg-rtmp' },
          ].map(({ label, count, color }) => (
            <div
              key={label}
              className="flex items-center justify-between rounded-lg border border-border bg-card p-4"
            >
              <span className="text-sm text-muted-foreground">{label}</span>
              <div className="flex items-center gap-2">
                <div className={`h-2 w-2 rounded-full ${color}`} />
                <span className="text-2xl font-bold">{count}/9</span>
              </div>
            </div>
          ))}
        </div>

        {/* Bulk controls */}
        <div className="mb-6">
          <BulkControls onBulkAction={handleBulkAction} isLoading={isBulkLoading} />
        </div>

        {/* Channel grid */}
        {isLoading ? (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {Array.from({ length: 9 }).map((_, i) => (
              <div key={i} className="h-64 animate-pulse rounded-lg bg-card" />
            ))}
          </div>
        ) : (
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {channels.map((channel) => (
              <ChannelCard
                key={channel.id}
                channel={channel}
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
