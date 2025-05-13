import type { IncomingMessage } from 'http';
import { Logger } from './Logger';

export class NetworkUtils {
  private static readonly logger = Logger.getInstance();
  private static readonly dockerNetworkPrefixes = [
    '172.',
    '10.',
    '192.168.',
    '::ffff:172.',
    '::ffff:10.',
    '::ffff:192.168.'
  ];

  /**
   * Get client IP address from request
   * Handles various proxy and direct connection scenarios
   */
  public static getClientIp(req: IncomingMessage): string {
    // Debug headers to help diagnose connection issues
    this.logger.debug("Connection headers:", JSON.stringify(req.headers, null, 2));
    
    // Try to get IP from various headers in order of preference
    const headers = [
      'x-real-ip',           // Nginx proxy
      'x-forwarded-for',     // Standard proxy header
      'cf-connecting-ip',    // Cloudflare
      'true-client-ip',      // Akamai and Cloudflare
      'x-client-ip',         // Custom header
      'forwarded-for',       // Standard proxy header
      'forwarded'            // Standard proxy header
    ];

    // Check each header
    for (const header of headers) {
      const value = req.headers[header];
      if (value) {
        // Handle array or string values
        const ip = Array.isArray(value) ? value[0] : value;
        // Split on comma and get first IP (in case of multiple)
        const firstIp = ip.split(',')[0].trim();
        this.logger.debug(`Found IP in ${header}:`, firstIp);
        return firstIp;
      }
    }

    // If no valid IP in headers, use socket address
    const socketIp = req.socket.remoteAddress;
    if (socketIp) {
      return socketIp;
    }

    // If still no valid IP, return unknown
    return 'unknown';
  }

  /**
   * Check if IP is a local/private network address or Docker network
   */
  public static isInternalConnection(ip: string): boolean {
    if (!ip) return false;
    
    // Check for localhost
    if (ip === '::1' || ip === '127.0.0.1' || ip.includes('localhost')) {
      return true;
    }
    
    // Check for Docker or private network IPs
    for (const prefix of this.dockerNetworkPrefixes) {
      if (ip.startsWith(prefix)) {
        return true;
      }
    }
    
    return false;
  }
} 