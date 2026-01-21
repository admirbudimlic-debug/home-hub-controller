import { useState, useEffect } from 'react';
import { Save, RefreshCw, Check, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChannelConfig, ServiceType, AudioPair } from '@/types/channel';
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

  const updateRxConfig = (field: string, value: string | number | boolean | undefined) => {
    if (!config) return;
    setConfig({
      ...config,
      rx: { ...config.rx, [field]: value },
    });
    setHasChanges(true);
  };

  const updateSrtConfig = (field: string, value: string | number | undefined) => {
    if (!config) return;
    setConfig({
      ...config,
      rx: {
        ...config.rx,
        srt: { ...config.rx.srt, [field]: value },
      },
    });
    setHasChanges(true);
  };

  const updateRecConfig = (field: string, value: string | number | boolean | undefined) => {
    if (!config) return;
    setConfig({
      ...config,
      rec: { ...config.rec, [field]: value },
    });
    setHasChanges(true);
  };

  const updateRtmpConfig = (field: string, value: string | number | boolean | undefined) => {
    if (!config) return;
    setConfig({
      ...config,
      rtmp: { ...config.rtmp, [field]: value },
    });
    setHasChanges(true);
  };

  const validate = (): boolean => {
    const errs: string[] = [];
    if (!config) return false;

    // SRT validation based on mode
    if (config.rx.srt.mode === 'caller') {
      if (!config.rx.srt.targetHost) {
        errs.push('SRT target host is required for caller mode');
      }
      if (!config.rx.srt.targetPort || config.rx.srt.targetPort < 1024) {
        errs.push('SRT target port must be >= 1024');
      }
    } else {
      if (!config.rx.srt.listenPort || config.rx.srt.listenPort < 1024) {
        errs.push('SRT listen port must be >= 1024');
      }
    }

    // Multicast validation
    if (config.rx.multicastEnabled && !config.rx.multicastDstIp) {
      errs.push('Multicast IP is required when enabled');
    }

    // Recording validation
    if (config.rec.recordEnabled && !config.rec.recordPath) {
      errs.push('Record path is required when recording enabled');
    }

    // RTMP validation
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

  const isCallerMode = config.rx.srt.mode === 'caller';

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

      {/* RX Config - SRT */}
      <div className="space-y-4">
        <h4 className="font-semibold text-rx flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-rx" />
          SRT Configuration
        </h4>
        
        {/* SRT Mode Selection */}
        <div className="space-y-2">
          <Label>SRT Mode</Label>
          <Select
            value={config.rx.srt.mode}
            onValueChange={(v) => updateSrtConfig('mode', v)}
          >
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="listener">Listener (accept connections)</SelectItem>
              <SelectItem value="caller">Caller (connect to source)</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* Mode-specific fields */}
        {isCallerMode ? (
          <div className="grid grid-cols-2 gap-4 pl-4 border-l-2 border-rx/30">
            <div className="space-y-2">
              <Label htmlFor="srtHost">Target Host</Label>
              <Input
                id="srtHost"
                value={config.rx.srt.targetHost || ''}
                onChange={(e) => updateSrtConfig('targetHost', e.target.value)}
                className="font-mono"
                placeholder="192.168.1.100"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="srtPort">Target Port</Label>
              <Input
                id="srtPort"
                type="number"
                value={config.rx.srt.targetPort || ''}
                onChange={(e) => updateSrtConfig('targetPort', parseInt(e.target.value))}
                className="font-mono"
              />
            </div>
          </div>
        ) : (
          <div className="pl-4 border-l-2 border-rx/30">
            <div className="space-y-2">
              <Label htmlFor="listenPort">Listen Port</Label>
              <Input
                id="listenPort"
                type="number"
                value={config.rx.srt.listenPort || 5000 + channelId}
                onChange={(e) => updateSrtConfig('listenPort', parseInt(e.target.value))}
                className="font-mono max-w-[200px]"
              />
              <p className="text-xs text-muted-foreground">
                SRT sources will connect to this port
              </p>
            </div>
          </div>
        )}

        {/* Common SRT settings */}
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="streamId">Stream ID (optional)</Label>
            <Input
              id="streamId"
              value={config.rx.srt.streamId || ''}
              onChange={(e) => updateSrtConfig('streamId', e.target.value || undefined)}
              className="font-mono"
              placeholder="stream1"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="latency">Latency (ms)</Label>
            <Input
              id="latency"
              type="number"
              value={config.rx.srt.latencyMs || 200}
              onChange={(e) => updateSrtConfig('latencyMs', parseInt(e.target.value))}
              className="font-mono"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="passphrase">Passphrase (optional)</Label>
            <Input
              id="passphrase"
              type="password"
              value={config.rx.srt.passphrase || ''}
              onChange={(e) => updateSrtConfig('passphrase', e.target.value || undefined)}
              className="font-mono"
              placeholder="Encryption key"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="maxBitrate">Max Bitrate (Mbps)</Label>
            <Input
              id="maxBitrate"
              type="number"
              value={config.rx.maxBitrateMbps || ''}
              onChange={(e) => updateRxConfig('maxBitrateMbps', parseInt(e.target.value) || undefined)}
              className="font-mono"
              placeholder="Optional"
            />
          </div>
        </div>
        
        {/* Multicast Output */}
        <div className="pt-2 border-t border-border/50">
          <div className="flex items-center justify-between mb-3">
            <Label htmlFor="multicast">Multicast Output</Label>
            <Switch
              id="multicast"
              checked={config.rx.multicastEnabled}
              onCheckedChange={(v) => updateRxConfig('multicastEnabled', v)}
            />
          </div>
          {config.rx.multicastEnabled && (
            <div className="grid grid-cols-2 gap-4 pl-4 border-l-2 border-rx/30">
              <div className="space-y-2">
                <Label htmlFor="mcastIp">Multicast IP</Label>
                <Input
                  id="mcastIp"
                  value={config.rx.multicastDstIp || ''}
                  onChange={(e) => updateRxConfig('multicastDstIp', e.target.value)}
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
                  onChange={(e) => updateRxConfig('multicastDstPort', parseInt(e.target.value))}
                  className="font-mono"
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* REC Config */}
      <div className="space-y-4">
        <h4 className="font-semibold text-rec flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-rec" />
          Recording Configuration
        </h4>
        <div className="flex items-center justify-between">
          <Label htmlFor="recordEnabled">Recording Enabled</Label>
          <Switch
            id="recordEnabled"
            checked={config.rec.recordEnabled}
            onCheckedChange={(v) => updateRecConfig('recordEnabled', v)}
          />
        </div>
        {config.rec.recordEnabled && (
          <div className="space-y-4 pl-4 border-l-2 border-rec/30">
            <div className="space-y-2">
              <Label htmlFor="recordPath">Record Path</Label>
              <Input
                id="recordPath"
                value={config.rec.recordPath}
                onChange={(e) => updateRecConfig('recordPath', e.target.value)}
                className="font-mono"
                placeholder="/srv/recordings/ch5001"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="filenameTemplate">Filename Template</Label>
              <Input
                id="filenameTemplate"
                value={config.rec.filenameTemplate || ''}
                onChange={(e) => updateRecConfig('filenameTemplate', e.target.value)}
                className="font-mono"
                placeholder="channel_%Y%m%d_%H%M%S"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center justify-between">
                <Label htmlFor="segmentMode">Segment Mode</Label>
                <Switch
                  id="segmentMode"
                  checked={config.rec.segmentMode || false}
                  onCheckedChange={(v) => updateRecConfig('segmentMode', v)}
                />
              </div>
              {config.rec.segmentMode && (
                <div className="space-y-2">
                  <Label htmlFor="segmentDuration">Segment Duration (sec)</Label>
                  <Input
                    id="segmentDuration"
                    type="number"
                    value={config.rec.segmentDurationSec || 3600}
                    onChange={(e) => updateRecConfig('segmentDurationSec', parseInt(e.target.value))}
                    className="font-mono"
                  />
                </div>
              )}
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="repack">Repack to MP4</Label>
              <Switch
                id="repack"
                checked={config.rec.repackToMp4}
                onCheckedChange={(v) => updateRecConfig('repackToMp4', v)}
              />
            </div>
          </div>
        )}
      </div>

      {/* RTMP Config */}
      <div className="space-y-4">
        <h4 className="font-semibold text-rtmp flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-rtmp" />
          RTMP Output Configuration
        </h4>
        <div className="flex items-center justify-between">
          <Label htmlFor="rtmpEnabled">RTMP Enabled</Label>
          <Switch
            id="rtmpEnabled"
            checked={config.rtmp.rtmpEnabled}
            onCheckedChange={(v) => updateRtmpConfig('rtmpEnabled', v)}
          />
        </div>
        {config.rtmp.rtmpEnabled && (
          <div className="space-y-4 pl-4 border-l-2 border-rtmp/30">
            <div className="space-y-2">
              <Label htmlFor="rtmpUrl">RTMP URL</Label>
              <Input
                id="rtmpUrl"
                value={config.rtmp.rtmpUrl || ''}
                onChange={(e) => updateRtmpConfig('rtmpUrl', e.target.value)}
                className="font-mono text-sm"
                placeholder="rtmp://live.example.com/app"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="rtmpStreamKey">Stream Key</Label>
              <Input
                id="rtmpStreamKey"
                type="password"
                value={config.rtmp.rtmpStreamKey || ''}
                onChange={(e) => updateRtmpConfig('rtmpStreamKey', e.target.value)}
                className="font-mono text-sm"
                placeholder="your-stream-key"
              />
            </div>

            {/* Quality Preset */}
            <div className="space-y-2">
              <Label>Quality Preset</Label>
              <Select
                value={config.rtmp.qualityPreset || 'passthrough'}
                onValueChange={(v) => {
                  updateRtmpConfig('qualityPreset', v);
                  // Auto-fill settings based on preset
                  if (v === 'passthrough') {
                    updateRtmpConfig('videoCodec', 'copy');
                    updateRtmpConfig('audioCodec', 'copy');
                  } else if (v === '1080p') {
                    updateRtmpConfig('videoCodec', 'libx264');
                    updateRtmpConfig('videoBitrate', 6000);
                    updateRtmpConfig('videoWidth', 1920);
                    updateRtmpConfig('videoHeight', 1080);
                  } else if (v === '720p') {
                    updateRtmpConfig('videoCodec', 'libx264');
                    updateRtmpConfig('videoBitrate', 3500);
                    updateRtmpConfig('videoWidth', 1280);
                    updateRtmpConfig('videoHeight', 720);
                  } else if (v === '480p') {
                    updateRtmpConfig('videoCodec', 'libx264');
                    updateRtmpConfig('videoBitrate', 1500);
                    updateRtmpConfig('videoWidth', 854);
                    updateRtmpConfig('videoHeight', 480);
                  }
                }}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="passthrough">Passthrough (no transcode)</SelectItem>
                  <SelectItem value="1080p">1080p (6 Mbps)</SelectItem>
                  <SelectItem value="720p">720p (3.5 Mbps)</SelectItem>
                  <SelectItem value="480p">480p (1.5 Mbps)</SelectItem>
                  <SelectItem value="custom">Custom</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Video Settings */}
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="videoCodec">Video Codec</Label>
                <Select
                  value={config.rtmp.videoCodec || 'copy'}
                  onValueChange={(v) => updateRtmpConfig('videoCodec', v)}
                >
                  <SelectTrigger id="videoCodec">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="copy">Copy (passthrough)</SelectItem>
                    <SelectItem value="libx264">H.264 (libx264)</SelectItem>
                    <SelectItem value="libx265">H.265 (libx265)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="videoPreset">Encoding Preset</Label>
                <Select
                  value={config.rtmp.videoPreset || 'veryfast'}
                  onValueChange={(v) => updateRtmpConfig('videoPreset', v)}
                  disabled={config.rtmp.videoCodec === 'copy'}
                >
                  <SelectTrigger id="videoPreset">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ultrafast">Ultra Fast</SelectItem>
                    <SelectItem value="superfast">Super Fast</SelectItem>
                    <SelectItem value="veryfast">Very Fast</SelectItem>
                    <SelectItem value="faster">Faster</SelectItem>
                    <SelectItem value="fast">Fast</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="slow">Slow (best quality)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Resolution and Bitrate */}
            {config.rtmp.videoCodec !== 'copy' && (
              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="videoWidth">Width</Label>
                  <Input
                    id="videoWidth"
                    type="number"
                    value={config.rtmp.videoWidth || ''}
                    onChange={(e) => updateRtmpConfig('videoWidth', parseInt(e.target.value) || undefined)}
                    className="font-mono"
                    placeholder="1920"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="videoHeight">Height</Label>
                  <Input
                    id="videoHeight"
                    type="number"
                    value={config.rtmp.videoHeight || ''}
                    onChange={(e) => updateRtmpConfig('videoHeight', parseInt(e.target.value) || undefined)}
                    className="font-mono"
                    placeholder="1080"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="videoBitrate">Video Bitrate (kbps)</Label>
                  <Input
                    id="videoBitrate"
                    type="number"
                    value={config.rtmp.videoBitrate || ''}
                    onChange={(e) => updateRtmpConfig('videoBitrate', parseInt(e.target.value))}
                    className="font-mono"
                    placeholder="6000"
                  />
                </div>
              </div>
            )}

            {/* Audio Settings */}
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="audioCodec">Audio Codec</Label>
                <Select
                  value={config.rtmp.audioCodec || 'copy'}
                  onValueChange={(v) => updateRtmpConfig('audioCodec', v)}
                >
                  <SelectTrigger id="audioCodec">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="copy">Copy (passthrough)</SelectItem>
                    <SelectItem value="aac">AAC</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="audioBitrate">Audio Bitrate (kbps)</Label>
                <Input
                  id="audioBitrate"
                  type="number"
                  value={config.rtmp.audioBitrate || ''}
                  onChange={(e) => updateRtmpConfig('audioBitrate', parseInt(e.target.value))}
                  className="font-mono"
                  placeholder="192"
                  disabled={config.rtmp.audioCodec === 'copy'}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="audioPair">Audio Pair</Label>
                <Select
                  value={config.rtmp.audioPair || 'primary'}
                  onValueChange={(v) => updateRtmpConfig('audioPair', v as AudioPair)}
                >
                  <SelectTrigger id="audioPair">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="primary">Primary (tracks 1-2)</SelectItem>
                    <SelectItem value="secondary">Secondary (tracks 3-4)</SelectItem>
                    <SelectItem value="both">Both pairs</SelectItem>
                  </SelectContent>
                </Select>
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
