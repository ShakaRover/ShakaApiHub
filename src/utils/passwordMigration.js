const bcrypt = require('bcrypt');
const PasswordUtils = require('./passwordUtils');

/**
 * 密码迁移工具 - 用于从 bcrypt 迁移到 crypto
 * 注意：这个文件需要 bcrypt 依赖，仅用于迁移现有数据
 */
class PasswordMigration {
    /**
     * 检查密码是否为 bcrypt 格式
     * @param {string} hash - 密码哈希
     * @returns {boolean} 是否为 bcrypt 格式
     */
    static isBcryptHash(hash) {
        // bcrypt 哈希通常以 $2a$, $2b$, $2x$, $2y$ 开头
        return /^\$2[abxy]\$/.test(hash);
    }

    /**
     * 验证 bcrypt 密码并转换为新格式
     * @param {string} password - 原始密码
     * @param {string} bcryptHash - bcrypt 哈希
     * @returns {Promise<string|null>} 新的哈希格式，验证失败返回 null
     */
    static async migrateBcryptPassword(password, bcryptHash) {
        try {
            // 首先验证 bcrypt 密码是否正确
            const isValid = await bcrypt.compare(password, bcryptHash);
            if (!isValid) {
                return null;
            }

            // 生成新的哈希
            return await PasswordUtils.hashPassword(password);
        } catch (error) {
            console.error('迁移 bcrypt 密码失败:', error.message);
            return null;
        }
    }

    /**
     * 混合验证函数 - 支持 bcrypt 和新格式
     * @param {string} password - 要验证的密码
     * @param {string} hash - 存储的哈希
     * @returns {Promise<{isValid: boolean, needsMigration: boolean, newHash?: string}>}
     */
    static async verifyWithMigration(password, hash) {
        try {
            if (this.isBcryptHash(hash)) {
                // 验证 bcrypt 密码
                const isValid = await bcrypt.compare(password, hash);
                if (isValid) {
                    // 生成新的哈希用于迁移
                    const newHash = await PasswordUtils.hashPassword(password);
                    return {
                        isValid: true,
                        needsMigration: true,
                        newHash: newHash
                    };
                } else {
                    return {
                        isValid: false,
                        needsMigration: false
                    };
                }
            } else {
                // 使用新的验证方法
                const isValid = await PasswordUtils.verifyPassword(password, hash);
                return {
                    isValid: isValid,
                    needsMigration: false
                };
            }
        } catch (error) {
            console.error('密码验证失败:', error.message);
            return {
                isValid: false,
                needsMigration: false
            };
        }
    }
}

module.exports = PasswordMigration;