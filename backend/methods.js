import { MongoClient, ObjectId } from 'mongodb';
import dotenv from 'dotenv';
dotenv.config();

let client = null;
let db = null;

/**
 * Connect to MongoDB Database
 * @returns {Promise<void>}
 */
export async function connectDB() {
    try {
        if (db) return; // Idempotency check: Reuse existing connection

        if (!process.env.MONGO_URI) {
            throw new Error('MONGO_URI not found in environment variables');
        }

        // Connection pool: Default to 50 (SAfe for M0 tier with multiple instances/workers)
        // M0 Limit: 500 connections. 50 * 8 workers = 400 < 500.
        const maxPoolSize = parseInt(process.env.MONGO_MAX_POOL_SIZE, 10) || 50;
        const minPoolSize = parseInt(process.env.MONGO_MIN_POOL_SIZE, 10) || 0; // Allow scaling down to 0
        const waitQueueTimeoutMS = parseInt(process.env.MONGO_WAIT_QUEUE_TIMEOUT_MS, 10) || 10000; // Fail fast if queue is full

        client = new MongoClient(process.env.MONGO_URI, {
            maxPoolSize,
            minPoolSize,
            waitQueueTimeoutMS,
            connectTimeoutMS: 10000, // 10s connection timeout
            socketTimeoutMS: 45000,  // 45s socket timeout
        });

        await client.connect();

        if (!process.env.DB_NAME) {
            throw new Error('DB_NAME not found in environment variables');
        }
        db = client.db(process.env.DB_NAME);
        console.log(`MongoDB connected successfully to db ${process.env.DB_NAME} (Pool: ${maxPoolSize})`);
    } catch (error) {
        console.error('Database connection error:', error);
        // Retry logic could be added here, but usually let process crash and restart is safer
        throw error;
    }
}

/**
 * Get Database Instance
 * @returns {Object} MongoDB database instance
 */
export function getDB() {
    if (!db) {
        throw new Error('Database not connected. Call connectDB() first.');
    }
    return db;
}

/**
 * Convert ObjectId Fields - Converts string IDs to MongoDB ObjectId
 * @param {Object|Array} data - Data object or array of objects
 * @param {Array} objectIdFields - Array of field names that should be ObjectId (default: ['personId', '_id', 'userId'])
 * @returns {Object|Array} - Data with ObjectId fields converted
 */
export function objectId(data, objectIdFields = ['personId', '_id', 'userId']) {
    try {
        // Handle array of documents
        if (Array.isArray(data)) {
            return data.map(doc => objectId(doc, objectIdFields));
        }

        // Handle single document
        if (typeof data !== 'object' || data === null) {
            return data;
        }

        const converted = { ...data };

        // Convert each ObjectId field
        for (const field of objectIdFields) {
            if (converted[field] !== undefined && converted[field] !== null) {
                // If it's already an ObjectId, skip
                if (converted[field] instanceof ObjectId) {
                    continue;
                }

                // If it's a string, try to convert to ObjectId
                if (typeof converted[field] === 'string' && converted[field].trim() !== '') {
                    try {
                        // Check if it's a valid ObjectId string (24 hex characters)
                        if (/^[0-9a-fA-F]{24}$/.test(converted[field])) {
                            converted[field] = new ObjectId(converted[field]);
                        }
                    } catch (error) {
                        // If conversion fails, keep original value
                        console.warn(`Failed to convert ${field} to ObjectId:`, error.message);
                    }
                }
            }
        }

        return converted;
    } catch (error) {
        console.error('objectId error:', error);
        return data; // Return original data on error
    }
}

/**
 * Log Error to tblerrorlog Collection
 * @param {Object} errorInfo - Error information
 */
