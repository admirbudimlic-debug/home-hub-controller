import { useNavigate } from 'react-router-dom';
import { Server, RefreshCw, Wifi, Settings as SettingsIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { BackendSettings } from '@/components/BackendSettings';
import { cn } from '@/lib/utils';

interface HeaderProps {
  onRefresh: () => void;
  isRefreshing: boolean;
  lastUpdated: Date | null;
}

export function Header({ onRefresh, isRefreshing, lastUpdated }: HeaderProps) {
  const navigate = useNavigate();

  return (
    <header className="sticky top-0 z-50 border-b border-border/60 bg-background/90 backdrop-blur-xl">
      {/* Top accent line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
      
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-4">
          {/* Logo */}
          <div className="relative">
            <div className={cn(
              "flex h-10 w-10 items-center justify-center rounded-lg",
              "bg-gradient-to-br from-primary/20 to-primary/5",
              "border border-primary/30"
            )}>
              <Server className="h-5 w-5 text-primary" />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-status-running border-2 border-background" />
          </div>
          
          {/* Title */}
          <div>
            <h1 className="text-lg font-bold tracking-tight flex items-center gap-2">
              HP Server Controller
              <span className="text-xs font-normal text-muted-foreground bg-secondary/80 px-2 py-0.5 rounded-full border border-border/50">
                v1.0
              </span>
            </h1>
            <p className="text-xs text-muted-foreground tracking-wide">
              BratesHUB Process Manager
            </p>
          </div>
        </div>

        <div className="flex items-center gap-6">
          {/* Connection status */}
          <div className="flex items-center gap-4 text-sm">
            <div className="flex items-center gap-2 text-muted-foreground">
              <div className="relative">
                <Wifi className="h-4 w-4 text-status-running" />
                <div className="absolute inset-0 animate-ping">
                  <Wifi className="h-4 w-4 text-status-running opacity-40" />
                </div>
              </div>
              <span className="text-xs uppercase tracking-wider">Connected</span>
            </div>
            
            <div className="h-4 w-px bg-border" />
            
            {lastUpdated && (
              <span className="text-xs text-muted-foreground font-mono">
                {lastUpdated.toLocaleTimeString('en-US', { hour12: false })}
              </span>
            )}
          </div>

          {/* Settings Page Link */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => navigate('/settings')}
            className={cn(
              "gap-2 text-muted-foreground hover:text-foreground",
              "border border-transparent hover:border-border/50"
            )}
          >
            <SettingsIcon className="h-4 w-4" />
            <span className="hidden sm:inline text-xs uppercase tracking-wider">
              Settings
            </span>
          </Button>

          {/* Backend Settings */}
          <BackendSettings />

          {/* Refresh button */}
          <Button
            variant="secondary"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
            className={cn(
              "gap-2 border border-border/50",
              "hover:border-primary/30 hover:bg-primary/5"
            )}
          >
            <RefreshCw className={cn("h-4 w-4", isRefreshing && "animate-spin")} />
            <span className="hidden sm:inline">Refresh</span>
          </Button>
        </div>
      </div>
    </header>
  );
}
