const mongoose = require('mongoose');
const dotenv = require('dotenv');
const bcrypt = require('bcrypt');
dotenv.config();

const { tenants } = require('./config/tenantConfig');

const TeacherSchema = new mongoose.Schema({
    userID: { type: String },
    password: { type: String },
    name: { type: String },
    surname: { type: String },
    email: { type: String },
}, { strict: false });

async function fixUnhashedPasswords() {
    try {
        // We found the data in 'schoolTest' from the previous run
        const adminURI = 'mongodb://localhost:27017/schoolTest';
        console.log(`Connecting to: ${adminURI}`);
        await mongoose.connect(adminURI);
        console.log("Connected.");

        const TeacherSchema = new mongoose.Schema({
            userID: { type: String },
            password: { type: String },
            name: { type: String },
            role: { type: String }, // Add role
        }, { strict: false });

        const TeacherModel = mongoose.model('teachers', TeacherSchema);
        const teachers = await TeacherModel.find({});

        console.log(`Found ${teachers.length} teachers. Checking roles...`);

        // Log roles of first 10
        teachers.slice(0, 10).forEach(t => {
            console.log(`User: ${t.userID} | Role: ${t.role} | Name: ${t.name}`);
        });
        await mongoose.disconnect();

    } catch (error) {
        console.error("Global Error:", error);
    }
}

async function debugDatabases() {
    try {
        // Connect to admin/default to list databases
        const adminURI = 'mongodb://localhost:27017/admin';
        console.log(`Connecting to admin DB: ${adminURI}`);
        const conn = await mongoose.createConnection(adminURI).asPromise();

        // List Databases
        const admin = conn.db.admin();
        const listDatabasesResult = await admin.listDatabases();
        console.log("\n--- Available Databases on Localhost ---");
        listDatabasesResult.databases.forEach(db => console.log(` - ${db.name} (${db.sizeOnDisk} bytes)`));
        await conn.close();

        // Now check tenants again with ENV loaded
        console.log("\n--- Checking Configured Tenants (with ENV) ---");
        for (const [tenantId, config] of Object.entries(tenants)) {
            if (!config.dbUri) continue;

            console.log(`\nTenant: ${tenantId}`);
            console.log(`URI: ${config.dbUri}`);

            try {
                const tenantConn = await mongoose.createConnection(config.dbUri).asPromise();
                const TeacherModel = tenantConn.model('teachers', TeacherSchema);
                const count = await TeacherModel.countDocuments();
                console.log(`Teachers Found: ${count}`);

                if (count > 0) {
                    const teachers = await TeacherModel.find({}).limit(5);
                    teachers.forEach(t => {
                        console.log(`   > ${t.userID} | ${t.name} ${t.surname} | Pass: ${t.password?.substring(0, 10)}...`);
                    });
                }
                await tenantConn.close();
            } catch (err) {
                console.error(`   Error: ${err.message}`);
            }
        }

    } catch (error) {
        console.error("Global Error:", error);
    }
}

fixUnhashedPasswords();
