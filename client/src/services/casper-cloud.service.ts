/**
 * CSPR.cloud Integration Service
 * Enterprise-grade middleware for indexed blockchain data and real-time streaming
 */

import axios, { AxiosInstance } from 'axios';

export interface CSPRCloudConfig {
  apiKey: string;
  baseUrl: string;
  network: 'mainnet' | 'testnet';
}

export interface AccountInfo {
  publicKey: string;
  balance: string;
  namedKeys: Record<string, string>;
}

export interface DeployInfo {
  deployHash: string;
  status: 'pending' | 'success' | 'failed';
  blockHash?: string;
  timestamp?: number;
  errorMessage?: string;
}

export interface ContractEvent {
  contractHash: string;
  eventName: string;
  data: Record<string, any>;
  blockHeight: number;
  deployHash: string;
  timestamp: number;
}

export interface StreamOptions {
  fromBlock?: number;
  toBlock?: number;
  eventFilter?: string[];
}

export class CasperCloudService {
  private static instance: CasperCloudService;
  private client: AxiosInstance;
  private config: CSPRCloudConfig;
  private eventSource: EventSource | null = null;
  private eventListeners: Map<string, Set<(event: ContractEvent) => void>> = new Map();

  private constructor(config: CSPRCloudConfig) {
    this.config = config;
    this.client = axios.create({
      baseURL: config.baseUrl,
      headers: {
        'Authorization': `Bearer ${config.apiKey}`,
        'Content-Type': 'application/json',
      },
    });
  }

  static getInstance(config?: CSPRCloudConfig): CasperCloudService {
    if (!CasperCloudService.instance) {
      if (!config) {
        throw new Error('Config required for first initialization');
      }
      CasperCloudService.instance = new CasperCloudService(config);
    }
    return CasperCloudService.instance;
  }

  /**
   * Get account information including balance and named keys
   */
  async getAccountInfo(publicKey: string): Promise<AccountInfo> {
    try {
      const response = await this.client.get(`/account/${publicKey}`);
      return {
        publicKey,
        balance: response.data.balance,
        namedKeys: response.data.namedKeys || {},
      };
    } catch (error) {
      console.error('Error fetching account info:', error);
      throw error;
    }
  }

  /**
   * Get account balance in CSPR
   */
  async getAccountBalance(publicKey: string): Promise<string> {
    try {
      const accountInfo = await this.getAccountInfo(publicKey);
      // Convert motes to CSPR (1 CSPR = 1e9 motes)
      const balanceInCSPR = (BigInt(accountInfo.balance) / BigInt(1e9)).toString();
      return balanceInCSPR;
    } catch (error) {
      console.error('Error fetching balance:', error);
      return '0';
    }
  }

  /**
   * Get deploy status
   */
  async getDeployStatus(deployHash: string): Promise<DeployInfo> {
    try {
      const response = await this.client.get(`/deploy/${deployHash}`);
      return {
        deployHash,
        status: response.data.executionResults[0]?.result?.Success ? 'success' : 'failed',
        blockHash: response.data.header?.blockHash,
        timestamp: response.data.header?.timestamp,
        errorMessage: response.data.executionResults[0]?.result?.Failure?.error_message,
      };
    } catch (error) {
      console.error('Error fetching deploy status:', error);
      return {
        deployHash,
        status: 'pending',
      };
    }
  }

  /**
   * Query contract state
   */
  async queryContractState(
    contractHash: string,
    stateKey: string
  ): Promise<any> {
    try {
      const response = await this.client.post('/query/state', {
        contractHash,
        key: stateKey,
      });
      return response.data.value;
    } catch (error) {
      console.error('Error querying contract state:', error);
      throw error;
    }
  }

  /**
   * Get contract events by block range
   */
  async getContractEvents(
    contractHash: string,
    options: StreamOptions = {}
  ): Promise<ContractEvent[]> {
    try {
      const response = await this.client.get('/events', {
        params: {
          contractHash,
          fromBlock: options.fromBlock,
          toBlock: options.toBlock,
          eventFilter: options.eventFilter?.join(','),
        },
      });

      return response.data.events.map((event: any) => ({
        contractHash,
        eventName: event.name,
        data: event.data,
        blockHeight: event.blockHeight,
        deployHash: event.deployHash,
        timestamp: event.timestamp,
      }));
    } catch (error) {
      console.error('Error fetching contract events:', error);
      return [];
    }
  }

  /**
   * Stream real-time contract events using Server-Sent Events (SSE)
   */
  streamContractEvents(
    contractHash: string,
    options: StreamOptions = {}
  ): void {
    const params = new URLSearchParams({
      contractHash,
      ...(options.fromBlock && { fromBlock: options.fromBlock.toString() }),
      ...(options.eventFilter && { eventFilter: options.eventFilter.join(',') }),
    });

    const streamUrl = `${this.config.baseUrl}/stream/events?${params}`;

    // Close existing stream if any
    this.closeEventStream();

    // Create new EventSource
    this.eventSource = new EventSource(streamUrl, {
      withCredentials: false,
    });

    this.eventSource.onmessage = (event) => {
      try {
        const contractEvent: ContractEvent = JSON.parse(event.data);
        this.notifyEventListeners(contractEvent.eventName, contractEvent);
      } catch (error) {
        console.error('Error parsing event:', error);
      }
    };

    this.eventSource.onerror = (error) => {
      console.error('EventSource error:', error);
      this.eventSource?.close();
    };
  }

  /**
   * Subscribe to specific contract event
   */
  onContractEvent(
    eventName: string,
    callback: (event: ContractEvent) => void
  ): () => void {
    if (!this.eventListeners.has(eventName)) {
      this.eventListeners.set(eventName, new Set());
    }

    this.eventListeners.get(eventName)!.add(callback);

    // Return unsubscribe function
    return () => {
      this.eventListeners.get(eventName)?.delete(callback);
    };
  }

  /**
   * Notify event listeners
   */
  private notifyEventListeners(eventName: string, event: ContractEvent): void {
    const listeners = this.eventListeners.get(eventName);
    if (listeners) {
      listeners.forEach(callback => callback(event));
    }

    // Also notify wildcard listeners
    const wildcardListeners = this.eventListeners.get('*');
    if (wildcardListeners) {
      wildcardListeners.forEach(callback => callback(event));
    }
  }

  /**
   * Close event stream
   */
  closeEventStream(): void {
    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }
  }

  /**
   * Get historical data for a specific contract query
   */
  async getHistoricalData(
    contractHash: string,
    query: string,
    fromBlock?: number,
    toBlock?: number
  ): Promise<any[]> {
    try {
      const response = await this.client.post('/query/historical', {
        contractHash,
        query,
        fromBlock,
        toBlock,
      });

      return response.data.results;
    } catch (error) {
      console.error('Error fetching historical data:', error);
      return [];
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.closeEventStream();
    this.eventListeners.clear();
  }
}

// Factory function for easy initialization
export const createCasperCloudService = (
  apiKey: string,
  network: 'mainnet' | 'testnet' = 'testnet'
): CasperCloudService => {
  const baseUrl = network === 'mainnet'
    ? 'https://api.cspr.cloud/v1'
    : 'https://testnet.cspr.cloud/v1';

  return CasperCloudService.getInstance({
    apiKey,
    baseUrl,
    network,
  });
};
