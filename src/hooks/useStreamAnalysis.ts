import { useState, useEffect, useCallback, useRef } from 'react';
import { ChannelAnalysis, StreamAnalysis } from '@/types/stream';
import { api } from '@/services/mockApi';

// Hook for bulk channel bitrate monitoring
export function useChannelAnalysis(refreshInterval = 2000) {
  const [analyses, setAnalyses] = useState<Record<number, ChannelAnalysis>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchAnalyses = useCallback(async () => {
    try {
      const result = await api.getStreamAnalyses();
      if (result.success && result.data) {
        const analysisMap: Record<number, ChannelAnalysis> = {};
        for (const analysis of result.data) {
          analysisMap[analysis.channelId] = analysis;
        }
        setAnalyses(analysisMap);
        setError(null);
      }
    } catch (err) {
      setError('Failed to fetch stream analyses');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAnalyses();
    intervalRef.current = setInterval(fetchAnalyses, refreshInterval);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [fetchAnalyses, refreshInterval]);

  return { analyses, isLoading, error, refetch: fetchAnalyses };
}

// Hook for single channel detailed analysis
export function useStreamAnalysis(channelId: number | null, refreshInterval = 3000) {
  const [analysis, setAnalysis] = useState<StreamAnalysis | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchAnalysis = useCallback(async () => {
    if (channelId === null) return;
    
    setIsLoading(true);
    try {
      const result = await api.getStreamAnalysis(channelId);
      if (result.success && result.data) {
        setAnalysis(result.data);
        setError(null);
      }
    } catch (err) {
      setError('Failed to fetch stream analysis');
    } finally {
      setIsLoading(false);
    }
  }, [channelId]);

  useEffect(() => {
    if (channelId === null) {
      setAnalysis(null);
      return;
    }

    fetchAnalysis();
    intervalRef.current = setInterval(fetchAnalysis, refreshInterval);
    
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [channelId, fetchAnalysis, refreshInterval]);

  return { analysis, isLoading, error, refetch: fetchAnalysis };
}
