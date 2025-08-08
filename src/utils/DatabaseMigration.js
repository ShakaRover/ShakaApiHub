/**
 * 数据库迁移工具
 * 负责将 site_check_logs 表从主数据库迁移到日志数据库
 */

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

class DatabaseMigration {
    constructor() {
        this.mainDbPath = path.join(__dirname, '../../shakaHub.db');
        this.logDbPath = path.join(__dirname, '../../log.db');
        this.mainDb = null;
        this.logDb = null;
    }

    /**
     * 连接数据库
     * @private
     */
    async connectDatabases() {
        return new Promise((resolve, reject) => {
            let connectionsComplete = 0;
            let hasError = false;

            this.mainDb = new sqlite3.Database(this.mainDbPath, (err) => {
                if (err && !hasError) {
                    hasError = true;
                    reject(new Error(`连接主数据库失败: ${err.message}`));
                    return;
                }
                connectionsComplete++;
                if (connectionsComplete === 2) {
                    resolve();
                }
            });

            this.logDb = new sqlite3.Database(this.logDbPath, (err) => {
                if (err && !hasError) {
                    hasError = true;
                    reject(new Error(`连接日志数据库失败: ${err.message}`));
                    return;
                }
                connectionsComplete++;
                if (connectionsComplete === 2) {
                    resolve();
                }
            });
        });
    }

    /**
     * 关闭数据库连接
     * @private
     */
    async closeDatabases() {
        return new Promise((resolve) => {
            let closedCount = 0;
            
            const checkComplete = () => {
                closedCount++;
                if (closedCount === 2) {
                    resolve();
                }
            };

            if (this.mainDb) {
                this.mainDb.close(checkComplete);
            } else {
                checkComplete();
            }

            if (this.logDb) {
                this.logDb.close(checkComplete);
            } else {
                checkComplete();
            }
        });
    }

    /**
     * 检查迁移是否需要执行
     * @returns {Promise<Object>} 迁移状态信息
     */
    async checkMigrationStatus() {
        try {
            await this.connectDatabases();

            const mainTableExists = await this.tableExists(this.mainDb, 'site_check_logs');
            const logTableExists = await this.tableExists(this.logDb, 'site_check_logs');
            const mainDataCount = mainTableExists ? await this.getRecordCount(this.mainDb, 'site_check_logs') : 0;
            const logDataCount = logTableExists ? await this.getRecordCount(this.logDb, 'site_check_logs') : 0;

            const status = {
                needsMigration: mainTableExists && mainDataCount > 0,
                mainTableExists,
                logTableExists,
                mainDataCount,
                logDataCount,
                canMigrate: mainTableExists && logTableExists
            };

            await this.closeDatabases();
            return status;
        } catch (error) {
            await this.closeDatabases();
            throw error;
        }
    }

