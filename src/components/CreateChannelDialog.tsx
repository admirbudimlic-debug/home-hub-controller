import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { api } from '@/services/api';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';

interface CreateChannelDialogProps {
  existingIds: number[];
  onCreated: () => void;
}

export function CreateChannelDialog({ existingIds, onCreated }: CreateChannelDialogProps) {
  const [open, setOpen] = useState(false);
  const [channelId, setChannelId] = useState<number>(1);
  const [name, setName] = useState('');
  const [srtMode, setSrtMode] = useState<'caller' | 'listener'>('listener');
  const [isCreating, setIsCreating] = useState(false);
  const { toast } = useToast();

  // Find next available ID
  const getNextAvailableId = () => {
    let id = 1;
    while (existingIds.includes(id)) {
      id++;
    }
    return id;
  };

  const handleOpen = (isOpen: boolean) => {
    setOpen(isOpen);
    if (isOpen) {
      const nextId = getNextAvailableId();
      setChannelId(nextId);
      setName(`Channel ${nextId}`);
      setSrtMode('listener');
    }
  };

  const handleCreate = async () => {
    if (existingIds.includes(channelId)) {
      toast({
        title: 'ID Already Exists',
        description: `Channel ${channelId} already exists. Please choose a different ID.`,
        variant: 'destructive',
      });
      return;
    }

    setIsCreating(true);

    const response = await api.createChannel(channelId, name, {
      rx: {
        srt: {
          mode: srtMode,
          listenPort: srtMode === 'listener' ? 5000 + channelId : undefined,
          targetHost: srtMode === 'caller' ? '' : undefined,
          targetPort: srtMode === 'caller' ? 5000 : undefined,
          latencyMs: 200,
        },
        multicastEnabled: false,
      },
    });

    if (response.success) {
      toast({
        title: 'Channel Created',
        description: `${name} has been created successfully.`,
      });
      setOpen(false);
      onCreated();
    } else {
      toast({
        title: 'Failed to Create',
        description: response.error || 'Unknown error occurred',
        variant: 'destructive',
      });
    }

    setIsCreating(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogTrigger asChild>
        <Button
          className={cn(
            'gap-2',
            'bg-gradient-to-r from-primary to-primary/80',
            'hover:from-primary/90 hover:to-primary/70'
          )}
        >
          <Plus className="h-4 w-4" />
          Add Channel
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Create New Channel</DialogTitle>
          <DialogDescription>
            Add a new streaming channel with basic SRT configuration.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="channelId" className="text-right">
              Channel ID
            </Label>
            <Input
              id="channelId"
              type="number"
              min={1}
              value={channelId}
              onChange={(e) => setChannelId(parseInt(e.target.value) || 1)}
              className="col-span-3 font-mono"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="name" className="text-right">
              Name
            </Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="col-span-3"
              placeholder="My Channel"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="srtMode" className="text-right">
              SRT Mode
            </Label>
            <Select value={srtMode} onValueChange={(v) => setSrtMode(v as 'caller' | 'listener')}>
              <SelectTrigger className="col-span-3">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="listener">
                  <div className="flex flex-col items-start">
                    <span>Listener</span>
                    <span className="text-xs text-muted-foreground">Accept incoming SRT connections</span>
                  </div>
                </SelectItem>
                <SelectItem value="caller">
                  <div className="flex flex-col items-start">
                    <span>Caller</span>
                    <span className="text-xs text-muted-foreground">Connect to remote SRT source</span>
                  </div>
                </SelectItem>
              </SelectContent>
            </Select>
          </div>
          {srtMode === 'listener' && (
            <div className="grid grid-cols-4 items-center gap-4">
              <Label className="text-right text-muted-foreground text-xs">Listen Port</Label>
              <span className="col-span-3 font-mono text-sm text-muted-foreground">
                {5000 + channelId} (auto-assigned)
              </span>
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="secondary" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreate} disabled={isCreating}>
            {isCreating ? 'Creating...' : 'Create Channel'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
