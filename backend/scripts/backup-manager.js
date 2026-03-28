/**
 * 🎯 MOSA FORGE: Enterprise Backup Manager
 * 
 * @module BackupManager
 * @description Enterprise-grade data backup, recovery, and disaster management
 * @version 1.0.0
 * @author Oumer Muktar | Powered by Chereka
 * 
 * 🏗️ ENTERPRISE FEATURES:
 * - Multi-strategy backup (full, incremental, differential)
 * - Automated backup scheduling and retention
 * - Cross-region replication for disaster recovery
 * - Encryption and security compliance
 * - Backup verification and integrity checks
 * - Performance-optimized backup operations
 */

const { EventEmitter } = require('events');
const { exec } = require('child_process');
const { promisify } = require('util');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const Redis = require('ioredis');
const { PrismaClient } = require('@prisma/client');
const AWS = require('aws-sdk');
const schedule = require('node-schedule');

const execAsync = promisify(exec);

// 🏗️ Enterprise Constants
const BACKUP_TYPES = {
  FULL: 'full',
  INCREMENTAL: 'incremental',
  DIFFERENTIAL: 'differential'
};

const BACKUP_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  FAILED: 'failed',
  VERIFIED: 'verified',
  CORRUPTED: 'corrupted'
};

const RETENTION_POLICIES = {
  DAILY: { count: 7, unit: 'days' },
  WEEKLY: { count: 4, unit: 'weeks' },
  MONTHLY: { count: 12, unit: 'months' },
  YEARLY: { count: 3, unit: 'years' }
};

/**
 * 🏗️ Enterprise Backup Manager Class
 * @class BackupManager
 * @extends EventEmitter
 */
class BackupManager extends EventEmitter {
  constructor(config = {}) {
    super();
    
    // 🏗️ Enterprise Configuration
    this.config = {
      // Storage configurations
      storage: {
        local: {
          enabled: config.localStorage !== false,
          path: config.localPath || '/backups/mosa-forge'
        },
        s3: {
          enabled: config.s3Enabled || false,
          bucket: config.s3Bucket || 'mosa-forge-backups',
          region: config.s3Region || 'us-east-1',
          accessKeyId: config.awsAccessKeyId,
          secretAccessKey: config.awsSecretAccessKey
        },
        encryption: {
          enabled: config.encryption !== false,
          algorithm: 'aes-256-gcm',
          key: config.encryptionKey || process.env.BACKUP_ENCRYPTION_KEY
        }
      },
      
      // Backup strategies
      strategies: {
        full: {
          schedule: config.fullBackupSchedule || '0 2 * * 0', // Weekly Sunday 2 AM
          retention: RETENTION_POLICIES.WEEKLY
        },
        incremental: {
          schedule: config.incrementalSchedule || '0 1 * * *', // Daily 1 AM
          retention: RETENTION_POLICIES.DAILY
        },
        differential: {
          schedule: config.differentialSchedule || '0 0 * * *', // Daily 12 AM
          retention: RETENTION_POLICIES.DAILY
        }
      },
      
      // Performance settings
      performance: {
        maxConcurrentBackups: config.maxConcurrentBackups || 3,
        chunkSize: config.chunkSize || '64MB',
        compression: config.compression !== false,
        verifyBackups: config.verifyBackups !== false
      },
      
      // Database configuration
      database: {
        host: config.dbHost || process.env.DATABASE_HOST,
        port: config.dbPort || process.env.DATABASE_PORT,
        name: config.dbName || process.env.DATABASE_NAME,
        user: config.dbUser || process.env.DATABASE_USER,
        password: config.dbPassword || process.env.DATABASE_PASSWORD
      },
      
      // Monitoring
      monitoring: {
        enabled: config.monitoring !== false,
        metricsInterval: config.metricsInterval || 60000 // 1 minute
      }
    };

    // 🏗️ Service Dependencies
    this.redis = new Redis(process.env.REDIS_URL);
    this.prisma = new PrismaClient();
    this.s3 = this.config.storage.s3.enabled ? new AWS.S3({
      accessKeyId: this.config.storage.s3.accessKeyId,
      secretAccessKey: this.config.storage.s3.secretAccessKey,
      region: this.config.storage.s3.region
    }) : null;

    // 🏗️ State Management
    this.activeBackups = new Map();
    this.backupQueue = [];
    this.metrics = {
      totalBackups: 0,
      successfulBackups: 0,
      failedBackups: 0,
      totalDataBackedUp: 0,
      averageBackupTime: 0,
      lastBackupTime: null,
      storageUsage: {
        local: 0,
        s3: 0
      }
    };

    // 🏗️ Initialize Manager
    this._initializeBackupManager();
  }

