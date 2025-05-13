import * as fs from 'fs';
import * as path from 'path';
import * as util from 'util';

enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3
}

export class Logger {
  private logDir: string;
  private logFile: string;
  private maxFileSize: number; // in bytes
  private logLevel: LogLevel;
  private writeStream: fs.WriteStream | null = null;
  private currentFileSize: number = 0;
  private lastStreamCheck: number = 0;
  private readonly streamCheckInterval: number = 5000; // 5 seconds
  private isRecovering: boolean = false; // Flag to prevent recursive recovery

  constructor(options: {
    logDir?: string,
    logLevel?: LogLevel,
    maxFileSize?: number // in MB
  } = {}) {
    // Default options
    this.logDir = options.logDir || path.join(process.cwd(), 'logs');
    this.logLevel = options.logLevel !== undefined ? options.logLevel : LogLevel.INFO;
    this.maxFileSize = (options.maxFileSize || 10) * 1024 * 1024; // Convert MB to bytes

    // Create log directory if it doesn't exist
    if (!fs.existsSync(this.logDir)) {
      fs.mkdirSync(this.logDir, { recursive: true });
    }

    // Use a fixed log file name
    this.logFile = path.join(this.logDir, 'server.log');
    this.initLogFile();
  }

  /**
   * Format a date to local timezone format: YYYY-MM-DD HH:MM:SS.mmm
   */
  private formatLocalTime(date: Date): string {
    const pad = (n: number) => n < 10 ? `0${n}` : `${n}`;
    
    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1);
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());
    const seconds = pad(date.getSeconds());
    
    // Get milliseconds and ensure it's 3 digits
    const ms = date.getMilliseconds();
    const msStr = ms < 10 ? `00${ms}` : (ms < 100 ? `0${ms}` : `${ms}`);
    
    return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}.${msStr}`;
  }

  /**
   * Format a date for use in filenames (without spaces or colons)
   */
  private formatTimeForFilename(date: Date): string {
    return this.formatLocalTime(date).replace(/[: ]/g, '-');
  }

  /**
   * Check if log file exists and handle its absence 
   */
  private ensureLogFileExists(): boolean {
    // If log file has been deleted, recreate it
    if (this.writeStream && !fs.existsSync(this.logFile)) {
      console.warn(`Log file ${this.logFile} was deleted. Creating a new log file.`);
      
      // Close current stream if it exists
      try {
        this.writeStream.end();
      } catch (err: unknown) {
        // Ignore errors when closing the stream for a deleted file
      }
      
      this.writeStream = null;
      this.currentFileSize = 0;
      
      // Create a new log file and stream
      this.initLogFile();
      return true;
    }
    
    return false;
  }

  private initLogFile(): void {
    // Close existing stream if any
    if (this.writeStream) {
      try {
        this.writeStream.end();
      } catch (err: unknown) {
        // Ignore errors when closing the stream
      }
      this.writeStream = null;
    }

    // Check if file already exists and get its size
    if (fs.existsSync(this.logFile)) {
      const stats = fs.statSync(this.logFile);
      this.currentFileSize = stats.size;
    } else {
      this.currentFileSize = 0;
    }

    // Create new write stream
    this.writeStream = fs.createWriteStream(this.logFile, { flags: 'a' });
    
    // Set up error handler for the stream
    this.writeStream.on('error', (err) => {
      console.error(`Error with log stream: ${err instanceof Error ? err.message : String(err)}`);
      this.writeStream = null;
    });

    // Add session start marker to log file
    const localTime = this.formatLocalTime(new Date());
    const header = `\n===== Log session started at ${localTime} =====\n`;
    
    // Use direct write to avoid potential recursion
    if (this.writeStream) {
      try {
        this.writeStream.write(header);
        this.currentFileSize += Buffer.byteLength(header, 'utf8');
      } catch (err: unknown) {
        console.error(`Failed to write header: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    
    // Update the last check time
    this.lastStreamCheck = Date.now();
  }

  private rotateLogFile(): void {
    // Avoid recursive rotations
    if (this.isRecovering) {
      return;
    }
    
    this.isRecovering = true;
    
    // Close current stream
    if (this.writeStream) {
      try {
        this.writeStream.end();
      } catch (err: unknown) {
        // Ignore errors when closing the stream
      }
      this.writeStream = null;
    }

    // Create backup file with timestamp
    if (fs.existsSync(this.logFile)) {
      const timestamp = this.formatTimeForFilename(new Date());
      const backupFile = path.join(this.logDir, `server-${timestamp}.log.bak`);
      try {
        fs.renameSync(this.logFile, backupFile);
      } catch (err: unknown) {
        console.error(`Failed to rotate log file: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    // Reset file size counter and create a new stream
    this.currentFileSize = 0;
    this.writeStream = fs.createWriteStream(this.logFile, { flags: 'a' });
    
    // Set up error handler for the stream
    this.writeStream.on('error', (err) => {
      console.error(`Error with log stream: ${err instanceof Error ? err.message : String(err)}`);
      this.writeStream = null;
    });
    
    // Log rotation message - write directly to avoid recursion
    const localTime = this.formatLocalTime(new Date());
    const rotationMessage = `===== Log file rotated at ${localTime} =====\n`;
    
    if (this.writeStream) {
      try {
        this.writeStream.write(rotationMessage);
        this.currentFileSize += Buffer.byteLength(rotationMessage, 'utf8');
      } catch (err: unknown) {
        console.error(`Failed to write rotation message: ${err instanceof Error ? err.message : String(err)}`);
      }
    }
    
    // Update the last check time
    this.lastStreamCheck = Date.now();
    this.isRecovering = false;
  }

  private checkRotation(messageSize: number): void {
    // If adding this message would exceed the max file size, rotate
    if (!this.isRecovering && this.currentFileSize + messageSize > this.maxFileSize) {
      console.debug(`Log file size (${this.currentFileSize} bytes) would exceed limit. Rotating log file.`);
      this.rotateLogFile();
    }
  }

  private writeToStream(message: string): void {
    // Guard against recursive calls during recovery
    if (this.isRecovering) {
      console.warn('Skipping log write during recovery');
      return;
    }
    
    // Periodically check if log file still exists
    const now = Date.now();
    if (now - this.lastStreamCheck > this.streamCheckInterval) {
      this.ensureLogFileExists();
      this.lastStreamCheck = now;
    }
    
    // If we don't have a valid stream, initialize log file
    if (!this.writeStream) {
      this.initLogFile();
    }
    
    // Safety check - if we still don't have a stream, log to console and exit
    if (!this.writeStream) {
      console.error('Failed to create log stream, logging to console only:', message);
      return;
    }
    
    try {
      this.writeStream.write(message);
      this.currentFileSize += Buffer.byteLength(message, 'utf8');
    } catch (err: unknown) {
      console.error(`Failed to write to log file: ${err instanceof Error ? err.message : String(err)}`);
      
      // Only attempt recovery if not already in recovery mode
      if (!this.isRecovering) {
        this.isRecovering = true;
        
        // Try to recreate the log file and stream
        this.initLogFile();
        
        // Try writing again
        if (this.writeStream) {
          try {
            this.writeStream.write(message);
            this.currentFileSize += Buffer.byteLength(message, 'utf8');
          } catch (retryErr: unknown) {
            console.error(`Failed to write to log file after recovery attempt: ${retryErr instanceof Error ? retryErr.message : String(retryErr)}`);
          }
        }
        
        this.isRecovering = false;
      }
    }
  }

  private formatMessage(level: string, message: string, ...args: any[]): string {
    const timestamp = this.formatLocalTime(new Date());
    const formattedMessage = args.length ? util.format(message, ...args) : message;
    return `[${timestamp}] [${level}] ${formattedMessage}\n`;
  }

  public debug(message: string, ...args: any[]): void {
    if (this.logLevel <= LogLevel.DEBUG) {
      const formattedMessage = this.formatMessage('DEBUG', message, ...args);
      this.checkRotation(Buffer.byteLength(formattedMessage, 'utf8'));
      this.writeToStream(formattedMessage);
      console.debug(`[DEBUG] ${message}`, ...args);
    }
  }

  public info(message: string, ...args: any[]): void {
    if (this.logLevel <= LogLevel.INFO) {
      const formattedMessage = this.formatMessage('INFO', message, ...args);
      this.checkRotation(Buffer.byteLength(formattedMessage, 'utf8'));
      this.writeToStream(formattedMessage);
      console.info(`[INFO] ${message}`, ...args);
    }
  }

  public warn(message: string, ...args: any[]): void {
    if (this.logLevel <= LogLevel.WARN) {
      const formattedMessage = this.formatMessage('WARN', message, ...args);
      this.checkRotation(Buffer.byteLength(formattedMessage, 'utf8'));
      this.writeToStream(formattedMessage);
      console.warn(`[WARN] ${message}`, ...args);
    }
  }

  public error(message: string, ...args: any[]): void {
    if (this.logLevel <= LogLevel.ERROR) {
      const formattedMessage = this.formatMessage('ERROR', message, ...args);
      this.checkRotation(Buffer.byteLength(formattedMessage, 'utf8'));
      this.writeToStream(formattedMessage);
      console.error(`[ERROR] ${message}`, ...args);
    }
  }

  public close(): void {
    if (this.writeStream) {
      const localTime = this.formatLocalTime(new Date());
      try {
        this.writeStream.end(`===== Log session closed at ${localTime} =====\n\n`);
      } catch (err: unknown) {
        console.error(`Failed to close log file: ${err instanceof Error ? err.message : String(err)}`);
      }
      this.writeStream = null;
    }
  }

  /**
   * Create a singleton instance of the logger
   */
  private static instance: Logger;

  public static getInstance(options?: {
    logDir?: string,
    logLevel?: LogLevel,
    maxFileSize?: number
  }): Logger {
    if (!Logger.instance) {
      Logger.instance = new Logger(options);
    }
    return Logger.instance;
  }
}

// Export the LogLevel enum
export { LogLevel }; 