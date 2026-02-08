/**
 * TENANT IDENTIFICATION MIDDLEWARE
 * 
 * This middleware extracts the tenant ID from incoming requests and
 * attaches it to the request object for use throughout the application.
 * 
 * Supports multiple tenant identification strategies:
 * 1. Custom header (X-Tenant-ID)
 * 2. Subdomain (tenant.yourdomain.com)
 * 3. Query parameter (?tenant=tenant-id)
 * 4. Request body (for POST/PUT requests)
 */

const { isTenantActive } = require('../config/tenantConfig');

/**
 * Extract tenant ID from subdomain
 * Example: main-school.erp.com -> main-school
 * @param {string} hostname - Request hostname
 * @returns {string|null} Tenant ID or null
 */
const extractTenantFromSubdomain = (hostname) => {
    if (!hostname) return null;

    // Skip localhost and IP addresses
    if (hostname === 'localhost' || /^\d+\.\d+\.\d+\.\d+$/.test(hostname)) {
        return null;
    }

    const parts = hostname.split('.');

    // If there are more than 2 parts (e.g., tenant.domain.com), first part is tenant
    if (parts.length > 2) {
        return parts[0];
    }

    return null;
};

/**
 * Main tenant identification middleware
 */
const identifyTenant = (req, res, next) => {
    let tenantId = null;

    // Strategy 1: Check custom header (highest priority)
    if (req.headers['x-tenant-id']) {
        tenantId = req.headers['x-tenant-id'];
        console.log(`Tenant identified from header: ${tenantId}`);
    }

    // Strategy 2: Check subdomain
    if (!tenantId && req.hostname) {
        tenantId = extractTenantFromSubdomain(req.hostname);
        if (tenantId) {
            console.log(`Tenant identified from subdomain: ${tenantId}`);
        }
    }

    // Strategy 3: Check query parameter
    if (!tenantId && req.query.tenant) {
        tenantId = req.query.tenant;
        console.log(`Tenant identified from query: ${tenantId}`);
    }

    // Strategy 4: Check request body (for POST/PUT/PATCH)
    if (!tenantId && req.body && req.body.tenantId) {
        tenantId = req.body.tenantId;
        console.log(`Tenant identified from body: ${tenantId}`);
    }

    // Strategy 5: Check merchantTransactionId or txn for tenant prefix (e.g., Ttenantid_TXN...)
    if (!tenantId) {
        const txnId = req.query.txn || req.query.merchantTransactionId || (req.body && (req.body.txn || req.body.merchantTransactionId));
        if (txnId && typeof txnId === 'string' && txnId.startsWith('T')) {
            const match = txnId.match(/^T([^_]+)_/);
            if (match) {
                tenantId = match[1];
                console.log(`Tenant identified from transaction prefix: ${tenantId}`);
            }
        }
    }

    // If no tenant identified, use default
    if (!tenantId) {
        tenantId = 'default';
        console.log('No tenant specified, using default tenant');
    }

    // Validate tenant
    if (!isTenantActive(tenantId)) {
        return res.status(403).json({
            success: false,
            error: `Invalid or inactive tenant: ${tenantId}`,
            message: 'The specified school/tenant is not available or has been deactivated.'
        });
    }

    // Attach tenant ID to request object
    req.tenantId = tenantId.toLowerCase();

    next();
};

/**
 * Middleware to require tenant specification
 * Use this for routes that must have an explicit tenant
 */
const requireTenant = (req, res, next) => {
    if (!req.tenantId || req.tenantId === 'default') {
        return res.status(400).json({
            success: false,
            error: 'Tenant identification required',
            message: 'Please specify a tenant using X-Tenant-ID header, subdomain, or query parameter.'
        });
    }
    next();
};

/**
 * Middleware to validate tenant access for specific user
 * Ensures users can only access their own tenant's data
 */
const validateTenantAccess = (req, res, next) => {
    // If user is authenticated and has a tenantId in their profile
    if (req.user && req.user.tenantId) {
        // Super admins can access any tenant
        if (req.user.role === 'super-admin') {
            return next();
        }

        // Regular users must match tenant
        if (req.user.tenantId !== req.tenantId) {
            return res.status(403).json({
                success: false,
                error: 'Tenant access denied',
                message: 'You do not have permission to access this school\'s data.'
            });
        }
    }

    next();
};

module.exports = {
    identifyTenant,
    requireTenant,
    validateTenantAccess,
    extractTenantFromSubdomain
};
