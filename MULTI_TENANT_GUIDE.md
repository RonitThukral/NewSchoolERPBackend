# 🏫 Multi-Tenant School ERP Backend - Complete Guide

## 📋 Table of Contents
1. [Overview](#overview)
2. [What is Multi-Tenancy?](#what-is-multi-tenancy)
3. [Architecture](#architecture)
4. [Setup Instructions](#setup-instructions)
5. [How to Use](#how-to-use)
6. [Migration Guide](#migration-guide)
7. [Testing](#testing)
8. [Troubleshooting](#troubleshooting)

---

## 🎯 Overview

Your School ERP backend has been transformed into a **MULTI-TENANT** system. This means:

- ✅ **One Backend** can serve **Multiple Schools**
- ✅ **Each School** has its own **Isolated Database**
- ✅ **Complete Data Separation** between schools
- ✅ **Shared Codebase** - easier maintenance
- ✅ **Frontend Compatible** - works with any frontend

### Before vs After

**BEFORE (Single Tenant):**
```
Frontend → Backend → Single Database → One School
```

**AFTER (Multi-Tenant):**
```
School A Frontend → Backend → School A Database
School B Frontend → Backend → School B Database  
School C Frontend → Backend → School C Database
```

---

## 🏗️ What is Multi-Tenancy?

Multi-tenancy is an architecture where a single instance of software serves multiple customers (tenants). Each tenant's data is isolated and invisible to other tenants.

### Real-World Example:
Think of an apartment building:
- **Building = Your Backend** (one building, shared infrastructure)
- **Apartments = Schools** (each has its own space)
- **Tenants = School Data** (completely private and isolated)

---

## 🔧 Architecture

### New Files Created:

1. **`config/tenantConfig.js`**
   - Manages tenant (school) configurations
   - Defines database URIs for each school
   - Controls tenant activation/deactivation

2. **`config/dbConnection.js`**
   - Handles dynamic database connections
   - Caches connections for performance
   - Manages connection lifecycle

3. **`middlewares/tenantMiddleware.js`**
   - Identifies which tenant is making the request
   - Validates tenant access
   - Supports multiple identification methods

4. **`middlewares/tenantModelHelper.js`**
   - Provides easy access to tenant-specific models
   - Simplifies controller code
   - Manages model registry

### How It Works:

```
1. Request arrives → Tenant Middleware identifies school
2. Request continues → Tenant Model Helper attaches getModel()
3. Controller executes → Uses req.getModel('students')
4. Connection Manager → Returns correct database connection
5. Operation completes → Response sent back
```

---

## ⚙️ Setup Instructions

### Step 1: Configure Your Tenants

Edit `config/tenantConfig.js` to add your schools:

```javascript
const tenants = {
  'school-a': {
    name: 'School A',
    dbUri: 'mongodb://localhost:27017/school_a_erp',
    isActive: true,
    settings: {
      maxStudents: 5000,
      maxTeachers: 500,
      features: ['sba', 'attendance', 'fees']
    }
  },
  'school-b': {
    name: 'School B',
    dbUri: 'mongodb://localhost:27017/school_b_erp',
    isActive: true,
    settings: {
      maxStudents: 3000,
      maxTeachers: 300,
      features: ['attendance', 'fees']
    }
  }
};
```

### Step 2: Set Environment Variables

Update your `.env` file:

```env
# Default/Main School Database
LOCAL_DB_CONNECT=mongodb://localhost:27017/default_school_erp

# Additional School Databases (optional - can be defined in tenantConfig.js)
MAIN_SCHOOL_DB=mongodb://localhost:27017/main_school_erp
SECONDARY_SCHOOL_DB=mongodb://localhost:27017/secondary_school_erp
DEMO_SCHOOL_DB=mongodb://localhost:27017/demo_school_erp

# Other settings
PORT=5000
NODE_ENV=development
JWT_SECRET=your_jwt_secret_here
```

### Step 3: Create Databases

Create a separate MongoDB database for each school:

```bash
# Connect to MongoDB
mongosh

# Create databases
use main_school_erp
db.createCollection("students")

use secondary_school_erp
db.createCollection("students")

use demo_school_erp
db.createCollection("students")
```

### Step 4: Start the Server

```bash
npm start
```

You should see:
```
============================================================
🚀 School ERP Backend Server Started
📡 Listening on port 5000
🌐 Environment: development
🏫 Multi-Tenant: ENABLED
============================================================

📝 How to specify tenant:
   1. Header: X-Tenant-ID: your-school-id
   2. Subdomain: your-school-id.yourdomain.com
   3. Query: ?tenant=your-school-id

✅ Server ready to accept requests
============================================================
```

---

## 🚀 How to Use

### Method 1: Using Headers (Recommended for APIs)

```javascript
// Frontend fetch example
fetch('http://localhost:5000/api/students', {
  headers: {
    'X-Tenant-ID': 'main-school',
    'Authorization': 'Bearer your_token_here'
  }
})
```

```bash
# cURL example
curl -H "X-Tenant-ID: main-school" http://localhost:5000/api/students
```

### Method 2: Using Subdomains

```
http://main-school.yourdomain.com/api/students
http://secondary-school.yourdomain.com/api/students
```

**Note:** Requires DNS/hosts configuration

### Method 3: Using Query Parameters

```
http://localhost:5000/api/students?tenant=main-school
http://localhost:5000/api/teachers?tenant=secondary-school
```

### Method 4: Using Request Body (POST/PUT)

```javascript
{
  "tenantId": "main-school",
  "name": "John Doe",
  "email": "john@example.com"
}
```

---

## 🔄 Migration Guide

### Converting Existing Controllers

#### BEFORE (Old Single-Tenant Code):
```javascript
const StudentModel = require('../models/StudentModel');
const ClassesModel = require('../models/ClassesModel');

exports.getAllStudents = async (req, res) => {
  try {
    const students = await StudentModel.find();
    res.json(students);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
```

#### AFTER (New Multi-Tenant Code):
```javascript
// No model imports needed!

exports.getAllStudents = async (req, res) => {
  try {
    // Get tenant-specific model
    const Student = await req.getModel('students');
    const students = await Student.find();
    res.json(students);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
```

### Model Name Mapping

| Old Import | New Usage |
|-----------|-----------|
| `StudentModel` | `req.getModel('students')` |
| `TeacherModel` | `req.getModel('teachers')` |
| `ClassesModel` | `req.getModel('classes')` |
| `CoursesModel` | `req.getModel('courses')` |
| `AttendanceModel` | `req.getModel('attendances')` |
| `FeesModel` | `req.getModel('fees')` |
| `TransactionsModel` | `req.getModel('transactions')` |
| `CampusModel` | `req.getModel('campus')` |
| `ScholarshipModel` | `req.getModel('scholarships')` |

See `controllers/EXAMPLE_tenantAwareController.js` for complete examples.

---

## 🧪 Testing

### Test with cURL

```bash
# Test default tenant
curl http://localhost:5000/api/students

# Test with header
curl -H "X-Tenant-ID: main-school" http://localhost:5000/api/students

# Test with query parameter
curl "http://localhost:5000/api/students?tenant=secondary-school"

# Test creation with tenant
curl -X POST http://localhost:5000/api/students \
  -H "Content-Type: application/json" \
  -H "X-Tenant-ID: main-school" \
  -d '{"name":"John","surname":"Doe","gender":"male"}'
```

### Test with Postman

1. **Set Headers:**
   - Key: `X-Tenant-ID`
   - Value: `main-school`

2. **Make Request:**
   - GET: `http://localhost:5000/api/students`

3. **Verify:**
   - Data should come from `main_school_erp` database

---

## 🐛 Troubleshooting

### Issue: "Tenant configuration not found"

**Cause:** Tenant ID doesn't exist in `tenantConfig.js`

**Solution:** Add the tenant to `config/tenantConfig.js`

### Issue: "Invalid or inactive tenant"

**Cause:** Tenant exists but `isActive: false`

**Solution:** Set `isActive: true` in tenant configuration

### Issue: "Cannot read property 'getModel' of undefined"

**Cause:** Tenant middleware not applied to route

**Solution:** The middleware is already applied globally to all `/api/*` routes. Ensure your route starts with `/api/`

### Issue: Database connection error

**Cause:** MongoDB not running or incorrect connection string

**Solution:** 
1. Start MongoDB: `mongod`
2. Verify connection string in `tenantConfig.js`

### Issue: Models not found

**Cause:** Model not registered in `tenantModelHelper.js`

**Solution:** Add your model to the `modelRegistry` in `middlewares/tenantModelHelper.js`

---

## 🎓 Best Practices

### 1. Always Use Headers for API Clients
```javascript
// Good
fetch('/api/students', {
  headers: { 'X-Tenant-ID': 'school-a' }
})

// Avoid for production
fetch('/api/students?tenant=school-a')  // Visible in logs, less secure
```

### 2. Validate Tenant Before Operations
The middleware handles this automatically, but for custom validation:
```javascript
if (!req.tenantId) {
  return res.status(400).json({ error: 'Tenant required' });
}
```

### 3. Use Environment Variables for Prod
```javascript
// config/tenantConfig.js
'school-a': {
  dbUri: process.env.SCHOOL_A_DB || 'fallback-connection-string'
}
```

### 4. Monitor Connections
```javascript
const { getConnectionStatus } = require('./config/dbConnection');

app.get('/api/health/connections', (req, res) => {
  res.json(getConnectionStatus());
});
```

---

## 🔐 Security Considerations

1. **Tenant Isolation:** Each tenant's data is completely isolated
2. **Access Control:** Users can only access their tenant's data
3. **Validation:** All tenant IDs are validated before processing
4. **Connection Security:** Each connection uses separate credentials if needed

---

## 📊 Performance Tips

1. **Connection Pooling:** Automatically managed (10 connections per tenant)
2. **Connection Caching:** Connections are reused across requests
3. **Lazy Loading:** Databases connect only when first accessed
4. **Graceful Shutdown:** All connections close cleanly on server stop

---

## 🚀 Next Steps

1. **Update All Controllers:** Convert remaining controllers to use `req.getModel()`
2. **Add New Tenants:** Add schools in `tenantConfig.js`
3. **Configure Frontend:** Update frontend to send `X-Tenant-ID` header
4. **Test Thoroughly:** Test each tenant independently
5. **Deploy:** Deploy with proper environment variables

---

## 📞 Support

For issues or questions:
1. Check `controllers/EXAMPLE_tenantAwareController.js` for examples
2. Review this documentation
3. Check server logs for detailed error messages

---

## ✅ Success Checklist

- [ ] Multi-tenant files created and configured
- [ ] Tenant configurations added
- [ ] Environment variables set
- [ ] MongoDB databases created
- [ ] Server starts without errors
- [ ] Can connect to different tenants
- [ ] Data is isolated between tenants
- [ ] Frontend sends correct tenant headers
- [ ] All CRUD operations work per tenant
- [ ] Tests pass for all tenants

---

**🎉 Congratulations! Your School ERP is now Multi-Tenant! 🎉**
