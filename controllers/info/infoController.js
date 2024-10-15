const db = require('../../config/db');
const { getDbConnectionCount, getCpuUsage, getMemoryUsage, getSystemInfo, monitorConnectionPool, monitorDatabaseLocks } = require('../../config/info');

class InfoController {
    async dbConnectionsCount(req, res) {
        try {
            const dbConnectionCount = getDbConnectionCount();
            const cpuUsage = getCpuUsage()
            const memoryUsage = getMemoryUsage()
            const systemInfo = getSystemInfo()
            const connectionPool = monitorConnectionPool()
            const databaseLocks = await monitorDatabaseLocks()

            const result = {
                dbConnectionCount,
                cpuUsage,
                memoryUsage,
                systemInfo,
                connectionPool,
                databaseLocks
            }

            return res.status(200).json(result);
        } catch (e) {
            console.log(e)
        }
    }
}

module.exports = InfoController;