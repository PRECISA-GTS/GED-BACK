const db = require('./db');
const os = require('os');
const getDbConnectionCount = () => {
    const pool = db; // Aqui `db` é a pool de conexões

    if (pool && pool._allConnections) {
        const openConnections = pool._allConnections.length;  // Total de conexões
        const freeConnections = pool._freeConnections.length;  // Conexões livres
        const busyConnections = openConnections - freeConnections;  // Conexões em uso

        return {
            openConnections,
            freeConnections,
            busyConnections
        };
    } else {
        console.error('Pool de conexões não encontrada.');
        return null;
    }
};

// Verifica a utilização da CPU
const getCpuUsage = () => {
    const cpus = os.cpus();
    const cpuUsage = cpus.map((cpu, index) => {
        const total = Object.values(cpu.times).reduce((acc, time) => acc + time, 0);
        const idle = cpu.times.idle;
        const usage = ((total - idle) / total) * 100;
        return {
            core: index + 1,
            usage: `${usage.toFixed(2)}%`
        };
    });
    return cpuUsage;
};

// Verifica a utilização da memória
const getMemoryUsage = () => {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    const usagePercent = (usedMemory / totalMemory) * 100;
    return {
        totalMemory: `${(totalMemory / 1024 / 1024 / 1024).toFixed(2)} GB`,
        usedMemory: `${(usedMemory / 1024 / 1024 / 1024).toFixed(2)} GB`,
        freeMemory: `${(freeMemory / 1024 / 1024 / 1024).toFixed(2)} GB`,
        usagePercent: `${usagePercent.toFixed(2)}%`
    };
};

const getSystemInfo = () => {
    return {
        hostname: os.hostname(),
        platform: os.platform(),
        arch: os.arch(),
        uptime: `${(os.uptime() / 3600).toFixed(2)} hours`,
        loadAverage: os.loadavg(), // Load average (1, 5, and 15 minutes)
    };
};

const responseTime = (req, res, next) => {
    const startHrTime = process.hrtime();

    res.on('finish', () => {
        const elapsedHrTime = process.hrtime(startHrTime);
        const elapsedTimeInMs = elapsedHrTime[0] * 1000 + elapsedHrTime[1] / 1e6;
        console.log(`Request to ${req.path} took ${elapsedTimeInMs}ms`);
    });

    next();
};

const monitorConnectionPool = () => {
    const poolStatus = {
        freeConnections: db._freeConnections.length,
        usedConnections: db._allConnections.length - db._freeConnections.length,
        queuedConnections: db._connectionQueue.length
    };

    console.log(`Pool status: Free: ${poolStatus.freeConnections}, Used: ${poolStatus.usedConnections}, Queued: ${poolStatus.queuedConnections}`);
    return poolStatus;
};

const monitorDatabaseLocks = async () => {
    try {
        const sql = 'SHOW ENGINE INNODB STATUS';
        const [results] = await db.promise().query(sql);
        return results[0]['Status'];
    } catch (error) {
        console.error('Erro ao monitorar locks do banco de dados:', error);
        return null;
    }
};




module.exports = { getDbConnectionCount, getCpuUsage, getMemoryUsage, getSystemInfo, responseTime, monitorConnectionPool, monitorDatabaseLocks };