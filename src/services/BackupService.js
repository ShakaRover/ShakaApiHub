const fs = require('fs').promises;
const path = require('path');
const ApiSiteService = require('./ApiSiteService');

class BackupService {
    constructor() {
        this.apiSiteService = new ApiSiteService();
        this.backupDir = path.join(process.cwd(), 'backups');
        this.maxBackups = 30; // 保留最多30个备份文件
    }

    // 确保备份目录存在
    async ensureBackupDir() {
        try {
            await fs.access(this.backupDir);
        } catch (error) {
            // 目录不存在，创建它
            await fs.mkdir(this.backupDir, { recursive: true });
        }
    }

    // 执行备份
    async createBackup(userId = null, backupType = 'manual') {
        try {
            await this.ensureBackupDir();

            // 导出站点配置
            const exportResult = await this.apiSiteService.exportApiSites(userId);
            if (!exportResult.success) {
                return {
                    success: false,
                    message: '导出站点配置失败: ' + exportResult.message
                };
            }

            // 生成备份文件名
            const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
            const userSuffix = userId ? `_user_${userId}` : '_all';
            const fileName = `api_sites_backup_${timestamp}${userSuffix}.json`;
            const filePath = path.join(this.backupDir, fileName);

            // 添加备份元数据
            const backupData = {
                ...exportResult.data,
                metadata: {
                    ...exportResult.data.metadata,
                    backupType,
                    userId: userId || null,
                    backupFileName: fileName
                }
            };

            // 写入备份文件
            await fs.writeFile(filePath, JSON.stringify(backupData, null, 2), 'utf8');

            // 清理旧备份文件
            await this.cleanupOldBackups(userId);

            return {
                success: true,
                data: {
                    fileName,
                    filePath,
                    sitesCount: backupData.sites.length,
                    fileSize: (await fs.stat(filePath)).size
                },
                message: `备份创建成功，包含${backupData.sites.length}个站点配置`
            };
        } catch (error) {
            console.error('BackupService.createBackup:', error.message);
            return {
                success: false,
                message: error.message || '创建备份失败'
            };
        }
    }

    // 获取备份文件列表
    async getBackupList(userId = null) {
        try {
            await this.ensureBackupDir();

            const files = await fs.readdir(this.backupDir);
            const backupFiles = files.filter(file => file.endsWith('.json'));

            const backups = [];
            for (const file of backupFiles) {
                try {
                    const filePath = path.join(this.backupDir, file);
                    const stats = await fs.stat(filePath);
                    const content = await fs.readFile(filePath, 'utf8');
                    const backupData = JSON.parse(content);

                    // 如果指定了用户ID，只返回该用户的备份
                    if (userId && backupData.metadata.userId !== parseInt(userId) && backupData.metadata.userId !== null) {
                        continue;
                    }

                    backups.push({
                        fileName: file,
                        fileSize: stats.size,
                        createdAt: stats.birthtime,
                        modifiedAt: stats.mtime,
                        exportTime: backupData.metadata.exportTime,
                        backupType: backupData.metadata.backupType || 'manual',
                        userId: backupData.metadata.userId,
                        sitesCount: backupData.metadata.totalSites || backupData.sites.length
                    });
                } catch (error) {
                    console.error(`读取备份文件失败 ${file}:`, error.message);
                }
            }

            // 按创建时间排序（最新的在前）
            backups.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

            return {
                success: true,
                data: backups,
                message: `找到${backups.length}个备份文件`
            };
        } catch (error) {
            console.error('BackupService.getBackupList:', error.message);
            return {
                success: false,
                message: error.message || '获取备份列表失败'
            };
        }
    }