async function logError(errorInfo) {
    try {
        const errorLog = {
            route: errorInfo.route || '',
            frontend_page: errorInfo.frontend_page || '',
            backend_route: errorInfo.backend_route || '',
            payload: errorInfo.payload || {},
            filter: errorInfo.filter || {},
            error_message: errorInfo.error_message || '',
            error_code: errorInfo.error_code || '',
            timestamp: new Date(),
            ip_address: errorInfo.ip_address || ''
        };

        const database = getDB();
        await database.collection('tblerrorlog').insertOne(errorLog);
    } catch (logError) {
        console.error('Failed to log error:', logError);
    }
}

/**
 * Apply Schema - Apply schema defaults and validate data structure
 * @param {Object|Array} data - Data to process
 * @param {Object} schema - Schema definition with field types, defaults, required, enum
 * @param {boolean} isUpdate - Whether this is an update operation (skip required validation)
 * @returns {Object|Array} - Data with schema applied
 */
function applySchema(data, schema, isUpdate = false) {
    if (!schema) return data;

    const processDocument = (doc) => {
        if (typeof doc !== 'object' || doc === null) return doc;

        const processed = { ...doc };

        // Apply schema defaults and validation
        for (const [fieldName, fieldSchema] of Object.entries(schema)) {
            const fieldValue = processed[fieldName];

            // Skip if field already has value (unless it's undefined/null and we have default)
            if (fieldValue !== undefined && fieldValue !== null) {
                // Validate enum if specified
                if (fieldSchema.enum && !fieldSchema.enum.includes(fieldValue)) {
                    console.warn(`⚠️  Schema Warning: ${fieldName} value "${fieldValue}" not in enum [${fieldSchema.enum.join(', ')}]`);
                }
                continue;
            }

            // On UPDATE: do NOT apply defaults (prevents resetting existing fields)
            if (isUpdate) {
                continue;
            }

            // Apply default value if field is missing (INSERT only)
            if (fieldSchema.default !== undefined) {
                if (typeof fieldSchema.default === 'function') {
                    processed[fieldName] = fieldSchema.default();
                } else {
                    processed[fieldName] = fieldSchema.default;
                }
            }

            // Check required fields (only for insert, not update)
            if (!isUpdate && fieldSchema.required && processed[fieldName] === undefined) {
                console.warn(`⚠️  Schema Warning: Required field "${fieldName}" is missing`);
            }
        }

        return processed;
    };

    // Handle array or single document
    if (Array.isArray(data)) {
        return data.map(doc => processDocument(doc));
    }

    return processDocument(data);
}

/**
 * Execute Data - Insert, Update, Delete Operations
 * @param {string} collectionName - Name of the collection
 * @param {Object|Array} data - Data to insert/update (for update/delete, can contain filter in options)
 * @param {string} operation - 'i' (insert), 'u' (update), 'd' (delete)
 * @param {Object} filter - Optional filter for update/delete operations (can also be in options)
 * @param {Object} options - Additional options:
 *   - schema: Schema object for validation and defaults (recommended for better code readability)
 *   - objectIdFields: Array of field names to convert to ObjectId
 *   - filter: Alternative way to pass filter
 *   - many: Update/delete many documents
 *   - force: Force operation without filter
 *   - hardDelete: Hard delete instead of soft delete
 * @returns {Promise<Object>} - Operation result
 * 
 * @example
 * // ✅ RECOMMENDED: With schema (better readability, automatic defaults, validation)
 * import personMasterSchema from './schema/PersonMaster.js';
 * await executeData('tblPersonMaster', userData, 'i', personMasterSchema);
 * 
 * @example
 * // ✅ With schema + filter + custom ObjectId fields
 * await executeData('tblPersonMaster', userData, 'i', personMasterSchema, { _id: userId }, { 
 *     objectIdFields: ['personId', 'collegeId']  // Custom ObjectId fields
 * });
 * 
 * @example
 * // ✅ Update with schema (applies defaults, skips required validation)
 * await executeData('exams', updateData, 'u', examSchema, { _id: examId });
 * 
 * @example
 * // ⚠️ Without schema (still works for backward compatibility)
 * await executeData('tblPersonMaster', userData, 'i', null);
 */
