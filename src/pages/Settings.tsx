import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Radio, HardDrive, Cast, Save, RefreshCw, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

// Default configurations for new channels
interface GlobalRxSettings {
  defaultLatencyMs: number;
  defaultBandwidthOverhead: number;
  defaultInterface: string;
}

interface GlobalRecSettings {
  defaultRecordPath: string;
  defaultFilenameTemplate: string;
  defaultSegmentDurationSec: number;
  defaultRepackToMp4: boolean;
}

interface GlobalRtmpSettings {
  defaultVideoBitrate: number;
  defaultAudioBitrate: number;
  defaultVideoCodec: 'libx264' | 'copy';
  defaultVideoPreset: 'ultrafast' | 'superfast' | 'veryfast' | 'faster' | 'fast' | 'medium';
  defaultAudioCodec: 'aac' | 'copy';
}

const STORAGE_KEY = 'brateshub-global-settings';

function getStoredSettings() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (stored) return JSON.parse(stored);
  } catch (e) {
    console.warn('Failed to parse global settings:', e);
  }
  return null;
}

function saveSettings(settings: { rx: GlobalRxSettings; rec: GlobalRecSettings; rtmp: GlobalRtmpSettings }) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

const Settings = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [rxSettings, setRxSettings] = useState<GlobalRxSettings>({
    defaultLatencyMs: 200,
    defaultBandwidthOverhead: 25,
    defaultInterface: 'eth0',
  });
  
  const [recSettings, setRecSettings] = useState<GlobalRecSettings>({
    defaultRecordPath: '/srv/recordings',
    defaultFilenameTemplate: 'ch%CHANNEL%_%Y%m%d_%H%M%S',
    defaultSegmentDurationSec: 3600,
    defaultRepackToMp4: true,
  });
  
  const [rtmpSettings, setRtmpSettings] = useState<GlobalRtmpSettings>({
    defaultVideoBitrate: 6000,
    defaultAudioBitrate: 192,
    defaultVideoCodec: 'copy',
    defaultVideoPreset: 'veryfast',
    defaultAudioCodec: 'aac',
  });
  
  const [hasChanges, setHasChanges] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    const stored = getStoredSettings();
    if (stored) {
      if (stored.rx) setRxSettings(stored.rx);
      if (stored.rec) setRecSettings(stored.rec);
      if (stored.rtmp) setRtmpSettings(stored.rtmp);
    }
  }, []);

  const handleSave = async () => {
    setIsSaving(true);
    
    // Simulate save delay
    await new Promise(resolve => setTimeout(resolve, 500));
    
    saveSettings({ rx: rxSettings, rec: recSettings, rtmp: rtmpSettings });
    
    toast({
      title: 'Settings saved',
      description: 'Global default settings have been saved.',
    });
    
    setHasChanges(false);
    setIsSaving(false);
  };

  const updateRx = (field: keyof GlobalRxSettings, value: number | string) => {
    setRxSettings(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const updateRec = (field: keyof GlobalRecSettings, value: number | string | boolean) => {
    setRecSettings(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  const updateRtmp = (field: keyof GlobalRtmpSettings, value: number | string) => {
    setRtmpSettings(prev => ({ ...prev, [field]: value }));
    setHasChanges(true);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-border/60 bg-background/90 backdrop-blur-xl">
        <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
        
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate('/')}
              className="gap-2"
            >
              <ArrowLeft className="h-4 w-4" />
              Back
            </Button>
            <div className="h-6 w-px bg-border" />
            <h1 className="text-lg font-bold tracking-tight">Global Settings</h1>
          </div>
          
          <div className="flex items-center gap-3">
            {hasChanges && (
              <span className="text-sm text-status-error flex items-center gap-1">
                <div className="h-2 w-2 rounded-full bg-status-error animate-pulse" />
                Unsaved changes
              </span>
            )}
            <Button onClick={handleSave} disabled={isSaving || !hasChanges}>
              {isSaving ? (
                <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Settings
            </Button>
          </div>
        </div>
      </header>

      <main className="container py-6">
        <div className="mb-6">
          <p className="text-muted-foreground">
            Configure default settings for all channels. Individual channel settings can override these defaults.
          </p>
        </div>

        <Tabs defaultValue="rx" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3 max-w-md">
            <TabsTrigger value="rx" className="gap-2">
              <Radio className="h-4 w-4" />
              SRT RX
            </TabsTrigger>
            <TabsTrigger value="rec" className="gap-2">
              <HardDrive className="h-4 w-4" />
              Recording
            </TabsTrigger>
            <TabsTrigger value="rtmp" className="gap-2">
              <Cast className="h-4 w-4" />
              RTMP
            </TabsTrigger>
          </TabsList>

          {/* RX Settings */}
          <TabsContent value="rx">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-rx">
                  <Radio className="h-5 w-5" />
                  SRT Receiver Defaults
                </CardTitle>
                <CardDescription>
                  Default settings for SRT caller mode connections
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="defaultLatency">Default Latency (ms)</Label>
                    <Input
                      id="defaultLatency"
                      type="number"
                      value={rxSettings.defaultLatencyMs}
                      onChange={(e) => updateRx('defaultLatencyMs', parseInt(e.target.value))}
                      className="font-mono"
                    />
                    <p className="text-xs text-muted-foreground">
                      Higher latency = more resilience to network jitter
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="defaultOverhead">Bandwidth Overhead (%)</Label>
                    <Input
                      id="defaultOverhead"
                      type="number"
                      value={rxSettings.defaultBandwidthOverhead}
                      onChange={(e) => updateRx('defaultBandwidthOverhead', parseInt(e.target.value))}
                      className="font-mono"
                    />
                    <p className="text-xs text-muted-foreground">
                      Extra bandwidth for retransmissions
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="defaultInterface">Default Network Interface</Label>
                  <Input
                    id="defaultInterface"
                    value={rxSettings.defaultInterface}
                    onChange={(e) => updateRx('defaultInterface', e.target.value)}
                    className="font-mono"
                    placeholder="eth0"
                  />
                  <p className="text-xs text-muted-foreground">
                    Network interface for multicast output
                  </p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Recording Settings */}
          <TabsContent value="rec">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-rec">
                  <HardDrive className="h-5 w-5" />
                  Recording Defaults
                </CardTitle>
                <CardDescription>
                  Default settings for stream recording
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="defaultRecordPath">Default Record Path</Label>
                  <Input
                    id="defaultRecordPath"
                    value={recSettings.defaultRecordPath}
                    onChange={(e) => updateRec('defaultRecordPath', e.target.value)}
                    className="font-mono"
                    placeholder="/srv/recordings"
                  />
                  <p className="text-xs text-muted-foreground">
                    Base directory for recordings. Channel ID will be appended.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="defaultFilename">Filename Template</Label>
                  <Input
                    id="defaultFilename"
                    value={recSettings.defaultFilenameTemplate}
                    onChange={(e) => updateRec('defaultFilenameTemplate', e.target.value)}
                    className="font-mono"
                    placeholder="ch%CHANNEL%_%Y%m%d_%H%M%S"
                  />
                  <p className="text-xs text-muted-foreground">
                    %CHANNEL% = channel ID, %Y%m%d = date, %H%M%S = time
                  </p>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="segmentDuration">Segment Duration (seconds)</Label>
                    <Input
                      id="segmentDuration"
                      type="number"
                      value={recSettings.defaultSegmentDurationSec}
                      onChange={(e) => updateRec('defaultSegmentDurationSec', parseInt(e.target.value))}
                      className="font-mono"
                    />
                    <p className="text-xs text-muted-foreground">
                      Duration of each recording segment
                    </p>
                  </div>
                  <div className="flex items-center justify-between rounded-lg border border-border/60 p-4">
                    <div>
                      <Label>Repack to MP4</Label>
                      <p className="text-xs text-muted-foreground">
                        Automatically convert TS to MP4
                      </p>
                    </div>
                    <Switch
                      checked={recSettings.defaultRepackToMp4}
                      onCheckedChange={(v) => updateRec('defaultRepackToMp4', v)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* RTMP Settings */}
          <TabsContent value="rtmp">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-rtmp">
                  <Cast className="h-5 w-5" />
                  RTMP Output Defaults
                </CardTitle>
                <CardDescription>
                  Default settings for RTMP streaming output
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="defaultVideoBitrate">Video Bitrate (kbps)</Label>
                    <Input
                      id="defaultVideoBitrate"
                      type="number"
                      value={rtmpSettings.defaultVideoBitrate}
                      onChange={(e) => updateRtmp('defaultVideoBitrate', parseInt(e.target.value))}
                      className="font-mono"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="defaultAudioBitrate">Audio Bitrate (kbps)</Label>
                    <Input
                      id="defaultAudioBitrate"
                      type="number"
                      value={rtmpSettings.defaultAudioBitrate}
                      onChange={(e) => updateRtmp('defaultAudioBitrate', parseInt(e.target.value))}
                      className="font-mono"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label htmlFor="defaultVideoCodec">Video Codec</Label>
                    <Select
                      value={rtmpSettings.defaultVideoCodec}
                      onValueChange={(v) => updateRtmp('defaultVideoCodec', v)}
                    >
                      <SelectTrigger id="defaultVideoCodec">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="copy">Copy (passthrough)</SelectItem>
                        <SelectItem value="libx264">H.264 (transcode)</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Copy = no transcoding, lower CPU
                    </p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="defaultVideoPreset">Encoding Preset</Label>
                    <Select
                      value={rtmpSettings.defaultVideoPreset}
                      onValueChange={(v) => updateRtmp('defaultVideoPreset', v as GlobalRtmpSettings['defaultVideoPreset'])}
                      disabled={rtmpSettings.defaultVideoCodec === 'copy'}
                    >
                      <SelectTrigger id="defaultVideoPreset">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ultrafast">Ultra Fast</SelectItem>
                        <SelectItem value="superfast">Super Fast</SelectItem>
                        <SelectItem value="veryfast">Very Fast</SelectItem>
                        <SelectItem value="faster">Faster</SelectItem>
                        <SelectItem value="fast">Fast</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Faster = lower CPU, larger files
                    </p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="defaultAudioCodec">Audio Codec</Label>
                  <Select
                    value={rtmpSettings.defaultAudioCodec}
                    onValueChange={(v) => updateRtmp('defaultAudioCodec', v)}
                  >
                    <SelectTrigger id="defaultAudioCodec" className="max-w-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="copy">Copy (passthrough)</SelectItem>
                      <SelectItem value="aac">AAC (transcode)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default Settings;