  /**
   * 🏗️ Initialize Backup Manager
   * @private
   */
  async _initializeBackupManager() {
    try {
      // Create backup directories
      await this._ensureBackupDirectories();
      
      // Initialize monitoring
      if (this.config.monitoring.enabled) {
        this._startMetricsCollection();
      }
      
      // Schedule automated backups
      this._scheduleBackupJobs();
      
      // Start cleanup scheduler
      this._startCleanupScheduler();
      
      this.emit('manager.initialized', {
        timestamp: new Date().toISOString(),
        strategies: Object.keys(this.config.strategies),
        storage: this._getStorageConfig()
      });
      
      console.log('✅ Backup Manager initialized successfully');
    } catch (error) {
      this.emit('manager.initialization.failed', {
        error: error.message,
        timestamp: new Date().toISOString()
      });
      throw error;
    }
  }

  /**
   * 🏗️ Ensure Backup Directories Exist
   * @private
   */
  async _ensureBackupDirectories() {
    const directories = [
      this.config.storage.local.path,
      path.join(this.config.storage.local.path, 'full'),
      path.join(this.config.storage.local.path, 'incremental'),
      path.join(this.config.storage.local.path, 'differential'),
      path.join(this.config.storage.local.path, 'temp'),
      path.join(this.config.storage.local.path, 'logs')
    ];

    for (const dir of directories) {
      try {
        await fs.access(dir);
      } catch {
        await fs.mkdir(dir, { recursive: true });
      }
    }
  }

  /**
   * 🏗️ Schedule Automated Backup Jobs
   * @private
   */
  _scheduleBackupJobs() {
    const { strategies } = this.config;

    // Schedule full backups
    schedule.scheduleJob(strategies.full.schedule, async () => {
      await this.createBackup(BACKUP_TYPES.FULL);
    });

    // Schedule incremental backups
    schedule.scheduleJob(strategies.incremental.schedule, async () => {
      await this.createBackup(BACKUP_TYPES.INCREMENTAL);
    });

    // Schedule differential backups
    schedule.scheduleJob(strategies.differential.schedule, async () => {
      await this.createBackup(BACKUP_TYPES.DIFFERENTIAL);
    });

    this.emit('backup.jobs.scheduled', {
      timestamp: new Date().toISOString(),
      schedules: strategies
    });
  }

  /**
   * 🏗️ Start Cleanup Scheduler
   * @private
   */
  _startCleanupScheduler() {
    // Run cleanup daily at 3 AM
    schedule.scheduleJob('0 3 * * *', async () => {
      await this._cleanupOldBackups();
    });
  }

