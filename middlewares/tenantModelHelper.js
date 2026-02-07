/**
 * TENANT MODEL HELPER
 * 
 * This utility provides helper functions to easily work with tenant-aware models.
 * It simplifies the process of getting the correct model for the current tenant.
 */

const { getTenantModel } = require('../config/dbConnection');

// Import all model schemas (we'll need the schemas, not the models)
const StudentModel = require('../models/StudentModel');
const TeacherModel = require('../models/TeacherModel');
const SchoolModel = require('../models/SchoolModel');
const ClassesModel = require('../models/ClassesModel');
const CoursesModel = require('../models/CoursesModel');
const AttendanceModel = require('../models/AttendenceModel');
const FeesModel = require('../models/FeesModel');
const TransactionsModel = require('../models/TransactionsModel');
const CampusModel = require('../models/CampusesModel');
const ScholarshipModel = require('../models/ScholarshipsModel');
const SBAModel = require('../models/SBAModel');
const NotificationModel = require('../models/NotificationMessageModel');
const DeductionsModel = require('../models/DeductionsModel');
const BankingModel = require('../models/BankingModel');
const StoreItemsModel = require('../models/StoreItemsModel');
const StoreSalesModel = require('../models/StoreSalesModel');
const NonTeacherModel = require('../models/NonTeacherModel');
const PrefectsModel = require('../models/PrefectsModel');
const ActivityLogsModel = require('../models/ActivityLogs');
const FilesModel = require('../models/FilesModel');
const ChatModel = require('../models/ChatModel');
const SSNITModel = require('../models/SSNITModel');
const PayRowModel = require('../models/PayRow.Model');
const SchoolProfileModel = require('../models/SchoolProfileModel');
const HomeWorkModel = require('../models/HomeWorkModel');
const LeaveApplicationModel = require('../models/LeaveApplicationModel');
const QuizModel = require('../models/QuizModel');
const BadgeModel = require('../models/BadgeModel');
const ImageModel = require('../models/ImageModel');

/**
 * Model registry mapping model names to their schemas
 * This allows us to dynamically get the correct schema for any model
 */
const modelRegistry = {
    'students': StudentModel.schema,
    'teachers': TeacherModel.schema,
    'school': SchoolModel.schema,
    'classes': ClassesModel.schema,
    'courses': CoursesModel.schema,
    'attendance': AttendanceModel.schema,
    'fees': FeesModel.schema,
    'transactions': TransactionsModel.schema,
    'campus': CampusModel.schema,
    'scholarships': ScholarshipModel.schema,
    'sba': SBAModel.schema,
    'notificationmessages': NotificationModel.schema,
    'deductions': DeductionsModel.schema,
    'banking': BankingModel.schema,
    'storeitems': StoreItemsModel.schema,
    'storesales': StoreSalesModel.schema,
    'nonteachers': NonTeacherModel.schema,
    'prefects': PrefectsModel.schema,
    'activitylogs': ActivityLogsModel.schema,
    'files': FilesModel.schema,
    'chats': ChatModel.schema,
    'ssnit': SSNITModel.schema,
    'payroll': PayRowModel.schema,
    'schoolprofiles': SchoolProfileModel.schema,
    'homeworks': HomeWorkModel.schema,
    'leaveapplications': LeaveApplicationModel.schema,
    'quizzes': QuizModel.schema,
    'badges': BadgeModel.schema,
    'images': ImageModel.schema,
};

/**
 * Get a tenant-specific model
 * This is the main function controllers should use
 * 
 * @param {string} tenantId - The tenant identifier
 * @param {string} modelName - Name of the model (e.g., 'students', 'teachers')
 * @returns {Promise<mongoose.Model>} The tenant-specific model
 * 
 * @example
 * const Student = await getModel(req.tenantId, 'students');
 * const students = await Student.find({ enrollmentStatus: 'active' });
 */
