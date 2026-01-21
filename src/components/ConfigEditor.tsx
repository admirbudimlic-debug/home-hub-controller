import { useState, useEffect } from 'react';
import { Save, RefreshCw, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { ChannelConfig, ServiceType } from '@/types/channel';
import { api } from '@/services/api';
import { useToast } from '@/hooks/use-toast';

interface ConfigEditorProps {
  channelId: number;
  onApply: (services: ServiceType[]) => void;
}

export function ConfigEditor({ channelId, onApply }: ConfigEditorProps) {
  const [config, setConfig] = useState<ChannelConfig | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const [errors, setErrors] = useState<string[]>([]);
  const { toast } = useToast();

  const fetchConfig = async () => {
    setIsLoading(true);
    const response = await api.getConfig(channelId);
    if (response.success && response.data) {
      setConfig(response.data);
      setHasChanges(false);
    }
    setIsLoading(false);
  };

  useEffect(() => {
    fetchConfig();
  }, [channelId]);

  const updateConfig = (
    section: 'rx' | 'rec' | 'rtmp',
    field: string,
    value: string | number | boolean | undefined
  ) => {
    if (!config) return;
    setConfig({
      ...config,
      [section]: {
        ...config[section],
        [field]: value,
      },
    });
    setHasChanges(true);
  };

  const validate = (): boolean => {
    const errs: string[] = [];
    if (!config) return false;

    if (!config.rx.srtListenPort || config.rx.srtListenPort < 1024) {
      errs.push('SRT port must be >= 1024');
    }
    if (config.rx.multicastEnabled && !config.rx.multicastDstIp) {
      errs.push('Multicast IP is required when enabled');
    }
    if (config.rec.recordEnabled && !config.rec.recordPath) {
      errs.push('Record path is required when recording enabled');
    }
    if (config.rtmp.rtmpEnabled && !config.rtmp.rtmpUrl) {
      errs.push('RTMP URL is required when RTMP enabled');
    }

    setErrors(errs);
    return errs.length === 0;
  };

  const handleSave = async () => {
    if (!config || !validate()) return;
    setIsSaving(true);
    const response = await api.saveConfig(channelId, config);
    if (response.success) {
      toast({ title: 'Config saved', description: 'Configuration has been saved successfully.' });
      setHasChanges(false);
    }
    setIsSaving(false);
  };

  const handleApply = async () => {
    if (!config || !validate()) return;
    
    // Determine which services need restart based on what changed
    const servicesToRestart: ServiceType[] = ['rx', 'rec', 'rtmp'];
    
    setIsSaving(true);
    const response = await api.applyConfig(channelId, config, servicesToRestart);
    if (response.success) {
      toast({
        title: 'Config applied',
        description: 'Configuration saved and services restarted.',
      });
      setHasChanges(false);
      onApply(servicesToRestart);
    }
    setIsSaving(false);
  };

  if (isLoading || !config) {
    return <div className="animate-pulse bg-secondary rounded h-64" />;
  }

  return (
    <div className="space-y-6">
      {errors.length > 0 && (
        <div className="rounded-lg border border-status-error/50 bg-status-error/10 p-3 text-sm">
          <div className="flex items-center gap-2 text-status-error font-medium mb-2">
            <AlertCircle className="h-4 w-4" />
            Validation Errors
          </div>
          <ul className="list-disc list-inside text-status-error/80 space-y-1">
            {errors.map((err, i) => (
              <li key={i}>{err}</li>
            ))}
          </ul>
        </div>
      )}

      {/* RX Config */}
      <div className="space-y-4">
        <h4 className="font-semibold text-rx flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-rx" />
          RX Configuration
        </h4>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="srtPort">SRT Listen Port</Label>
            <Input
              id="srtPort"
              type="number"
              value={config.rx.srtListenPort}
              onChange={(e) => updateConfig('rx', 'srtListenPort', parseInt(e.target.value))}
              className="font-mono"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="maxBitrate">Max Bitrate (Mbps)</Label>
            <Input
              id="maxBitrate"
              type="number"
              value={config.rx.maxBitrateMbps || ''}
              onChange={(e) => updateConfig('rx', 'maxBitrateMbps', parseInt(e.target.value) || undefined)}
              className="font-mono"
              placeholder="Optional"
            />
          </div>
        </div>
        <div className="flex items-center justify-between">
          <Label htmlFor="multicast">Multicast Output</Label>
          <Switch
            id="multicast"
            checked={config.rx.multicastEnabled}
            onCheckedChange={(v) => updateConfig('rx', 'multicastEnabled', v)}
          />
        </div>
        {config.rx.multicastEnabled && (
          <div className="grid grid-cols-2 gap-4 pl-4 border-l-2 border-rx/30">
            <div className="space-y-2">
              <Label htmlFor="mcastIp">Multicast IP</Label>
              <Input
                id="mcastIp"
                value={config.rx.multicastDstIp || ''}
                onChange={(e) => updateConfig('rx', 'multicastDstIp', e.target.value)}
                className="font-mono"
                placeholder="239.x.x.x"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="mcastPort">Multicast Port</Label>
              <Input
                id="mcastPort"
                type="number"
                value={config.rx.multicastDstPort || ''}
                onChange={(e) => updateConfig('rx', 'multicastDstPort', parseInt(e.target.value))}
                className="font-mono"
              />
            </div>
          </div>
        )}
      </div>

      {/* REC Config */}
      <div className="space-y-4">
        <h4 className="font-semibold text-rec flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-rec" />
          REC Configuration
        </h4>
        <div className="flex items-center justify-between">
          <Label htmlFor="recordEnabled">Recording Enabled</Label>
          <Switch
            id="recordEnabled"
            checked={config.rec.recordEnabled}
            onCheckedChange={(v) => updateConfig('rec', 'recordEnabled', v)}
          />
        </div>
        {config.rec.recordEnabled && (
          <div className="space-y-4 pl-4 border-l-2 border-rec/30">
            <div className="space-y-2">
              <Label htmlFor="recordPath">Record Path</Label>
              <Input
                id="recordPath"
                value={config.rec.recordPath}
                onChange={(e) => updateConfig('rec', 'recordPath', e.target.value)}
                className="font-mono"
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="repack">Repack to MP4</Label>
              <Switch
                id="repack"
                checked={config.rec.repackToMp4}
                onCheckedChange={(v) => updateConfig('rec', 'repackToMp4', v)}
              />
            </div>
          </div>
        )}
      </div>

      {/* RTMP Config */}
      <div className="space-y-4">
        <h4 className="font-semibold text-rtmp flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-rtmp" />
          RTMP Configuration
        </h4>
        <div className="flex items-center justify-between">
          <Label htmlFor="rtmpEnabled">RTMP Enabled</Label>
          <Switch
            id="rtmpEnabled"
            checked={config.rtmp.rtmpEnabled}
            onCheckedChange={(v) => updateConfig('rtmp', 'rtmpEnabled', v)}
          />
        </div>
        {config.rtmp.rtmpEnabled && (
          <div className="space-y-4 pl-4 border-l-2 border-rtmp/30">
            <div className="space-y-2">
              <Label htmlFor="rtmpUrl">RTMP URL</Label>
              <Input
                id="rtmpUrl"
                value={config.rtmp.rtmpUrl || ''}
                onChange={(e) => updateConfig('rtmp', 'rtmpUrl', e.target.value)}
                className="font-mono text-sm"
                placeholder="rtmp://..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="videoBitrate">Video Bitrate (kbps)</Label>
                <Input
                  id="videoBitrate"
                  type="number"
                  value={config.rtmp.rtmpVideoBitrate || ''}
                  onChange={(e) => updateConfig('rtmp', 'rtmpVideoBitrate', parseInt(e.target.value))}
                  className="font-mono"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="audioBitrate">Audio Bitrate (kbps)</Label>
                <Input
                  id="audioBitrate"
                  type="number"
                  value={config.rtmp.rtmpAudioBitrate || ''}
                  onChange={(e) => updateConfig('rtmp', 'rtmpAudioBitrate', parseInt(e.target.value))}
                  className="font-mono"
                />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center justify-between pt-4 border-t border-border">
        <div className="flex items-center gap-2">
          {hasChanges && (
            <span className="text-sm text-status-error flex items-center gap-1">
              <div className="h-2 w-2 rounded-full bg-status-error animate-pulse" />
              Unsaved changes
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          <Button variant="secondary" onClick={() => validate()}>
            <Check className="h-4 w-4 mr-1" />
            Validate
          </Button>
          <Button variant="secondary" onClick={handleSave} disabled={isSaving || !hasChanges}>
            <Save className="h-4 w-4 mr-1" />
            Save
          </Button>
          <Button onClick={handleApply} disabled={isSaving || !hasChanges} className="gap-1">
            <RefreshCw className={`h-4 w-4 ${isSaving ? 'animate-spin' : ''}`} />
            Apply & Restart
          </Button>
        </div>
      </div>
    </div>
  );
}
