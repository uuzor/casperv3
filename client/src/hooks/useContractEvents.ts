/**
 * useContractEvents Hook
 * React hook for real-time contract event listening
 */

import { useEffect, useCallback, useState } from 'react';
import { CasperCloudService, ContractEvent } from '../services/casper-cloud.service';

export interface UseContractEventsReturn {
  events: ContractEvent[];
  isListening: boolean;
  error: Error | null;
  clearEvents: () => void;
}

export const useContractEvents = (
  cloudService: CasperCloudService,
  contractHash: string,
  eventNames?: string[]
): UseContractEventsReturn => {
  const [events, setEvents] = useState<ContractEvent[]>([]);
  const [isListening, setIsListening] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    setIsListening(true);
    setError(null);

    try {
      // Start streaming events
      cloudService.streamContractEvents(contractHash, {
        eventFilter: eventNames,
      });

      // Subscribe to all events or specific ones
      const unsubscribers: Array<() => void> = [];

      if (eventNames && eventNames.length > 0) {
        eventNames.forEach(eventName => {
          const unsubscribe = cloudService.onContractEvent(eventName, (event) => {
            setEvents(prev => [event, ...prev].slice(0, 100)); // Keep last 100 events
          });
          unsubscribers.push(unsubscribe);
        });
      } else {
        // Subscribe to all events
        const unsubscribe = cloudService.onContractEvent('*', (event) => {
          setEvents(prev => [event, ...prev].slice(0, 100));
        });
        unsubscribers.push(unsubscribe);
      }

      return () => {
        unsubscribers.forEach(unsub => unsub());
        cloudService.closeEventStream();
        setIsListening(false);
      };
    } catch (err) {
      setError(err as Error);
      setIsListening(false);
      console.error('Error setting up event listeners:', err);
    }
  }, [cloudService, contractHash, eventNames]);

  const clearEvents = useCallback(() => {
    setEvents([]);
  }, []);

  return {
    events,
    isListening,
    error,
    clearEvents,
  };
};

/**
 * Hook for specific event types
 */
export const useBetEvents = (
  cloudService: CasperCloudService,
  contractHash: string
) => {
  return useContractEvents(cloudService, contractHash, ['BetPlaced', 'BetSettled']);
};

export const useMatchEvents = (
  cloudService: CasperCloudService,
  contractHash: string
) => {
  return useContractEvents(cloudService, contractHash, ['MatchPlayed', 'MatchStarted']);
};

export const useSeasonEvents = (
  cloudService: CasperCloudService,
  contractHash: string
) => {
  return useContractEvents(cloudService, contractHash, ['SeasonStarted', 'SeasonEnded']);
};