const getModel = async (tenantId, modelName) => {
    // We need to ensure the requested model exists
    const schema = modelRegistry[modelName.toLowerCase()];
    if (!schema) {
        throw new Error(`Model schema not found for: ${modelName}. Please register it in modelRegistry.`);
    }

    // Get the connection
    // Note: We need to require getTenantConnection here or assume it's imported (it is imported at top)
    // The previous code called `getTenantModel` which calls `getTenantConnection`.
    // We will bypass `getTenantModel` (or modify `getTenantModel`)?
    // Actually, `getTenantModel` (which is imported from dbConnection) is a bit limited as it handles one model.
    // We should probably MODIFY `getTenantModel` logic HERE since we have the registry here.

    // Let's get the connection directly. `getTenantModel` uses `getTenantConnection`. 
    // `dbConnection.js` exports `getTenantConnection`.
    // Wait, the file imports `getTenantModel`, not `getTenantConnection`.
    // I should check imports in tenantModelHelper.js.
    // Line 8: const { getTenantModel } = require('../config/dbConnection');

    // I cannot easily modify `getTenantModel` behavior from here without `getTenantConnection`.
    // BUT `getTenantModel` returns the MODEL.
    // If I use `getTenantModel`, it only registers ONE.

    // FIX: I will import `getTenantConnection` from dbConnection as well.
    // Then I will use it to register all models.

    // Wait, I can't change imports easily in `replace_file_content` if they are at top and I am editing middle...
    // Actually I can just edit `getTenantModel` in `dbConnection.js`?
    // NO, `dbConnection.js` doesn't have the schemas. `tenantModelHelper.js` has the schemas.

    // So `tenantModelHelper.js` is the right place. I need `getTenantConnection`.
    // I will modify the import line first, then `getModel`.

    // Step 1: Modify imports to include getTenantConnection
    // Step 2: Modify getModel to use getTenantConnection and register all.

    // Since I can only do one block... I will try to use the existing `getTenantModel` but loop it?
    // No, `getTenantModel` returns a model, I don't want to create 30 model instances in variables.
    // I just want to register them.

    // I will replace the whole file content or a large chunk to fix imports + function?
    // Or I can use `require('../config/dbConnection').getTenantConnection` inside the function?
    // That's standard JS.

    const { getTenantConnection } = require('../config/dbConnection');
    const connection = await getTenantConnection(tenantId);

    // Register ALL models on this connection to ensure populates work
    for (const [name, modelSchema] of Object.entries(modelRegistry)) {
        if (!connection.models[name]) {
            connection.model(name, modelSchema);
        }
    }

    return connection.models[modelName.toLowerCase()];
};

/**
 * Middleware to attach model getter to request object
 * This makes it easy to get tenant-aware models in controllers
 * 
 * Usage in routes:
 * router.get('/', identifyTenant, attachTenantModels, controller.getAll);
 * 
 * Usage in controller:
 * const Student = await req.getModel('students');
 * const students = await Student.find();
 */
const attachTenantModels = (req, res, next) => {
    // Attach a helper function to the request object
    req.getModel = async (modelName) => {
        if (!req.tenantId) {
            throw new Error('Tenant ID not found on request. Ensure tenantMiddleware is applied.');
        }
        return await getModel(req.tenantId, modelName);
    };

    next();
};

/**
 * Get multiple models at once for a tenant
 * Useful when a controller needs several models
 * 
 * @param {string} tenantId - The tenant identifier
 * @param {string[]} modelNames - Array of model names
 * @returns {Promise<Object>} Object with model names as keys and models as values
 * 
 * @example
 * const { students, classes, teachers } = await getModels(req.tenantId, ['students', 'classes', 'teachers']);
 */
const getModels = async (tenantId, modelNames) => {
    const models = {};

    await Promise.all(
        modelNames.map(async (name) => {
            models[name] = await getModel(tenantId, name);
        })
    );

    return models;
};

/**
 * Helper to check if a model is registered
 * @param {string} modelName - Name of the model
 * @returns {boolean} True if model is registered
 */
const isModelRegistered = (modelName) => {
    return modelRegistry.hasOwnProperty(modelName.toLowerCase());
};

/**
 * Get all registered model names
 * @returns {string[]} Array of registered model names
 */
const getRegisteredModels = () => {
    return Object.keys(modelRegistry);
};

module.exports = {
    getModel,
    getModels,
    attachTenantModels,
    isModelRegistered,
    getRegisteredModels,
    modelRegistry
};
