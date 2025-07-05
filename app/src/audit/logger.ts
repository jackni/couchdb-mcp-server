export interface AuditEvent {
  timestamp: Date;
  operation: string;
  parameters: any;
  result?: 'success' | 'error';
  error?: string;
  duration?: number;
  clusterId?: string;
  databaseName?: string;
  userId?: string;
  metadata?: Record<string, any>;
}

export class AuditLogger {
  private events: AuditEvent[] = [];
  private maxEvents = 10000; // Keep last 10k events in memory
  
  constructor(private config?: { maxEvents?: number; persistToFile?: boolean; logLevel?: string }) {
    this.maxEvents = config?.maxEvents || 10000;
  }

  logOperation(operation: string, parameters: any, metadata?: Record<string, any>): void {
    const event: AuditEvent = {
      timestamp: new Date(),
      operation,
      parameters: this.sanitizeParameters(parameters),
      metadata,
    };

    this.addEvent(event);
    this.logToConsole(event);
  }

  logSuccess(operation: string, parameters: any, duration?: number, metadata?: Record<string, any>): void {
    const event: AuditEvent = {
      timestamp: new Date(),
      operation,
      parameters: this.sanitizeParameters(parameters),
      result: 'success',
      duration,
      metadata,
    };

    this.addEvent(event);
    this.logToConsole(event);
  }

  logError(operation: string, parameters: any, error: string, metadata?: Record<string, any>): void {
    const event: AuditEvent = {
      timestamp: new Date(),
      operation,
      parameters: this.sanitizeParameters(parameters),
      result: 'error',
      error,
      metadata,
    };

    this.addEvent(event);
    this.logToConsole(event);
  }

  // Log database-specific operations
  logDatabaseOperation(
    operation: string,
    clusterId: string,
    databaseName: string,
    parameters: any,
    result?: 'success' | 'error',
    error?: string
  ): void {
    const event: AuditEvent = {
      timestamp: new Date(),
      operation,
      parameters: this.sanitizeParameters(parameters),
      result,
      error,
      clusterId,
      databaseName,
    };

    this.addEvent(event);
    this.logToConsole(event);
  }

  // Log user-related operations
  logUserOperation(
    operation: string,
    clusterId: string,
    userId: string,
    parameters: any,
    result?: 'success' | 'error',
    error?: string
  ): void {
    const event: AuditEvent = {
      timestamp: new Date(),
      operation,
      parameters: this.sanitizeParameters(parameters),
      result,
      error,
      clusterId,
      userId,
    };

    this.addEvent(event);
    this.logToConsole(event);
  }

  private addEvent(event: AuditEvent): void {
    this.events.push(event);
    
    // Keep only the last maxEvents
    if (this.events.length > this.maxEvents) {
      this.events = this.events.slice(-this.maxEvents);
    }
  }

  private logToConsole(event: AuditEvent): void {
    const logLevel = this.config?.logLevel || 'info';
    
    if (logLevel === 'debug' || event.result === 'error') {
      const logData = {
        timestamp: event.timestamp.toISOString(),
        operation: event.operation,
        result: event.result,
        clusterId: event.clusterId,
        databaseName: event.databaseName,
        userId: event.userId,
        error: event.error,
        duration: event.duration,
      };

      if (event.result === 'error') {
        console.error('AUDIT:', JSON.stringify(logData));
      } else {
        console.log('AUDIT:', JSON.stringify(logData));
      }
    }
  }

  private sanitizeParameters(parameters: any): any {
    if (!parameters) return parameters;
    
    // Create a deep copy to avoid modifying the original
    const sanitized = JSON.parse(JSON.stringify(parameters));
    
    // Remove sensitive information
    const sensitiveKeys = ['password', 'adminPassword', 'adminUsername', 'auth', 'authorization', 'token', 'key', 'secret'];
    
    const sanitizeObject = (obj: any): any => {
      if (typeof obj !== 'object' || obj === null) {
        return obj;
      }
      
      if (Array.isArray(obj)) {
        return obj.map(sanitizeObject);
      }
      
      const result: any = {};
      for (const [key, value] of Object.entries(obj)) {
        const lowerKey = key.toLowerCase();
        const isSensitive = sensitiveKeys.some(sensitiveKey => lowerKey.includes(sensitiveKey));
        
        if (isSensitive) {
          result[key] = '[REDACTED]';
        } else if (typeof value === 'object' && value !== null) {
          result[key] = sanitizeObject(value);
        } else {
          result[key] = value;
        }
      }
      
      return result;
    };
    
    return sanitizeObject(sanitized);
  }

  // Query methods
  getEvents(filter?: {
    operation?: string;
    result?: 'success' | 'error';
    clusterId?: string;
    databaseName?: string;
    userId?: string;
    since?: Date;
    until?: Date;
  }): AuditEvent[] {
    let filteredEvents = [...this.events];
    
    if (filter) {
      if (filter.operation) {
        filteredEvents = filteredEvents.filter(e => e.operation === filter.operation);
      }
      
      if (filter.result) {
        filteredEvents = filteredEvents.filter(e => e.result === filter.result);
      }
      
      if (filter.clusterId) {
        filteredEvents = filteredEvents.filter(e => e.clusterId === filter.clusterId);
      }
      
      if (filter.databaseName) {
        filteredEvents = filteredEvents.filter(e => e.databaseName === filter.databaseName);
      }
      
      if (filter.userId) {
        filteredEvents = filteredEvents.filter(e => e.userId === filter.userId);
      }
      
      if (filter.since) {
        filteredEvents = filteredEvents.filter(e => e.timestamp >= filter.since!);
      }
      
      if (filter.until) {
        filteredEvents = filteredEvents.filter(e => e.timestamp <= filter.until!);
      }
    }
    
    return filteredEvents.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  getErrorEvents(): AuditEvent[] {
    return this.getEvents({ result: 'error' });
  }

  getRecentEvents(count: number = 100): AuditEvent[] {
    return this.events
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, count);
  }

  // Statistics
  getOperationStats(): Record<string, { total: number; success: number; error: number }> {
    const stats: Record<string, { total: number; success: number; error: number }> = {};
    
    for (const event of this.events) {
      if (!stats[event.operation]) {
        stats[event.operation] = { total: 0, success: 0, error: 0 };
      }
      
      stats[event.operation].total++;
      
      if (event.result === 'success') {
        stats[event.operation].success++;
      } else if (event.result === 'error') {
        stats[event.operation].error++;
      }
    }
    
    return stats;
  }

  // Export/Import functionality
  exportEvents(filter?: Parameters<typeof this.getEvents>[0]): string {
    const events = this.getEvents(filter);
    return JSON.stringify(events, null, 2);
  }

  clear(): void {
    this.events = [];
  }

  // Metrics for monitoring
  getMetrics(): {
    totalEvents: number;
    errorRate: number;
    operationsPerMinute: number;
    recentErrors: AuditEvent[];
  } {
    const now = new Date();
    const oneMinuteAgo = new Date(now.getTime() - 60 * 1000);
    
    const recentEvents = this.events.filter(e => e.timestamp >= oneMinuteAgo);
    const errorEvents = this.events.filter(e => e.result === 'error');
    const recentErrors = errorEvents.filter(e => e.timestamp >= oneMinuteAgo);
    
    return {
      totalEvents: this.events.length,
      errorRate: this.events.length > 0 ? errorEvents.length / this.events.length : 0,
      operationsPerMinute: recentEvents.length,
      recentErrors: recentErrors.slice(-10), // Last 10 errors
    };
  }
}