import { useState, useEffect, useCallback } from 'react';
import { testBackendConnection, getBackendUrl } from '@/services/backendConfig';

export interface ConnectionState {
  status: 'connected' | 'disconnected' | 'checking';
  message: string;
  url: string;
  lastChecked: Date | null;
}

export function useConnectionStatus(checkInterval = 10000) {
  const [state, setState] = useState<ConnectionState>({
    status: 'checking',
    message: 'Checking connection...',
    url: getBackendUrl(),
    lastChecked: null,
  });

  const checkConnection = useCallback(async () => {
    const url = getBackendUrl();
    setState(prev => ({ ...prev, status: 'checking', url }));
    
    const result = await testBackendConnection(url);
    
    setState({
      status: result.success ? 'connected' : 'disconnected',
      message: result.message,
      url,
      lastChecked: new Date(),
    });
  }, []);

  useEffect(() => {
    checkConnection();
    const interval = setInterval(checkConnection, checkInterval);
    
    // Listen for config changes
    const handleConfigChange = () => {
      checkConnection();
    };
    window.addEventListener('backend-config-change', handleConfigChange);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('backend-config-change', handleConfigChange);
    };
  }, [checkConnection, checkInterval]);

  return { ...state, refresh: checkConnection };
}