export async function executeData(collectionName, data, operation, schema = null, filter = null, options = {}) {
    try {
        if (!collectionName) {
            throw new Error('collectionName is required');
        }

        if (!['i', 'u', 'd'].includes(operation.toLowerCase())) {
            throw new Error('operation must be "i" (insert), "u" (update), or "d" (delete)');
        }

        const database = getDB();
        const collection = database.collection(collectionName);

        const op = operation.toLowerCase();
        let result = null;

        // INSERT operation
        if (op === 'i') {
            if (!data) {
                throw new Error('data is required for insert operation');
            }

            // Apply schema (defaults, validation) if provided
            const schemaAppliedData = schema
                ? applySchema(data, schema, false)
                : data;

            // Convert ObjectId fields (personId, userId, etc.)
            const convertedData = objectId(schemaAppliedData, options.objectIdFields);

            // Add timestamps
            const timestamp = new Date().toISOString();
            if (Array.isArray(convertedData)) {
                const documents = convertedData.map(doc => ({
                    ...doc,
                    created_at: timestamp,
                    updated_at: timestamp
                }));
                result = await collection.insertMany(documents, options);
            } else {
                const document = {
                    ...convertedData,
                    created_at: timestamp,
                    updated_at: timestamp
                };
                result = await collection.insertOne(document, options);
            }

            return {
                success: true,
                data: result,
                insertedCount: result.insertedCount || (result.insertedId ? 1 : 0)
            };
        }

        // UPDATE operation
        if (op === 'u') {
            if (!data) {
                throw new Error('data is required for update operation');
            }

            // Get filter from options if not provided as parameter
            let updateFilter = filter || options.filter || {};

            if (Object.keys(updateFilter).length === 0 && !options.force) {
                throw new Error('filter is required for update operation (provide in options.filter or as 4th parameter)');
            }

            // Convert _id in filter to ObjectId if it's a string
            // If it's already an ObjectId, use it directly (don't recreate it)
            if (updateFilter._id) {
                if (typeof updateFilter._id === 'string') {
                    try {
                        if (/^[0-9a-fA-F]{24}$/.test(updateFilter._id)) {
                            updateFilter._id = new ObjectId(updateFilter._id);
                            console.log('executeData: Converted string _id to ObjectId:', updateFilter._id.toString());
                        }
                    } catch (error) {
                        console.warn('Failed to convert _id to ObjectId in filter:', error.message);
                    }
                } else if (updateFilter._id instanceof ObjectId) {
                    // Already ObjectId, use it directly - don't recreate it
                    console.log('executeData: _id is already ObjectId, using directly:', updateFilter._id.toString());
                } else {
                    console.warn('executeData: _id is neither string nor ObjectId:', typeof updateFilter._id, updateFilter._id);
                }
            }

            console.log('executeData: Final filter before MongoDB query:', {
                _id: updateFilter._id?.toString() || 'not provided',
                _idType: typeof updateFilter._id,
                _idIsObjectId: updateFilter._id instanceof ObjectId,
                filterKeys: Object.keys(updateFilter),
                filter: updateFilter._id ? { _id: updateFilter._id.toString() } : 'using custom filter (no _id)'
            });

            // Verify document exists before updating (for debugging)
            // Use the full filter if _id is not present
            const docExists = await collection.findOne(updateFilter._id ? { _id: updateFilter._id } : updateFilter);
            console.log('executeData: Document exists check:', {
                found: !!docExists,
                docId: docExists?._id?.toString() || 'N/A',
                docIdType: typeof docExists?._id,
                queryId: updateFilter._id?.toString() || 'N/A (using custom filter)',
                idsMatch: updateFilter._id ? (docExists?._id?.toString() === updateFilter._id?.toString()) : 'N/A (no _id in filter)',
                filterUsed: updateFilter._id ? 'by _id' : 'by custom filter'
            });

            // Check if data already contains MongoDB update operators ($push, $set, $unset, etc.)
            const hasUpdateOperators = data && typeof data === 'object' && Object.keys(data).some(key => key.startsWith('$'));

            let updateData;

            if (hasUpdateOperators) {
                // Data already contains MongoDB operators - don't apply schema to operators
                // Just merge updated_at into $set if it exists, otherwise create $set for updated_at
                if (data.$set) {
                    updateData = {
                        ...data,
                        $set: {
                            ...data.$set,
                            updated_at: new Date().toISOString()
                        }
                    };
                } else {
                    updateData = {
                        ...data,
                        $set: {
                            updated_at: new Date().toISOString()
                        }
                    };
                }
            } else {
                // No operators, wrap in $set and apply schema
                const schemaAppliedData = schema
                    ? applySchema(data, schema, true)
                    : data;

                updateData = {
                    $set: {
                        ...schemaAppliedData,
                        updated_at: new Date().toISOString()
                    }
                };
            }

            if (options.many) {
                result = await collection.updateMany(updateFilter, updateData, options);
                return {
                    success: true,
                    matchedCount: result.matchedCount,
                    modifiedCount: result.modifiedCount,
                    data: result
                };
            } else {
                // Use updateOne instead of findOneAndUpdate for more reliable results
                // First check if document exists
                const exists = await collection.findOne(updateFilter);
                if (!exists) {
                    console.log('executeData: Document not found with filter:', updateFilter);
                    return {
                        success: false,
                        message: 'No document found matching the filter',
                        data: null
                    };
                }

                // Perform the update
                const updateResult = await collection.updateOne(
                    updateFilter,
                    updateData,
                    options
                );

                console.log('executeData: updateOne result:', {
                    matchedCount: updateResult.matchedCount,
                    modifiedCount: updateResult.modifiedCount,
                    acknowledged: updateResult.acknowledged
                });

                if (updateResult.matchedCount === 0) {
                    return {
                        success: false,
                        message: 'No document found matching the filter',
                        data: null
                    };
                }

                // Fetch the updated document
                const updatedDoc = await collection.findOne(updateFilter);

                if (!updatedDoc) {
                    return {
                        success: false,
                        message: 'Document was updated but could not be retrieved',
                        data: null
                    };
                }

                return {
                    success: true,
                    data: updatedDoc
                };
            }
        }

        // DELETE operation
        if (op === 'd') {
            // Get filter from options if not provided as parameter
            let deleteFilter = filter || options.filter || {};

            if (Object.keys(deleteFilter).length === 0 && !options.force) {
                throw new Error('filter is required for delete operation (provide in options.filter or as 4th parameter, or use options.force = true)');
            }

            // Convert _id in filter to ObjectId if it's a string
            if (deleteFilter._id && typeof deleteFilter._id === 'string') {
                try {
                    if (/^[0-9a-fA-F]{24}$/.test(deleteFilter._id)) {
                        deleteFilter._id = new ObjectId(deleteFilter._id);
                    }
                } catch (error) {
                    console.warn('Failed to convert _id to ObjectId in filter:', error.message);
                }
            }

            if (options.hardDelete) {
                // Hard delete
                if (options.many) {
                    result = await collection.deleteMany(deleteFilter, options);
                    return {
                        success: true,
                        deletedCount: result.deletedCount
                    };
                } else {
                    result = await collection.findOneAndDelete(deleteFilter, options);
                    return {
                        success: true,
                        data: result.value
                    };
                }
            } else {
                // Soft delete
                const softDeleteData = {
                    $set: {
                        deleted: true,
                        deleted_at: new Date(),
                        ...(options.deletedBy && { deleted_by: options.deletedBy }),
                        ...(options.deletedReason && { deleted_reason: options.deletedReason })
                    }
                };

                if (options.many) {
                    result = await collection.updateMany(deleteFilter, softDeleteData, options);
                    return {
                        success: true,
                        modifiedCount: result.modifiedCount
                    };
                } else {
                    result = await collection.findOneAndUpdate(
                        deleteFilter,
                        softDeleteData,
                        { returnDocument: 'after', ...options }
                    );

                    // Check if document was found and deleted
                    if (!result || !result.value) {
                        return {
                            success: false,
                            message: 'No document found matching the filter',
                            data: null
                        };
                    }

                    return {
                        success: true,
                        data: result.value
                    };
                }
            }
        }
    } catch (error) {
        console.error('executeData error:', error);
        throw error;
    }
}

