/**
 * DATABASE CONNECTION MANAGER FOR MULTI-TENANCY
 * 
 * This module manages database connections for multiple tenants.
 * Each tenant (school) has its own isolated MongoDB database.
 * Connections are cached and reused for performance.
 */

const mongoose = require('mongoose');
const { getTenantConfig } = require('./tenantConfig');

// Cache to store active database connections
const connectionCache = new Map();

/**
 * Get or create a database connection for a specific tenant
 * @param {string} tenantId - The unique identifier for the tenant
 * @returns {Promise<mongoose.Connection>} Mongoose connection instance
 */
const getTenantConnection = async (tenantId) => {
    // Use default tenant if none specified (backward compatibility)
    const effectiveTenantId = tenantId || 'default';

    // Check if connection already exists in cache
    if (connectionCache.has(effectiveTenantId)) {
        const cachedConnection = connectionCache.get(effectiveTenantId);

        // Verify connection is still alive
        if (cachedConnection.readyState === 1) {
            return cachedConnection;
        } else {
            // Remove stale connection from cache
            connectionCache.delete(effectiveTenantId);
        }
    }

    // Get tenant configuration
    const tenantConfig = getTenantConfig(effectiveTenantId);

    if (!tenantConfig) {
        throw new Error(`Tenant configuration not found for: ${effectiveTenantId}`);
    }

    if (!tenantConfig.dbUri) {
        throw new Error(`Database URI not configured for tenant: ${effectiveTenantId}`);
    }

    try {
        // Create new connection
        console.log(`Creating new database connection for tenant: ${effectiveTenantId}`);

        const connection = await mongoose.createConnection(tenantConfig.dbUri, {
            // Connection options for better performance and reliability
            maxPoolSize: 10, // Maximum number of connections in the pool
            minPoolSize: 2,  // Minimum number of connections in the pool
            socketTimeoutMS: 45000, // Close sockets after 45 seconds of inactivity
            serverSelectionTimeoutMS: 10000, // Timeout for server selection
            family: 4 // Use IPv4, skip trying IPv6
        }).asPromise();

        // Set up connection event listeners
        connection.on('connected', () => {
            console.log(`✅ Tenant '${effectiveTenantId}' connected to database`);
        });

        connection.on('error', (err) => {
            console.error(`❌ Database connection error for tenant '${effectiveTenantId}':`, err);
            // Remove from cache on error
            connectionCache.delete(effectiveTenantId);
        });

        connection.on('disconnected', () => {
            console.warn(`⚠️  Tenant '${effectiveTenantId}' disconnected from database`);
            // Remove from cache when disconnected
            connectionCache.delete(effectiveTenantId);
        });

        // Cache the connection
        connectionCache.set(effectiveTenantId, connection);

        return connection;
    } catch (error) {
        console.error(`Failed to connect to database for tenant '${effectiveTenantId}':`, error);
        throw error;
    }
};

/**
 * Get a model for a specific tenant
 * This is the main function to use when you need to access tenant-specific data
 * 
 * @param {string} tenantId - The unique identifier for the tenant
 * @param {string} modelName - Name of the model (e.g., 'students', 'teachers')
 * @param {mongoose.Schema} schema - Mongoose schema for the model
 * @returns {Promise<mongoose.Model>} Mongoose model instance
 */
const getTenantModel = async (tenantId, modelName, schema) => {
    const connection = await getTenantConnection(tenantId);

    // Check if model already exists on this connection
    if (connection.models[modelName]) {
        return connection.models[modelName];
    }

    // Create and return new model
    return connection.model(modelName, schema);
};

/**
 * Close all tenant database connections
 * Useful for graceful shutdown
 */
const closeAllConnections = async () => {
    console.log('Closing all tenant database connections...');

    const closePromises = Array.from(connectionCache.entries()).map(async ([tenantId, connection]) => {
        try {
            await connection.close();
            console.log(`Closed connection for tenant: ${tenantId}`);
        } catch (error) {
            console.error(`Error closing connection for tenant ${tenantId}:`, error);
        }
    });

    await Promise.all(closePromises);
    connectionCache.clear();
    console.log('All database connections closed');
};

/**
 * Close connection for a specific tenant
 * @param {string} tenantId - The unique identifier for the tenant
 */
const closeTenantConnection = async (tenantId) => {
    if (connectionCache.has(tenantId)) {
        const connection = connectionCache.get(tenantId);
        await connection.close();
        connectionCache.delete(tenantId);
        console.log(`Connection closed for tenant: ${tenantId}`);
    }
};

/**
 * Get connection status for all tenants
 * Useful for monitoring and debugging
 * @returns {object} Status object with tenant connection information
 */
const getConnectionStatus = () => {
    const status = {};

    connectionCache.forEach((connection, tenantId) => {
        status[tenantId] = {
            readyState: connection.readyState,
            status: getReadyStateText(connection.readyState),
            host: connection.host,
            name: connection.name
        };
    });

    return status;
};

/**
 * Convert mongoose connection readyState number to text
 * @param {number} state - Mongoose connection readyState
 * @returns {string} Human-readable connection state
 */
const getReadyStateText = (state) => {
    const states = {
        0: 'disconnected',
        1: 'connected',
        2: 'connecting',
        3: 'disconnecting'
    };
    return states[state] || 'unknown';
};

// Graceful shutdown handlers
process.on('SIGINT', async () => {
    await closeAllConnections();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    await closeAllConnections();
    process.exit(0);
});

module.exports = {
    getTenantConnection,
    getTenantModel,
    closeAllConnections,
    closeTenantConnection,
    getConnectionStatus
};
