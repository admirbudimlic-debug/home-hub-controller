import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Settings, Eye, EyeOff, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { IloCredentials } from '@/types/ilo';
import { iloApi } from '@/services/iloApi';
import { cn } from '@/lib/utils';

interface IloCredentialsFormProps {
  credentials: IloCredentials | null;
  onSave: (credentials: IloCredentials) => void;
  onCancel?: () => void;
  compact?: boolean;
}

export const IloCredentialsForm = ({ 
  credentials, 
  onSave, 
  onCancel,
  compact = false 
}: IloCredentialsFormProps) => {
  const [host, setHost] = useState(credentials?.host || '');
  const [username, setUsername] = useState(credentials?.username || '');
  const [password, setPassword] = useState(credentials?.password || '');
  const [showPassword, setShowPassword] = useState(false);
  const [isTesting, setIsTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

  const handleTest = async () => {
    if (!host || !username || !password) return;
    
    setIsTesting(true);
    setTestResult(null);
    
    try {
      const creds: IloCredentials = { host, username, password };
      const result = await iloApi.testConnection(creds);
      setTestResult(result.success ? 'success' : 'error');
    } catch {
      setTestResult('error');
    }
    
    setIsTesting(false);
  };

  const handleSave = () => {
    if (!host || !username || !password) return;
    onSave({ host, username, password });
  };

  const isValid = host.trim() && username.trim() && password.trim();

  if (compact) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="host" className="text-xs uppercase tracking-wider text-muted-foreground">
              iLO Hostname / IP
            </Label>
            <Input
              id="host"
              placeholder="192.168.1.100 or ilo.example.com"
              value={host}
              onChange={(e) => setHost(e.target.value)}
              className="h-9 bg-secondary/50 border-border/60 focus:border-primary/50"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="username" className="text-xs uppercase tracking-wider text-muted-foreground">
              Username
            </Label>
            <Input
              id="username"
              placeholder="Administrator"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="h-9 bg-secondary/50 border-border/60 focus:border-primary/50"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password" className="text-xs uppercase tracking-wider text-muted-foreground">
              Password
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-9 bg-secondary/50 border-border/60 focus:border-primary/50 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            size="sm"
            onClick={handleTest}
            disabled={!isValid || isTesting}
            className="gap-2"
          >
            {isTesting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : testResult === 'success' ? (
              <CheckCircle className="h-3.5 w-3.5 text-green-500" />
            ) : testResult === 'error' ? (
              <XCircle className="h-3.5 w-3.5 text-red-500" />
            ) : null}
            Test Connection
          </Button>
          
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!isValid}
            className="gap-2 bg-primary/90 hover:bg-primary"
          >
            Save Credentials
          </Button>

          {onCancel && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
            >
              Cancel
            </Button>
          )}

          {testResult && (
            <span className={cn(
              "text-xs",
              testResult === 'success' ? 'text-green-500' : 'text-red-500'
            )}>
              {testResult === 'success' ? 'Connection successful!' : 'Connection failed'}
            </span>
          )}
        </div>
      </div>
    );
  }

  return (
    <Card className="card-line">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-2 text-sm uppercase tracking-wider">
          <Settings className="h-4 w-4 text-primary" />
          iLO Configuration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <Label htmlFor="host-full" className="text-xs uppercase tracking-wider text-muted-foreground">
              iLO Hostname / IP
            </Label>
            <Input
              id="host-full"
              placeholder="192.168.1.100 or ilo.example.com"
              value={host}
              onChange={(e) => setHost(e.target.value)}
              className="bg-secondary/50 border-border/60 focus:border-primary/50"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="username-full" className="text-xs uppercase tracking-wider text-muted-foreground">
              Username
            </Label>
            <Input
              id="username-full"
              placeholder="Administrator"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="bg-secondary/50 border-border/60 focus:border-primary/50"
            />
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="password-full" className="text-xs uppercase tracking-wider text-muted-foreground">
              Password
            </Label>
            <div className="relative">
              <Input
                id="password-full"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="bg-secondary/50 border-border/60 focus:border-primary/50 pr-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleTest}
            disabled={!isValid || isTesting}
            className="gap-2"
          >
            {isTesting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : testResult === 'success' ? (
              <CheckCircle className="h-3.5 w-3.5 text-green-500" />
            ) : testResult === 'error' ? (
              <XCircle className="h-3.5 w-3.5 text-red-500" />
            ) : null}
            Test Connection
          </Button>
          
          <Button
            size="sm"
            onClick={handleSave}
            disabled={!isValid}
            className="gap-2 bg-primary/90 hover:bg-primary"
          >
            Save Credentials
          </Button>

          {onCancel && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onCancel}
            >
              Cancel
            </Button>
          )}

          {testResult && (
            <span className={cn(
              "text-xs",
              testResult === 'success' ? 'text-green-500' : 'text-red-500'
            )}>
              {testResult === 'success' ? 'Connection successful!' : 'Connection failed'}
            </span>
          )}
        </div>

        <p className="text-xs text-muted-foreground pt-2">
          Note: Credentials are stored locally in your browser. A backend proxy is required for actual iLO communication.
        </p>
      </CardContent>
    </Card>
  );
};