/**
 * Fetch Data - Query with Projection and Filter
 * @param {string} collectionName - Name of the collection
 * @param {Object} projection - Fields to include/exclude
 * @param {Object} filter - MongoDB filter/query
 * @param {Object} options - Query options (sort, limit, skip, etc.) - Can include { user: req.user } or { req: req } for role-based filtering
 * @returns {Promise<Object>} - Query results
 */
export async function fetchData(collectionName, projection = {}, filter = {}, options = {}) {
    try {
        if (!collectionName) {
            throw new Error('collectionName is required');
        }

        const database = getDB();
        const collection = database.collection(collectionName);

        // Apply role-based filter if user is provided in options or if req is provided
        let queryFilter = { ...filter };
        let userForFiltering = null;

        if (options.user) {
            // Direct user object provided
            userForFiltering = options.user;
        } else if (options.req && options.req.user) {
            // Request object provided, extract user from JWT (primary source)
            userForFiltering = options.req.user;

            // Check req.headers for role/user overrides (roles come from headers)
            if (options.req.headers) {
                const headerRole = options.req.headers['x-user-role'] || options.req.headers['user-role'] || options.req.headers['role'];
                const headerDepartment = options.req.headers['x-user-department'] || options.req.headers['user-department'] || options.req.headers['department'];
                const headerCollegeName = options.req.headers['x-college-name'] || options.req.headers['college-name'] || options.req.headers['college_name'];
                const headerCollegeId = options.req.headers['x-college-id'] || options.req.headers['college-id'] || options.req.headers['college_id'];
                const headerUserId = options.req.headers['x-user-id'] || options.req.headers['user-id'] || options.req.headers['userid'];

                // Override user info from req.headers if provided (for superadmin impersonation or special cases)
                if (headerRole || headerDepartment || headerCollegeName || headerCollegeId || headerUserId) {
                    userForFiltering = {
                        ...userForFiltering,
                        role: headerRole || userForFiltering.role,
                        department: headerDepartment || userForFiltering.department,
                        college_name: headerCollegeName || userForFiltering.college_name,
                        college_id: headerCollegeId || userForFiltering.college_id,
                        id: headerUserId || userForFiltering.id
                    };
                }
            }
        } else if (options.req && options.req.headers) {
            // Fallback: Check req.headers for user info if no JWT user exists
            const headerRole = options.req.headers['x-user-role'] || options.req.headers['user-role'] || options.req.headers['role'];
            const headerDepartment = options.req.headers['x-user-department'] || options.req.headers['user-department'] || options.req.headers['department'];
            const headerCollegeName = options.req.headers['x-college-name'] || options.req.headers['college-name'] || options.req.headers['college_name'];
            const headerCollegeId = options.req.headers['x-college-id'] || options.req.headers['college-id'] || options.req.headers['college_id'];
            const headerUserId = options.req.headers['x-user-id'] || options.req.headers['user-id'] || options.req.headers['userid'];

            if (headerRole) {
                userForFiltering = {
                    role: headerRole,
                    department: headerDepartment || null,
                    college_name: headerCollegeName || null,
                    college_id: headerCollegeId || null,
                    id: headerUserId || null
                };
            }
        }

        if (userForFiltering) {
            queryFilter = applyRoleBasedFilter(userForFiltering, queryFilter, collectionName);
            // Remove user/req from options to avoid passing it to MongoDB
            const { user, req, ...mongoOptions } = options;
            options = mongoOptions;
        }
        if (queryFilter._id && typeof queryFilter._id === 'string') {
            try {
                if (/^[0-9a-fA-F]{24}$/.test(queryFilter._id)) {
                    queryFilter._id = new ObjectId(queryFilter._id);
                }
            } catch (error) {
                console.warn('Failed to convert _id to ObjectId in filter:', error.message);
            }
        }

        // Handle student_id field - try both ObjectId and string formats
        // Only do this if there's no existing $or in the filter (to avoid conflicts)
        if (queryFilter.student_id && typeof queryFilter.student_id === 'string' && !queryFilter.$or && !queryFilter.$and) {
            try {
                if (/^[0-9a-fA-F]{24}$/.test(queryFilter.student_id)) {
                    // If it's a valid ObjectId string, try both formats
                    const studentIdString = queryFilter.student_id;
                    delete queryFilter.student_id;
                    queryFilter.$or = [
                        { student_id: new ObjectId(studentIdString) },
                        { student_id: studentIdString }
                    ];
                    console.log('[fetchData] Converted student_id to $or query:', queryFilter.$or);
                }
            } catch (error) {
                console.warn('Failed to convert student_id to ObjectId in filter:', error.message);
            }
        }

        // Build query
        let query = collection.find(queryFilter);

        // Apply projection
        if (projection && Object.keys(projection).length > 0) {
            query = query.project(projection);
        }

        // Apply options
        if (options.sort) {
            query = query.sort(options.sort);
        }
        if (options.limit) {
            query = query.limit(parseInt(options.limit));
        }
        if (options.skip) {
            query = query.skip(parseInt(options.skip));
        }

        // Execute query
        const data = await query.toArray();

        // Get count if requested
        let count = null;
        if (options.count) {
            count = await collection.countDocuments(filter);
        }

        return {
            success: true,
            data: data,
            count: count !== null ? count : data.length
        };
    } catch (error) {
        console.error('fetchData error:', error);
        throw error;
    }
}