  /**
   * 🎯 MAIN ENTERPRISE METHOD: Create Backup
   * @param {string} type - Backup type (full, incremental, differential)
   * @param {Object} options - Backup options
   * @returns {Promise<Object>} Backup result
   */
  async createBackup(type = BACKUP_TYPES.FULL, options = {}) {
    const backupId = uuidv4();
    const startTime = Date.now();

    // 🏗️ Validate backup type
    if (!Object.values(BACKUP_TYPES).includes(type)) {
      throw new Error(`Invalid backup type: ${type}`);
    }

    // 🏗️ Check concurrent backup limit
    if (this.activeBackups.size >= this.config.performance.maxConcurrentBackups) {
      this.backupQueue.push({ type, options, backupId });
      throw new Error('Maximum concurrent backups reached. Added to queue.');
    }

    try {
      this.activeBackups.set(backupId, { type, startTime, status: BACKUP_STATUS.IN_PROGRESS });

      this.emit('backup.started', {
        backupId,
        type,
        timestamp: new Date().toISOString(),
        options
      });

      // 🏗️ Create backup record in database
      const backupRecord = await this.prisma.backupRecord.create({
        data: {
          id: backupId,
          type,
          status: BACKUP_STATUS.IN_PROGRESS,
          startedAt: new Date(startTime),
          size: 0,
          checksum: '',
          storageLocations: [],
          metadata: {
            options,
            database: this.config.database.name,
            version: '1.0.0'
          }
        }
      });

      // 🏗️ Execute backup based on type
      let backupResult;
      switch (type) {
        case BACKUP_TYPES.FULL:
          backupResult = await this._createFullBackup(backupId, options);
          break;
        case BACKUP_TYPES.INCREMENTAL:
          backupResult = await this._createIncrementalBackup(backupId, options);
          break;
        case BACKUP_TYPES.DIFFERENTIAL:
          backupResult = await this._createDifferentialBackup(backupId, options);
          break;
      }

      // 🏗️ Update backup record
      await this.prisma.backupRecord.update({
        where: { id: backupId },
        data: {
          status: BACKUP_STATUS.COMPLETED,
          completedAt: new Date(),
          size: backupResult.size,
          checksum: backupResult.checksum,
          storageLocations: backupResult.storageLocations,
          metadata: {
            ...backupRecord.metadata,
            ...backupResult.metadata
          }
        }
      });

      // 🏗️ Verify backup if enabled
      if (this.config.performance.verifyBackups) {
        const verification = await this._verifyBackup(backupId, backupResult);
        if (verification.verified) {
          await this.prisma.backupRecord.update({
            where: { id: backupId },
            data: { status: BACKUP_STATUS.VERIFIED }
          });
        }
      }

      const endTime = Date.now();
      const duration = endTime - startTime;

      // 🏗️ Update metrics
      this._updateMetrics({
        type,
        size: backupResult.size,
        duration,
        success: true
      });

      this.emit('backup.completed', {
        backupId,
        type,
        duration,
        size: backupResult.size,
        timestamp: new Date().toISOString(),
        storageLocations: backupResult.storageLocations
      });

      this.activeBackups.delete(backupId);

      // 🏗️ Process next in queue
      this._processNextInQueue();

      return {
        success: true,
        backupId,
        type,
        duration,
        size: backupResult.size,
        storageLocations: backupResult.storageLocations,
        checksum: backupResult.checksum
      };

    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;

      // 🏗️ Update failed backup record
      await this.prisma.backupRecord.update({
        where: { id: backupId },
        data: {
          status: BACKUP_STATUS.FAILED,
          completedAt: new Date(),
          metadata: {
            error: error.message,
            stack: error.stack
          }
        }
      });

      // 🏗️ Update metrics
      this._updateMetrics({
        type,
        size: 0,
        duration,
        success: false
      });

      this.emit('backup.failed', {
        backupId,
        type,
        error: error.message,
        duration,
        timestamp: new Date().toISOString()
      });

      this.activeBackups.delete(backupId);
      this._processNextInQueue();

      throw error;
    }
  }

  /**
   * 🏗️ Create Full Backup
   * @private
   */
  async _createFullBackup(backupId, options) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `full-backup-${timestamp}.sql`;
    const localPath = path.join(this.config.storage.local.path, 'full', filename);

    this.emit('backup.full.started', { backupId, filename });

    // 🏗️ Create database dump
    const dumpCommand = this._buildDumpCommand(localPath);
    await execAsync(dumpCommand);

