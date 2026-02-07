/**
 * TENANT CONFIGURATION
 * 
 * This file manages tenant (school) configurations for multi-tenancy.
 * Each tenant represents a separate school with its own database.
 * 
 * IMPORTANT: In production, this should be stored in a centralized database
 * or configuration management system, not in a file.
 */

const tenants = {
    // Example tenant 1: Main School
    'main-school': {
        name: 'Main School',
        dbUri: process.env.MAIN_SCHOOL_DB || 'mongodb://localhost:27017/main_school_erp',
        isActive: true,
        createdAt: new Date('2024-01-01'),
        settings: {
            maxStudents: 5000,
            maxTeachers: 500,
            features: ['sba', 'attendance', 'fees', 'store', 'canteen']
        }
    },

    // Example tenant 2: Secondary School
    'secondary-school': {
        name: 'Secondary School',
        dbUri: process.env.SECONDARY_SCHOOL_DB || 'mongodb://localhost:27017/secondary_school_erp',
        isActive: true,
        createdAt: new Date('2024-02-01'),
        settings: {
            maxStudents: 3000,
            maxTeachers: 300,
            features: ['sba', 'attendance', 'fees']
        }
    },

    // Example tenant 3: Demo School (for testing)
    'demo-school': {
        name: 'Demo School',
        dbUri: process.env.DEMO_SCHOOL_DB || 'mongodb://localhost:27017/demo_school_erp',
        isActive: true,
        createdAt: new Date('2024-03-01'),
        settings: {
            maxStudents: 1000,
            maxTeachers: 100,
            features: ['attendance', 'fees']
        }
    },

    // Default tenant (for backward compatibility)
    'default': {
        name: 'Default School',
        dbUri: process.env.LOCAL_DB_CONNECT || 'mongodb://localhost:27017/school_erp',
        isActive: true,
        createdAt: new Date('2023-01-01'),
        settings: {
            maxStudents: 10000,
            maxTeachers: 1000,
            features: ['sba', 'attendance', 'fees', 'store', 'canteen', 'banking']
        }
    }
};

/**
 * Get tenant configuration by tenant ID
 * @param {string} tenantId - The unique identifier for the tenant
 * @returns {object|null} Tenant configuration or null if not found
 */
const getTenantConfig = (tenantId) => {
    if (!tenantId) {
        console.warn('No tenant ID provided, using default tenant');
        return tenants['default'];
    }

    const tenant = tenants[tenantId.toLowerCase()];

    if (!tenant) {
        console.error(`Tenant '${tenantId}' not found`);
        return null;
    }

    if (!tenant.isActive) {
        console.error(`Tenant '${tenantId}' is not active`);
        return null;
    }

    return tenant;
};

/**
 * Get all active tenants
 * @returns {object} Object containing all active tenants
 */
const getAllActiveTenants = () => {
    return Object.entries(tenants)
        .filter(([_, config]) => config.isActive)
        .reduce((acc, [id, config]) => {
            acc[id] = config;
            return acc;
        }, {});
};

/**
 * Check if a tenant exists and is active
 * @param {string} tenantId - The unique identifier for the tenant
 * @returns {boolean} True if tenant exists and is active
 */
const isTenantActive = (tenantId) => {
    const tenant = tenants[tenantId?.toLowerCase()];
    return tenant && tenant.isActive === true;
};

/**
 * Add a new tenant (useful for dynamic tenant creation)
 * @param {string} tenantId - The unique identifier for the tenant
 * @param {object} config - Tenant configuration
 * @returns {boolean} True if tenant was added successfully
 */
const addTenant = (tenantId, config) => {
    if (!tenantId || !config || !config.dbUri) {
        console.error('Invalid tenant configuration');
        return false;
    }

    if (tenants[tenantId.toLowerCase()]) {
        console.error(`Tenant '${tenantId}' already exists`);
        return false;
    }

    tenants[tenantId.toLowerCase()] = {
        name: config.name || tenantId,
        dbUri: config.dbUri,
        isActive: config.isActive !== undefined ? config.isActive : true,
        createdAt: new Date(),
        settings: config.settings || {
            maxStudents: 5000,
            maxTeachers: 500,
            features: ['sba', 'attendance', 'fees']
        }
    };

    return true;
};

module.exports = {
    getTenantConfig,
    getAllActiveTenants,
    isTenantActive,
    addTenant,
    tenants
};