/**
 * Apply Role-Based Data Filter
 * Automatically filters data based on user role:
 * - Student: Only their own data (filter by user ID)
 * - TPC: All data in their college (filter by college_name/college_id)
 * - DeptTPC: All data in their department (filter by department)
 * - Superadmin: No filtering (see all data)
 * 
 * @param {Object} user - User object from req.user (JWT decoded)
 * @param {Object} existingFilter - Existing filter from request
 * @param {string} collectionName - Collection name to determine filter field
 * @returns {Object} - Combined filter with role-based restrictions
 */
export function applyRoleBasedFilter(user, existingFilter = {}, collectionName = '') {
    try {
        if (!user || !user.role) {
            return existingFilter;
        }

        const userRole = user.role.toLowerCase();
        const roleFilter = {};

        // Superadmin: No filtering (can see all data)
        if (userRole === 'superadmin') {
            return existingFilter; // No additional filter
        }

        // Student: Only their own data (except for global collections like syllabus)
        if (userRole === 'student') {
            // Global collections that all students should see (no filtering)
            const globalCollections = ['tblSyllabus', 'tblRoles', 'roles'];
            if (globalCollections.includes(collectionName.toLowerCase())) {
                return existingFilter; // No filtering for global collections
            }

            // Filter by user ID - check common ID fields
            const userId = user.id || user.userId || user.person_id || user._id;
            if (userId) {
                // For PersonMaster collection, filter by _id or personId
                if (collectionName.toLowerCase().includes('person') || collectionName.toLowerCase() === 'tblpersonmaster') {
                    if (typeof userId === 'string' && /^[0-9a-fA-F]{24}$/.test(userId)) {
                        roleFilter.$or = [
                            { _id: new ObjectId(userId) },
                            { personId: new ObjectId(userId) }
                        ];
                    } else {
                        roleFilter.$or = [
                            { _id: userId },
                            { personId: userId }
                        ];
                    }
                } else {
                    // For other collections, filter by userId, personId, studentId, or student_id field
                    if (typeof userId === 'string' && /^[0-9a-fA-F]{24}$/.test(userId)) {
                        roleFilter.$or = [
                            { userId: new ObjectId(userId) },
                            { personId: new ObjectId(userId) },
                            { studentId: new ObjectId(userId) },
                            { student_id: new ObjectId(userId) }
                        ];
                    } else {
                        roleFilter.$or = [
                            { userId: userId },
                            { personId: userId },
                            { studentId: userId },
                            { student_id: userId }
                        ];
                    }
                }
            }
        }

        // TPC: All data in their college (no department filter, filter by college)
        if (userRole === 'tpc') {
            // Filter by college_name or college_id
            if (user.college_name) {
                roleFilter.college_name = user.college_name;
            } else if (user.college_id) {
                roleFilter.college_id = user.college_id;
            } else {
                // If TPC user doesn't have college info, they can't see any data
                roleFilter.college_name = null; // This will return no results
            }
        }

        // DeptTPC: All data in their department (filter by department)
        if (userRole === 'depttpc') {
            // Filter by department field (support both name/code and department_id)
            if (user.department || user.department_id) {
                const deptName = user.department || null;
                const deptId = user.department_id || null;

                // Prefer $or so we match legacy and new records
                roleFilter.$or = [
                    ...(deptId ? [{ department_id: deptId }, { department: deptId }] : []),
                    ...(deptName ? [{ department: deptName }, { department_id: deptName }] : [])
                ];
            } else {
                // If DeptTPC user doesn't have department in token, they can't see any data
                roleFilter.department = null; // This will return no results
            }
        }

        // Combine existing filter with role filter
        if (Object.keys(roleFilter).length > 0) {
            // If existing filter has $or, we need to merge carefully
            if (existingFilter.$or) {
                return {
                    ...existingFilter,
                    $and: [
                        { $or: existingFilter.$or },
                        roleFilter
                    ]
                };
            } else {
                return {
                    ...existingFilter,
                    ...roleFilter
                };
            }
        }

        return existingFilter;
    } catch (error) {
        console.error('applyRoleBasedFilter error:', error);
        return existingFilter; // Return original filter on error
    }
}