    // 🏗️ Compress backup
    if (this.config.performance.compression) {
      await this._compressBackup(localPath);
    }

    // 🏗️ Encrypt backup
    if (this.config.storage.encryption.enabled) {
      await this._encryptBackup(localPath);
    }

    // 🏗️ Calculate checksum
    const checksum = await this._calculateChecksum(localPath);
    const stats = await fs.stat(localPath);
    const size = stats.size;

    // 🏗️ Upload to cloud storage
    const storageLocations = [localPath];
    if (this.config.storage.s3.enabled) {
      const s3Key = `full/${filename}`;
      await this._uploadToS3(localPath, s3Key);
      storageLocations.push(`s3://${this.config.storage.s3.bucket}/${s3Key}`);
    }

    return {
      size,
      checksum,
      storageLocations,
      metadata: {
        filename,
        compressed: this.config.performance.compression,
        encrypted: this.config.storage.encryption.enabled
      }
    };
  }

  /**
   * 🏗️ Create Incremental Backup
   * @private
   */
  async _createIncrementalBackup(backupId, options) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `incremental-${timestamp}.sql`;
    const localPath = path.join(this.config.storage.local.path, 'incremental', filename);

    this.emit('backup.incremental.started', { backupId, filename });

    // 🏗️ Get last backup timestamp
    const lastBackup = await this.prisma.backupRecord.findFirst({
      where: {
        type: { in: [BACKUP_TYPES.FULL, BACKUP_TYPES.INCREMENTAL] },
        status: BACKUP_STATUS.COMPLETED
      },
      orderBy: { completedAt: 'desc' }
    });

    if (!lastBackup) {
      throw new Error('No previous backup found for incremental backup');
    }

    // 🏗️ Create incremental dump (since last backup)
    const dumpCommand = this._buildIncrementalDumpCommand(localPath, lastBackup.completedAt);
    await execAsync(dumpCommand);

    // 🏗️ Process compression and encryption
    if (this.config.performance.compression) {
      await this._compressBackup(localPath);
    }

    if (this.config.storage.encryption.enabled) {
      await this._encryptBackup(localPath);
    }

    const checksum = await this._calculateChecksum(localPath);
    const stats = await fs.stat(localPath);
    const size = stats.size;

    const storageLocations = [localPath];
    if (this.config.storage.s3.enabled) {
      const s3Key = `incremental/${filename}`;
      await this._uploadToS3(localPath, s3Key);
      storageLocations.push(`s3://${this.config.storage.s3.bucket}/${s3Key}`);
    }

    return {
      size,
      checksum,
      storageLocations,
      metadata: {
        filename,
        basedOn: lastBackup.id,
        since: lastBackup.completedAt,
        compressed: this.config.performance.compression,
        encrypted: this.config.storage.encryption.enabled
      }
    };
  }

  /**
   * 🏗️ Create Differential Backup
   * @private
   */
  async _createDifferentialBackup(backupId, options) {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `differential-${timestamp}.sql`;
    const localPath = path.join(this.config.storage.local.path, 'differential', filename);

    this.emit('backup.differential.started', { backupId, filename });

    // 🏗️ Get last full backup
    const lastFullBackup = await this.prisma.backupRecord.findFirst({
      where: {
        type: BACKUP_TYPES.FULL,
        status: BACKUP_STATUS.COMPLETED
      },
      orderBy: { completedAt: 'desc' }
    });

    if (!lastFullBackup) {
      throw new Error('No full backup found for differential backup');
    }

    // 🏗️ Create differential dump (since last full backup)
    const dumpCommand = this._buildDifferentialDumpCommand(localPath, lastFullBackup.completedAt);
    await execAsync(dumpCommand);

    // 🏗️ Process compression and encryption
    if (this.config.performance.compression) {
      await this._compressBackup(localPath);
    }

    if (this.config.storage.encryption.enabled) {
      await this._encryptBackup(localPath);
    }

    const checksum = await this._calculateChecksum(localPath);
    const stats = await fs.stat(localPath);
    const size = stats.size;

    const storageLocations = [localPath];
    if (this.config.storage.s3.enabled) {
      const s3Key = `differential/${filename}`;
      await this._uploadToS3(localPath, s3Key);
      storageLocations.push(`s3://${this.config.storage.s3.bucket}/${s3Key}`);
    }

    return {
      size,
      checksum,
      storageLocations,
      metadata: {
        filename,
        basedOn: lastFullBackup.id,
        since: lastFullBackup.completedAt,
        compressed: this.config.performance.compression,
        encrypted: this.config.storage.encryption.enabled
      }
    };
  }

  /**
   * 🏗️ Build Database Dump Command
   * @private
   */
  _buildDumpCommand(outputPath) {
    const { database } = this.config;
    return `pg_dump -h ${database.host} -p ${database.port} -U ${database.user} -d ${database.name} -F c -f ${outputPath}`;
  }

  /**
   * 🏗️ Build Incremental Dump Command
   * @private
   */
  _buildIncrementalDumpCommand(outputPath, sinceTimestamp) {
    const { database } = this.config;
    // This is a simplified version - in production you'd use WAL files or similar
    return `pg_dump -h ${database.host} -p ${database.port} -U ${database.user} -d ${database.name} -F c --data-only --since="${sinceTimestamp}" -f ${outputPath}`;
  }

  /**
   * 🏗️ Build Differential Dump Command
   * @private
   */
  _buildDifferentialDumpCommand(outputPath, sinceTimestamp) {
    const { database } = this.config;
    return `pg_dump -h ${database.host} -p ${database.port} -U ${database.user} -d ${database.name} -F c --data-only --since="${sinceTimestamp}" -f ${outputPath}`;
  }

  /**
   * 🏗️ Compress Backup File
   * @private
   */
  async _compressBackup(filePath) {
    const compressedPath = `${filePath}.gz`;
    await execAsync(`gzip -c ${filePath} > ${compressedPath}`);
    await fs.unlink(filePath); // Remove uncompressed file
    return compressedPath;
  }

  /**
   * 🏗️ Encrypt Backup File
   * @private
   */
  async _encryptBackup(filePath) {
    if (!this.config.storage.encryption.key) {
      throw new Error('Encryption key not configured');
    }

    const encryptedPath = `${filePath}.enc`;
    const key = crypto.createHash('sha256').update(this.config.storage.encryption.key).digest();
    
    const cipher = crypto.createCipher(this.config.storage.encryption.algorithm, key);
    const input = await fs.readFile(filePath);
    const encrypted = Buffer.concat([cipher.update(input), cipher.final()]);
    
    await fs.writeFile(encryptedPath, encrypted);
    await fs.unlink(filePath); // Remove unencrypted file
    
    return encryptedPath;
  }

  /**
   * 🏗️ Upload to S3
   * @private
   */
  async _uploadToS3(filePath, key) {
    if (!this.s3) {
      throw new Error('S3 storage not configured');
    }

    const fileStream = require('fs').createReadStream(filePath);
    
    const params = {
      Bucket: this.config.storage.s3.bucket,
      Key: key,
      Body: fileStream,
      ServerSideEncryption: 'AES256'
    };

    await this.s3.upload(params).promise();
  }

  /**
   * 🏗️ Calculate File Checksum
   * @private
   */
  async _calculateChecksum(filePath) {
    const fileBuffer = await fs.readFile(filePath);
    return crypto.createHash('sha256').update(fileBuffer).digest('hex');
  }

  /**
   * 🏗️ Verify Backup Integrity
   * @private
   */
  async _verifyBackup(backupId, backupResult) {
    try {
      // Verify local file exists and checksum matches
      const localPath = backupResult.storageLocations[0];
      const currentChecksum = await this._calculateChecksum(localPath);
      
      if (currentChecksum !== backupResult.checksum) {
        throw new Error('Backup checksum verification failed');
      }

      // Verify file can be read and has reasonable size
      const stats = await fs.stat(localPath);
      if (stats.size === 0) {
        throw new Error('Backup file is empty');
      }

      this.emit('backup.verified', { backupId, checksum: currentChecksum });

      return { verified: true, checksum: currentChecksum };
    } catch (error) {
      this.emit('backup.verification.failed', { backupId, error: error.message });
      return { verified: false, error: error.message };
    }
  }

  /**
   * 🎯 ENTERPRISE METHOD: Restore from Backup
   * @param {string} backupId - Backup ID to restore from
   * @param {Object} options - Restore options
   * @returns {Promise<Object>} Restore result
   */
  async restoreBackup(backupId, options = {}) {
    const startTime = Date.now();

    try {
      this.emit('restore.started', { backupId, timestamp: new Date().toISOString() });

      // 🏗️ Get backup record
      const backupRecord = await this.prisma.backupRecord.findUnique({
        where: { id: backupId }
      });

      if (!backupRecord) {
        throw new Error(`Backup not found: ${backupId}`);
      }

      if (backupRecord.status !== BACKUP_STATUS.COMPLETED && 
          backupRecord.status !== BACKUP_STATUS.VERIFIED) {
        throw new Error(`Backup not in restorable state: ${backupRecord.status}`);
      }

      // 🏗️ Download backup file if needed
      const localPath = await this._ensureBackupLocal(backupRecord);

      // 🏗️ Decrypt if encrypted
      let restorePath = localPath;
      if (backupRecord.metadata.encrypted) {
        restorePath = await this._decryptBackup(localPath);
      }

      // 🏗️ Decompress if compressed
      if (backupRecord.metadata.compressed) {
        restorePath = await this._decompressBackup(restorePath);
      }

      // 🏗️ Execute restore
      await this._executeRestore(restorePath, options);

      const endTime = Date.now();
      const duration = endTime - startTime;

      this.emit('restore.completed', {
        backupId,
        duration,
        timestamp: new Date().toISOString()
      });

      return {
        success: true,
        backupId,
        duration,
        restoredFrom: backupRecord.type,
        restoredAt: new Date().toISOString()
      };

    } catch (error) {
      const endTime = Date.now();
      const duration = endTime - startTime;

      this.emit('restore.failed', {
        backupId,
        error: error.message,
        duration,
        timestamp: new Date().toISOString()
      });

      throw error;
    }
  }

  /**
   * 🏗️ Ensure Backup is Available Locally
   * @private
   */
  async _ensureBackupLocal(backupRecord) {
    // Check if local file exists
    const localPath = backupRecord.storageLocations.find(loc => !loc.startsWith('s3://'));
    if (localPath && await this._fileExists(localPath)) {
      return localPath;
    }

    // Download from S3 if available
    const s3Path = backupRecord.storageLocations.find(loc => loc.startsWith('s3://'));
    if (s3Path && this.s3) {
      const s3Key = s3Path.replace(`s3://${this.config.storage.s3.bucket}/`, '');
      const localPath = path.join(this.config.storage.local.path, 'temp', path.basename(s3Key));
      
      await this._downloadFromS3(s3Key, localPath);
      return localPath;
    }

    throw new Error('No accessible backup file found');
  }

  /**
   * 🏗️ Execute Database Restore
   * @private
   */
  async _executeRestore(backupPath, options) {
    const { database } = this.config;
    
    // Drop and recreate database for full restore
    if (options.fullRestore) {
      await execAsync(`dropdb -h ${database.host} -p ${database.port} -U ${database.user} ${database.name}`);
      await execAsync(`createdb -h ${database.host} -p ${database.port} -U ${database.user} ${database.name}`);
    }

    // Restore from backup
    const restoreCommand = `pg_restore -h ${database.host} -p ${database.port} -U ${database.user} -d ${database.name} -c ${backupPath}`;
    await execAsync(restoreCommand);
  }

  /**
   * 🏗️ Cleanup Old Backups
   * @private
   */
  async _cleanupOldBackups() {
    const now = new Date();
    
    for (const [type, policy] of Object.entries(this.config.strategies)) {
      const cutoffDate = new Date(now);
      
      switch (policy.retention.unit) {
        case 'days':
          cutoffDate.setDate(cutoffDate.getDate() - policy.retention.count);
          break;
        case 'weeks':
          cutoffDate.setDate(cutoffDate.getDate() - (policy.retention.count * 7));
          break;
        case 'months':
          cutoffDate.setMonth(cutoffDate.getMonth() - policy.retention.count);
          break;
        case 'years':
          cutoffDate.setFullYear(cutoffDate.getFullYear() - policy.retention.count);
          break;
      }

      // 🏗️ Delete old backup records
      const oldBackups = await this.prisma.backupRecord.findMany({
        where: {
          type: type.toUpperCase(),
          completedAt: { lt: cutoffDate }
        }
      });

      for (const backup of oldBackups) {
        await this._deleteBackupFiles(backup);
        await this.prisma.backupRecord.delete({ where: { id: backup.id } });
      }

      this.emit('cleanup.completed', {
        type,
        deletedCount: oldBackups.length,
        cutoffDate,
        timestamp: new Date().toISOString()
      });
    }
  }

  /**
   * 🏗️ Delete Physical Backup Files
   * @private
   */
  async _deleteBackupFiles(backupRecord) {
    for (const location of backupRecord.storageLocations) {
      try {
        if (location.startsWith('s3://') && this.s3) {
          const key = location.replace(`s3://${this.config.storage.s3.bucket}/`, '');
          await this.s3.deleteObject({
            Bucket: this.config.storage.s3.bucket,
            Key: key
          }).promise();
        } else {
          await fs.unlink(location);
        }
      } catch (error) {
        console.warn(`Failed to delete backup file: ${location}`, error.message);
      }
    }
  }

  /**
   * 🏗️ Process Next Backup in Queue
   * @private
   */
  _processNextInQueue() {
    if (this.backupQueue.length > 0 && 
        this.activeBackups.size < this.config.performance.maxConcurrentBackups) {
      const nextBackup = this.backupQueue.shift();
      this.createBackup(nextBackup.type, nextBackup.options)
        .catch(error => {
          console.error('Failed to process queued backup:', error);
        });
    }
  }

  /**
   * 🏗️ Update Performance Metrics
   * @private
   */
  _updateMetrics({ type, size, duration, success }) {
    this.metrics.totalBackups++;
    
    if (success) {
      this.metrics.successfulBackups++;
      this.metrics.totalDataBackedUp += size;
      this.metrics.averageBackupTime = 
        (this.metrics.averageBackupTime * (this.metrics.successfulBackups - 1) + duration) / 
        this.metrics.successfulBackups;
    } else {
      this.metrics.failedBackups++;
    }

    this.metrics.lastBackupTime = new Date().toISOString();
  }

  /**
   * 🏗️ Start Metrics Collection
   * @private
   */
  _startMetricsCollection() {
    setInterval(async () => {
      try {
        // Calculate storage usage
        const localUsage = await this._calculateLocalStorageUsage();
        const s3Usage = await this._calculateS3StorageUsage();
        
        this.metrics.storageUsage = {
          local: localUsage,
          s3: s3Usage
        };

        this.emit('metrics.updated', this.metrics);
      } catch (error) {
        console.error('Failed to update metrics:', error);
      }
    }, this.config.monitoring.metricsInterval);
  }

  /**
   * 🏗️ Calculate Local Storage Usage
   * @private
   */
  async _calculateLocalStorageUsage() {
    try {
      const { stdout } = await execAsync(`du -sb ${this.config.storage.local.path} | cut -f1`);
      return parseInt(stdout.trim());
    } catch {
      return 0;
    }
  }

  /**
   * 🏗️ Calculate S3 Storage Usage
   * @private
   */
  async _calculateS3StorageUsage() {
    if (!this.s3) return 0;

    try {
      const objects = await this.s3.listObjectsV2({
        Bucket: this.config.storage.s3.bucket
      }).promise();

      return objects.Contents.reduce((total, obj) => total + (obj.Size || 0), 0);
    } catch {
      return 0;
    }
  }

  /**
   * 🏗️ Check if File Exists
   * @private
   */
  async _fileExists(filePath) {
    try {
      await fs.access(filePath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * 🏗️ Download from S3
   * @private
   */
  async _downloadFromS3(key, localPath) {
    const params = {
      Bucket: this.config.storage.s3.bucket,
      Key: key
    };

    const data = await this.s3.getObject(params).promise();
    await fs.writeFile(localPath, data.Body);
  }

  /**
   * 🏗️ Decrypt Backup File
   * @private
   */
  async _decryptBackup(filePath) {
    const decryptedPath = filePath.replace('.enc', '');
    const key = crypto.createHash('sha256').update(this.config.storage.encryption.key).digest();
    
    const decipher = crypto.createDecipher(this.config.storage.encryption.algorithm, key);
    const encrypted = await fs.readFile(filePath);
    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    
    await fs.writeFile(decryptedPath, decrypted);
    return decryptedPath;
  }

  /**
   * 🏗️ Decompress Backup File
   * @private
   */
  async _decompressBackup(filePath) {
    const decompressedPath = filePath.replace('.gz', '');
    await execAsync(`gunzip -c ${filePath} > ${decompressedPath}`);
    return decompressedPath;
  }

  /**
   * 🏗️ Get Storage Configuration
   * @private
   */
  _getStorageConfig() {
    return {
      local: this.config.storage.local.enabled,
      s3: this.config.storage.s3.enabled,
      encryption: this.config.storage.encryption.enabled,
      compression: this.config.performance.compression
    };
  }

  /**
   * 🎯 Get Backup Manager Status
   * @returns {Object} Manager status and metrics
   */
  getStatus() {
    return {
      status: 'operational',
      metrics: this.metrics,
      activeBackups: this.activeBackups.size,
      queuedBackups: this.backupQueue.length,
      storage: this._getStorageConfig(),
      timestamp: new Date().toISOString()
    };
  }

  /**
   * 🎯 Get Backup History
   * @param {Object} filters - Filter options
   * @returns {Promise<Array>} Backup history
   */
  async getBackupHistory(filters = {}) {
    const where = {};
    
    if (filters.type) where.type = filters.type;
    if (filters.status) where.status = filters.status;
    if (filters.startDate) where.completedAt = { gte: new Date(filters.startDate) };
    if (filters.endDate) where.completedAt = { lte: new Date(filters.endDate) };

    return await this.prisma.backupRecord.findMany({
      where,
      orderBy: { completedAt: 'desc' },
      take: filters.limit || 50
    });
  }

  /**
   * 🏗️ Graceful Shutdown
   */
  async shutdown() {
    try {
      this.emit('manager.shutdown.started');
      
      // Wait for active backups to complete
      while (this.activeBackups.size > 0) {
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
      
      // Close connections
      await this.redis.quit();
      await this.prisma.$disconnect();
      
      this.emit('manager.shutdown.completed');
    } catch (error) {
      this.emit('manager.shutdown.failed', { error: error.message });
      throw error;
    }
  }
}

// 🏗️ Enterprise Export Pattern
module.exports = {
  BackupManager,
  BACKUP_TYPES,
  BACKUP_STATUS,
  RETENTION_POLICIES
};

// 🏗️ Singleton Instance for Enterprise Use
let backupManagerInstance = null;

module.exports.getInstance = (config = {}) => {
  if (!backupManagerInstance) {
    backupManagerInstance = new BackupManager(config);
  }
  return backupManagerInstance;
};