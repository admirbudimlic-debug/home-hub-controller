import { useState, useEffect, useRef } from 'react';
import { Download, Filter, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { LogEntry, ServiceType } from '@/types/channel';
import { api } from '@/services/api';
import { cn } from '@/lib/utils';

interface LogViewerProps {
  channelId: number;
}

type LogFilter = 'all' | 'error' | 'warn' | 'recent';

export function LogViewer({ channelId }: LogViewerProps) {
  const [activeService, setActiveService] = useState<ServiceType>('rx');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filter, setFilter] = useState<LogFilter>('all');
  const [isLoading, setIsLoading] = useState(false);
  const logContainerRef = useRef<HTMLDivElement>(null);

  const fetchLogs = async () => {
    setIsLoading(true);
    const response = await api.getLogs(channelId, activeService, 100);
    if (response.success && response.data) {
      setLogs(response.data);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchLogs();
  }, [channelId, activeService]);

  useEffect(() => {
    // Auto-scroll to bottom
    if (logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [logs]);

  const filteredLogs = logs.filter((log) => {
    if (filter === 'all') return true;
    if (filter === 'error') return log.level === 'error';
    if (filter === 'warn') return log.level === 'warn' || log.level === 'error';
    if (filter === 'recent') {
      const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
      return new Date(log.timestamp).getTime() > fiveMinutesAgo;
    }
    return true;
  });

  const downloadLogs = () => {
    const content = filteredLogs
      .map((log) => `[${log.timestamp}] [${log.level.toUpperCase()}] ${log.message}`)
      .join('\n');
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ch${5000 + channelId}_${activeService}_logs.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const formatTimestamp = (ts: string) => {
    const date = new Date(ts);
    return date.toLocaleTimeString('en-US', { hour12: false });
  };

  return (
    <div className="flex flex-col h-full">
      <Tabs value={activeService} onValueChange={(v) => setActiveService(v as ServiceType)}>
        <div className="flex items-center justify-between mb-3">
          <TabsList className="bg-secondary">
            <TabsTrigger value="rx" className="data-[state=active]:bg-rx/20 data-[state=active]:text-rx">
              RX
            </TabsTrigger>
            <TabsTrigger value="rec" className="data-[state=active]:bg-rec/20 data-[state=active]:text-rec">
              REC
            </TabsTrigger>
            <TabsTrigger value="rtmp" className="data-[state=active]:bg-rtmp/20 data-[state=active]:text-rtmp">
              RTMP
            </TabsTrigger>
          </TabsList>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 rounded-md border border-border p-1">
              {(['all', 'error', 'warn', 'recent'] as LogFilter[]).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={cn(
                    'px-2 py-1 text-xs rounded transition-colors',
                    filter === f
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                >
                  {f === 'all' ? 'All' : f === 'error' ? 'Errors' : f === 'warn' ? 'Warnings' : 'Last 5m'}
                </button>
              ))}
            </div>
            <Button variant="ghost" size="icon" onClick={fetchLogs} disabled={isLoading}>
              <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
            </Button>
            <Button variant="ghost" size="icon" onClick={downloadLogs}>
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {['rx', 'rec', 'rtmp'].map((service) => (
          <TabsContent key={service} value={service} className="mt-0 flex-1">
            <div
              ref={logContainerRef}
              className="h-64 overflow-y-auto rounded-lg border border-border bg-background/50 p-3 log-scroll"
            >
              {filteredLogs.length === 0 ? (
                <p className="text-center text-muted-foreground text-sm py-8">No logs to display</p>
              ) : (
                <div className="space-y-0.5">
                  {filteredLogs.map((log, i) => (
                    <div key={i} className="log-line flex gap-2">
                      <span className="text-muted-foreground shrink-0">
                        {formatTimestamp(log.timestamp)}
                      </span>
                      <span
                        className={cn(
                          'shrink-0 w-12',
                          log.level === 'error' && 'log-error',
                          log.level === 'warn' && 'log-warn',
                          log.level === 'info' && 'log-info'
                        )}
                      >
                        [{log.level.toUpperCase()}]
                      </span>
                      <span className="text-foreground/90">{log.message}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
}