/**
 * Response Data Middleware
 * Handles all API responses and error logging
 */
export async function responsedata(req, res, next) {
    try {
        // If response was already sent, skip
        if (res.headersSent) {
            return;
        }

        // Get response data from res.locals (set by controllers)
        const responseData = res.locals.responseData;

        if (responseData && responseData.success) {
            // Success response
            const response = {
                success: true,
                message: responseData.message || 'Operation successful',
                data: responseData.data || null
            };

            res.status(responseData.status || 200).json(response);
        } else {
            // Error response
            const errorInfo = {
                route: req.originalUrl,
                frontend_page: req.headers.referer || '',
                backend_route: req.path,
                payload: req.body || {},
                filter: req.body?.filter || req.body?.query || {}, // Get filter from req.body instead of req.query
                error_message: responseData?.error || responseData?.message || 'Unknown error',
                error_code: responseData?.code || 'UNKNOWN_ERROR',
                ip_address: req.ip || req.connection.remoteAddress || req.socket.remoteAddress || ''
            };

            const errorResponse = {
                success: false,
                message: responseData?.message || 'Operation failed',
                error: responseData?.error || responseData?.message || 'Unknown error'
            };

            // Send response first
            res.status(responseData?.status || 500).json(errorResponse);

            // Log error asynchronously (after response sent)
            logError(errorInfo).catch(err => console.error('Error logging failed:', err));
        }
    } catch (error) {
        console.error('responsedata middleware error:', error);

        // Log this error too
        const errorInfo = {
            route: req.originalUrl,
            frontend_page: req.headers.referer || '',
            backend_route: req.path,
            payload: req.body || {},
            filter: req.body?.filter || req.body?.query || {}, // Get filter from req.body instead of req.query
            error_message: error.message,
            error_code: 'RESPONSE_MIDDLEWARE_ERROR',
            ip_address: req.ip || req.connection.remoteAddress || req.socket.remoteAddress || ''
        };

        if (!res.headersSent) {
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }

        // Log error asynchronously
        logError(errorInfo).catch(err => console.error('Error logging failed:', err));
    }
}