    // 恢复备份
    async restoreFromBackup(fileName, userId, options = { skipExisting: false, overwrite: false }) {
        try {
            const filePath = path.join(this.backupDir, fileName);
            
            // 检查文件是否存在
            try {
                await fs.access(filePath);
            } catch (error) {
                return {
                    success: false,
                    message: '备份文件不存在'
                };
            }

            // 读取备份文件
            const content = await fs.readFile(filePath, 'utf8');
            const backupData = JSON.parse(content);

            // 导入站点配置
            const importResult = await this.apiSiteService.importApiSites(backupData, userId, options);
            
            return {
                success: importResult.success,
                data: importResult.data,
                message: importResult.message
            };
        } catch (error) {
            console.error('BackupService.restoreFromBackup:', error.message);
            return {
                success: false,
                message: error.message || '恢复备份失败'
            };
        }
    }

    // 删除备份文件
    async deleteBackup(fileName) {
        try {
            const filePath = path.join(this.backupDir, fileName);
            
            // 检查文件是否存在
            try {
                await fs.access(filePath);
            } catch (error) {
                return {
                    success: false,
                    message: '备份文件不存在'
                };
            }

            await fs.unlink(filePath);

            return {
                success: true,
                message: '备份文件删除成功'
            };
        } catch (error) {
            console.error('BackupService.deleteBackup:', error.message);
            return {
                success: false,
                message: error.message || '删除备份文件失败'
            };
        }
    }

    // 清理旧备份文件
    async cleanupOldBackups(userId = null) {
        try {
            const backupList = await this.getBackupList(userId);
            if (!backupList.success) {
                return;
            }

            const backups = backupList.data;
            if (backups.length <= this.maxBackups) {
                return; // 不需要清理
            }

            // 删除超过限制数量的旧备份
            const backupsToDelete = backups.slice(this.maxBackups);
            for (const backup of backupsToDelete) {
                try {
                    await this.deleteBackup(backup.fileName);
                    console.log(`已删除旧备份文件: ${backup.fileName}`);
                } catch (error) {
                    console.error(`删除旧备份文件失败 ${backup.fileName}:`, error.message);
                }
            }
        } catch (error) {
            console.error('BackupService.cleanupOldBackups:', error.message);
        }
    }

    // 自动备份（定时任务）
    async scheduleAutoBackup() {
        const BACKUP_INTERVAL = 24 * 60 * 60 * 1000; // 24小时

        const runBackup = async () => {
            try {
                console.log('开始执行自动备份...');
                const result = await this.createBackup(null, 'auto');
                if (result.success) {
                    console.log(`自动备份完成: ${result.message}`);
                } else {
                    console.error(`自动备份失败: ${result.message}`);
                }
            } catch (error) {
                console.error('自动备份执行失败:', error.message);
            }
        };

        // 立即执行一次备份
        await runBackup();

        // 设置定时任务
        setInterval(runBackup, BACKUP_INTERVAL);
        
        console.log('自动备份定时任务已启动，将每24小时执行一次');
    }

    // 验证备份文件
    async validateBackupFile(fileName) {
        try {
            const filePath = path.join(this.backupDir, fileName);
            const content = await fs.readFile(filePath, 'utf8');
            const backupData = JSON.parse(content);

            // 验证备份文件结构
            if (!backupData.metadata || !backupData.sites || !Array.isArray(backupData.sites)) {
                return {
                    valid: false,
                    message: '备份文件格式无效'
                };
            }

            // 验证每个站点配置
            let validSites = 0;
            let invalidSites = 0;
            for (const site of backupData.sites) {
                const validation = this.apiSiteService.validateApiSiteData(site);
                if (validation.isValid) {
                    validSites++;
                } else {
                    invalidSites++;
                }
            }

            return {
                valid: true,
                data: {
                    totalSites: backupData.sites.length,
                    validSites,
                    invalidSites,
                    metadata: backupData.metadata
                },
                message: `备份文件有效，包含${validSites}个有效站点配置`
            };
        } catch (error) {
            console.error('BackupService.validateBackupFile:', error.message);
            return {
                valid: false,
                message: error.message || '验证备份文件失败'
            };
        }
    }
}

module.exports = BackupService;