/**
 * LiveEventsFeed Component
 * Real-time events feed showing contract activity
 */

import React, { useEffect, useState } from 'react';
import { ContractEvent } from '../../services/casper-cloud.service';
import './LiveEventsFeed.css';

interface LiveEventsFeedProps {
  events: ContractEvent[];
  maxEvents?: number;
}

export const LiveEventsFeed: React.FC<LiveEventsFeedProps> = ({
  events,
  maxEvents = 10,
}) => {
  const [displayEvents, setDisplayEvents] = useState<ContractEvent[]>([]);

  useEffect(() => {
    setDisplayEvents(events.slice(0, maxEvents));
  }, [events, maxEvents]);

  const formatTimestamp = (timestamp: number): string => {
    const date = new Date(timestamp * 1000);
    const now = new Date();
    const diff = Math.floor((now.getTime() - date.getTime()) / 1000);

    if (diff < 60) return `${diff}s ago`;
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return date.toLocaleDateString();
  };

  const getEventIcon = (eventName: string): string => {
    switch (eventName) {
      case 'BetPlaced':
        return '🎲';
      case 'BetSettled':
        return '💰';
      case 'MatchPlayed':
        return '⚽';
      case 'SeasonStarted':
        return '🏁';
      case 'SeasonEnded':
        return '🏆';
      case 'Transfer':
        return '💸';
      default:
        return '📢';
    }
  };

  const getEventMessage = (event: ContractEvent): string => {
    switch (event.eventName) {
      case 'BetPlaced':
        return `Bet placed on match #${event.data.match_id || '?'}`;
      case 'BetSettled':
        return `Bet settled - ${event.data.won ? 'Won' : 'Lost'}`;
      case 'MatchPlayed':
        return `Match #${event.data.match_id || '?'} completed`;
      case 'Transfer':
        return `${(parseFloat(event.data.value || '0') / 1e9).toFixed(2)} LEAGUE transferred`;
      default:
        return event.eventName;
    }
  };

  if (displayEvents.length === 0) {
    return (
      <div className="live-events-feed">
        <div className="feed-header">
          <h3>📡 Live Activity</h3>
          <span className="status-dot"></span>
        </div>
        <div className="no-events">
          <span>Waiting for activity...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="live-events-feed">
      <div className="feed-header">
        <h3>📡 Live Activity</h3>
        <span className="status-dot pulsing"></span>
      </div>

      <div className="events-list">
        {displayEvents.map((event, index) => (
          <div key={`${event.deployHash}-${index}`} className="event-item">
            <div className="event-icon">{getEventIcon(event.eventName)}</div>
            <div className="event-content">
              <div className="event-message">{getEventMessage(event)}</div>
              <div className="event-meta">
                <span className="event-time">{formatTimestamp(event.timestamp)}</span>
                <span className="event-separator">•</span>
                <span className="event-block">Block {event.blockHeight}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