    /**
     * 检查表是否存在
     * @private
     * @param {sqlite3.Database} db - 数据库实例
     * @param {string} tableName - 表名
     * @returns {Promise<boolean>} 表是否存在
     */
    async tableExists(db, tableName) {
        return new Promise((resolve, reject) => {
            const sql = "SELECT name FROM sqlite_master WHERE type='table' AND name=?";
            db.get(sql, [tableName], (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(!!row);
                }
            });
        });
    }

    /**
     * 获取表记录数量
     * @private
     * @param {sqlite3.Database} db - 数据库实例
     * @param {string} tableName - 表名
     * @returns {Promise<number>} 记录数量
     */
    async getRecordCount(db, tableName) {
        return new Promise((resolve, reject) => {
            const sql = `SELECT COUNT(*) as count FROM ${tableName}`;
            db.get(sql, (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row.count);
                }
            });
        });
    }

    /**
     * 确保日志数据库中的site_check_logs表结构正确
     * @private
     */
    async ensureLogTableStructure() {
        return new Promise((resolve, reject) => {
            // 删除已存在的表和索引
            const dropTableSql = "DROP TABLE IF EXISTS site_check_logs";
            const dropIndexSql = [
                "DROP INDEX IF EXISTS idx_site_check_logs_site_id",
                "DROP INDEX IF EXISTS idx_site_check_logs_created"
            ];

            // 创建新的表结构（去除外键约束）
            const createTableSql = `
                CREATE TABLE site_check_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    site_id INTEGER NOT NULL,
                    check_time DATETIME DEFAULT CURRENT_TIMESTAMP,
                    status TEXT NOT NULL CHECK (status IN ('success', 'error', 'timeout')),
                    message TEXT,
                    response_data TEXT,
                    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
                )
            `;

            const createIndexSql = [
                "CREATE INDEX idx_site_check_logs_site_id ON site_check_logs(site_id)",
                "CREATE INDEX idx_site_check_logs_created ON site_check_logs(created_at)",
                "CREATE INDEX idx_site_check_logs_check_time ON site_check_logs(check_time)"
            ];

            this.logDb.serialize(() => {
                // 删除旧表
                this.logDb.run(dropTableSql, (err) => {
                    if (err) {
                        reject(new Error(`删除旧表失败: ${err.message}`));
                        return;
                    }

                    // 删除旧索引
                    let indexCount = 0;
                    dropIndexSql.forEach(sql => {
                        this.logDb.run(sql, (err) => {
                            // 忽略索引不存在的错误
                            indexCount++;
                            if (indexCount === dropIndexSql.length) {
                                // 创建新表
                                this.logDb.run(createTableSql, (err) => {
                                    if (err) {
                                        reject(new Error(`创建新表失败: ${err.message}`));
                                        return;
                                    }

                                    // 创建索引
                                    let createCount = 0;
                                    createIndexSql.forEach(sql => {
                                        this.logDb.run(sql, (err) => {
                                            if (err) {
                                                reject(new Error(`创建索引失败: ${err.message}`));
                                                return;
                                            }
                                            createCount++;
                                            if (createCount === createIndexSql.length) {
                                                resolve();
                                            }
                                        });
                                    });
                                });
                            }
                        });
                    });
                });
            });
        });
    }

    /**
     * 执行迁移
     * @param {Object} options - 迁移选项
     * @param {boolean} options.keepOriginal - 是否保留原始数据（默认false）
     * @param {boolean} options.force - 是否强制迁移（默认false）
     * @returns {Promise<Object>} 迁移结果
     */
    async migrate(options = {}) {
        const { keepOriginal = false, force = false } = options;
        
        try {
            console.log('开始数据库迁移...');
            
            // 检查迁移状态
            const status = await this.checkMigrationStatus();
            console.log('迁移状态检查:', status);

            if (!status.needsMigration && !force) {
                return {
                    success: true,
                    message: '无需迁移，主数据库中没有数据或表不存在',
                    migrated: 0
                };
            }

            if (!status.canMigrate) {
                throw new Error('无法执行迁移：缺少必要的表结构');
            }

            await this.connectDatabases();

            // 确保日志数据库表结构正确
            console.log('确保日志数据库表结构正确...');
            await this.ensureLogTableStructure();

            // 开始事务迁移
            console.log('开始迁移数据...');
            const migratedCount = await this.transferData();

            if (!keepOriginal && migratedCount > 0) {
                console.log('清理主数据库中的原始数据...');
                await this.cleanupOriginalData();
            }

            await this.closeDatabases();

            console.log(`迁移完成: ${migratedCount} 条记录已迁移`);
            return {
                success: true,
                message: `迁移完成，共迁移 ${migratedCount} 条记录`,
                migrated: migratedCount,
                kept: keepOriginal
            };

        } catch (error) {
            await this.closeDatabases();
            console.error('迁移失败:', error.message);
            throw error;
        }
    }

    /**
     * 传输数据
     * @private
     * @returns {Promise<number>} 迁移的记录数
     */
    async transferData() {
        const self = this; // 保存this引用
        
        return new Promise((resolve, reject) => {
            // 从主数据库读取所有数据
            const selectSql = `
                SELECT id, site_id, check_time, status, message, response_data, created_at
                FROM site_check_logs
                ORDER BY created_at ASC
            `;

            self.mainDb.all(selectSql, (err, rows) => {
                if (err) {
                    reject(new Error(`读取数据失败: ${err.message}`));
                    return;
                }

                if (rows.length === 0) {
                    resolve(0);
                    return;
                }

                console.log(`准备迁移 ${rows.length} 条记录...`);

                // 批量插入到日志数据库
                const insertSql = `
                    INSERT INTO site_check_logs (site_id, check_time, status, message, response_data, created_at)
                    VALUES (?, ?, ?, ?, ?, ?)
                `;

                self.logDb.serialize(() => {
                    self.logDb.run("BEGIN TRANSACTION");

                    const stmt = self.logDb.prepare(insertSql);
                    let insertedCount = 0;
                    let hasError = false;

                    rows.forEach((row, index) => {
                        if (hasError) return;

                        stmt.run([
                            row.site_id,
                            row.check_time,
                            row.status,
                            row.message,
                            row.response_data,
                            row.created_at
                        ], function(err) {
                            if (err && !hasError) {
                                hasError = true;
                                self.logDb.run("ROLLBACK");
                                reject(new Error(`插入数据失败: ${err.message}`));
                                return;
                            }

                            insertedCount++;
                            if (insertedCount === rows.length) {
                                stmt.finalize((err) => {
                                    if (err) {
                                        self.logDb.run("ROLLBACK");
                                        reject(new Error(`完成插入失败: ${err.message}`));
                                        return;
                                    }

                                    self.logDb.run("COMMIT", (err) => {
                                        if (err) {
                                            reject(new Error(`提交事务失败: ${err.message}`));
                                        } else {
                                            resolve(insertedCount);
                                        }
                                    });
                                });
                            }
                        });
                    });
                });
            });
        });
    }

    /**
     * 清理主数据库中的原始数据
     * @private
     */
    async cleanupOriginalData() {
        return new Promise((resolve, reject) => {
            // 删除主数据库中的数据
            const deleteSql = "DELETE FROM site_check_logs";
            
            this.mainDb.run(deleteSql, function(err) {
                if (err) {
                    reject(new Error(`清理原始数据失败: ${err.message}`));
                } else {
                    console.log(`已清理主数据库中的 ${this.changes} 条记录`);
                    resolve(this.changes);
                }
            });
        });
    }

    /**
     * 验证迁移结果
     * @returns {Promise<Object>} 验证结果
     */
    async verifyMigration() {
        try {
            const status = await this.checkMigrationStatus();
            
            const isValid = status.logDataCount > 0 && 
                           (status.mainDataCount === 0 || status.mainDataCount === status.logDataCount);

            return {
                success: isValid,
                status,
                message: isValid ? '迁移验证通过' : '迁移验证失败'
            };
        } catch (error) {
            return {
                success: false,
                error: error.message,
                message: '验证过程中发生错误'
            };
        }
    }
}

module.exports = DatabaseMigration;