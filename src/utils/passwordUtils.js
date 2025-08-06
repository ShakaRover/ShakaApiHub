const crypto = require('crypto');

/**
 * 密码工具类 - 使用 Node.js 内置 crypto 模块替代 bcrypt
 * 提供更好的 Docker 兼容性，无需编译原生模块
 */
class PasswordUtils {
    /**
     * 生成随机盐值
     * @param {number} length - 盐值长度，默认16字节
     * @returns {string} 十六进制格式的盐值
     */
    static generateSalt(length = 16) {
        return crypto.randomBytes(length).toString('hex');
    }

    /**
     * 使用 PBKDF2 算法哈希密码
     * @param {string} password - 原始密码
     * @param {string} salt - 盐值（可选，不提供则自动生成）
     * @param {number} iterations - 迭代次数，默认100000
     * @param {number} keyLength - 密钥长度，默认64字节
     * @returns {Promise<string>} 格式化的哈希字符串 "salt:iterations:hash"
     */
    static async hashPassword(password, salt = null, iterations = 100000, keyLength = 64) {
        return new Promise((resolve, reject) => {
            // 如果没有提供盐值，生成一个新的
            if (!salt) {
                salt = this.generateSalt();
            }

            crypto.pbkdf2(password, salt, iterations, keyLength, 'sha512', (err, derivedKey) => {
                if (err) {
                    reject(err);
                    return;
                }

                // 格式: salt:iterations:hash
                const hash = derivedKey.toString('hex');
                const result = `${salt}:${iterations}:${hash}`;
                resolve(result);
            });
        });
    }

    /**
     * 同步版本的密码哈希（用于数据库初始化等场景）
     * @param {string} password - 原始密码
     * @param {string} salt - 盐值（可选）
     * @param {number} iterations - 迭代次数，默认100000
     * @param {number} keyLength - 密钥长度，默认64字节
     * @returns {string} 格式化的哈希字符串
     */
    static hashPasswordSync(password, salt = null, iterations = 100000, keyLength = 64) {
        // 如果没有提供盐值，生成一个新的
        if (!salt) {
            salt = this.generateSalt();
        }

        const hash = crypto.pbkdf2Sync(password, salt, iterations, keyLength, 'sha512').toString('hex');
        return `${salt}:${iterations}:${hash}`;
    }

    /**
     * 验证密码
     * @param {string} password - 要验证的密码
     * @param {string} hashedPassword - 存储的哈希密码
     * @returns {Promise<boolean>} 验证结果
     */
    static async verifyPassword(password, hashedPassword) {
        return new Promise((resolve, reject) => {
            try {
                // 解析存储的哈希格式: salt:iterations:hash
                const parts = hashedPassword.split(':');
                if (parts.length !== 3) {
                    // 兼容旧的 bcrypt 格式或其他格式
                    resolve(false);
                    return;
                }

                const [salt, iterations, storedHash] = parts;
                const iterationsNum = parseInt(iterations, 10);

                crypto.pbkdf2(password, salt, iterationsNum, 64, 'sha512', (err, derivedKey) => {
                    if (err) {
                        reject(err);
                        return;
                    }

                    const hash = derivedKey.toString('hex');
                    resolve(hash === storedHash);
                });
            } catch (error) {
                reject(error);
            }
        });
    }

    /**
     * 同步版本的密码验证
     * @param {string} password - 要验证的密码
     * @param {string} hashedPassword - 存储的哈希密码
     * @returns {boolean} 验证结果
     */
    static verifyPasswordSync(password, hashedPassword) {
        try {
            // 解析存储的哈希格式: salt:iterations:hash
            const parts = hashedPassword.split(':');
            if (parts.length !== 3) {
                return false;
            }

            const [salt, iterations, storedHash] = parts;
            const iterationsNum = parseInt(iterations, 10);

            const hash = crypto.pbkdf2Sync(password, salt, iterationsNum, 64, 'sha512').toString('hex');
            return hash === storedHash;
        } catch (error) {
            console.error('密码验证失败:', error.message);
            return false;
        }
    }

    /**
     * 检查密码是否需要重新哈希（例如安全参数升级）
     * @param {string} hashedPassword - 存储的哈希密码
     * @param {number} minIterations - 最小迭代次数
     * @returns {boolean} 是否需要重新哈希
     */
    static needsRehash(hashedPassword, minIterations = 100000) {
        try {
            const parts = hashedPassword.split(':');
            if (parts.length !== 3) {
                return true; // 格式不匹配，需要重新哈希
            }

            const iterations = parseInt(parts[1], 10);
            return iterations < minIterations;
        } catch (error) {
            return true;
        }
    }

    /**
     * 生成安全的随机密码
     * @param {number} length - 密码长度，默认12
     * @returns {string} 随机密码
     */
    static generateSecurePassword(length = 12) {
        const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789!@#$%^&*';
        let password = '';
        
        for (let i = 0; i < length; i++) {
            const randomIndex = crypto.randomInt(0, charset.length);
            password += charset[randomIndex];
        }
        
        return password;
    }
}

module.exports = PasswordUtils;