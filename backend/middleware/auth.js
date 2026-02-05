import jwt from 'jsonwebtoken';
import { getDB, fetchData } from '../methods.js';

/**
 * JWT Authentication Middleware
 * Verifies JWT token from Authorization header
 */
export const auth = async (req, res, next) => {
    try {
        // Get token from Authorization header (Bearer token)
        const authHeader = req.headers.authorization;
        
        console.log('[Auth Middleware] Request:', {
            method: req.method,
            path: req.path,
            hasAuthHeader: !!authHeader,
            authHeaderPrefix: authHeader?.substring(0, 20) || 'none'
        });
        
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            console.log('[Auth Middleware] No valid auth header found');
            res.locals.responseData = {
                success: false,
                status: 401,
                message: 'Authentication required',
                error: 'No token provided'
            };
            return next();
        }

        const token = authHeader.substring(7); // Remove 'Bearer ' prefix

        if (!token) {
            console.log('[Auth Middleware] Token is empty after removing Bearer prefix');
            res.locals.responseData = {
                success: false,
                status: 401,
                message: 'Authentication required',
                error: 'No token provided'
            };
            return next();
        }
        
        console.log('[Auth Middleware] Token found, length:', token.length);

        try {
            // Verify token
            const secret = process.env.JWT_SECRET || 'your-secret-key';
            const decoded = jwt.verify(token, secret);
            
            console.log('[Auth Middleware] Token verified successfully:', {
                id: decoded.id,
                email: decoded.email,
                role: decoded.role
            });

            // If user belongs to a college (TPC, Dept TPC, Student), verify college still exists and is not deleted
            // So that when a college is deleted, these users get 401 on next request (automatic logout)
            const collegeIdFromToken = decoded.college_id;
            const roleFromToken = (decoded.role || '').toLowerCase();
            const isCollegeUser = ['tpc', 'depttpc', 'student'].includes(roleFromToken);
            if (collegeIdFromToken && isCollegeUser) {
                const { ObjectId } = await import('mongodb');
                const collegeFilter = typeof collegeIdFromToken === 'string' && /^[0-9a-fA-F]{24}$/.test(collegeIdFromToken)
                    ? { _id: new ObjectId(collegeIdFromToken), deleted: false }
                    : { _id: collegeIdFromToken, deleted: false };
                const collegeCheck = await fetchData('tblCollage', { _id: 1 }, collegeFilter, {});
                if (!collegeCheck.success || !collegeCheck.data || collegeCheck.data.length === 0) {
                    res.locals.responseData = {
                        success: false,
                        status: 401,
                        message: 'Your college account has been removed. Please contact administrator.',
                        error: 'College deleted'
                    };
                    return next();
                }
            }

            // Get role from JWT token (primary source of truth)
            let userRole = decoded.role;
            let userDepartment = decoded.department;
            let userCollegeName = decoded.college_name;
            let userCollegeId = decoded.college_id;
            
            // Check for role override in req.headers (ONLY allowed for superadmin impersonation)
            const headerRole = req.headers['x-user-role'] || req.headers['user-role'] || req.headers['role'];
            const headerDepartment = req.headers['x-user-department'] || req.headers['user-department'] || req.headers['department'];
            const headerCollegeName = req.headers['x-college-name'] || req.headers['college-name'] || req.headers['college_name'];
            const headerCollegeId = req.headers['x-college-id'] || req.headers['college-id'] || req.headers['college_id'];
            
            // SECURITY: Only allow role override if:
            // 1. Original user is superadmin (for impersonation feature)
            // 2. OR in development mode (for testing)
            const isSuperadmin = decoded.role && decoded.role.toLowerCase() === 'superadmin';
            const isDevelopment = process.env.NODE_ENV !== 'production';
            
            if (headerRole && (isSuperadmin || isDevelopment)) {
                // Superadmin can impersonate other roles via header
                userRole = headerRole;
                console.log(`[AUDIT] Role override: ${decoded.email} (${decoded.role}) → ${headerRole}`);
            }
            
            // Department can be supplemented from header (less sensitive)
            if (headerDepartment) {
                userDepartment = headerDepartment;
            }
            
            // College name/id can be supplemented from header
            if (headerCollegeName) {
                userCollegeName = headerCollegeName;
            }
            if (headerCollegeId) {
                userCollegeId = headerCollegeId;
            }

            // Attach user info to request
            req.user = {
                ...decoded,
                id: decoded.id || decoded.userId || decoded.person_id, // Ensure id is always set
                userId: decoded.id || decoded.userId || decoded.person_id,
                person_id: decoded.id || decoded.userId || decoded.person_id,
                role: userRole, // Use JWT role (or overridden by superadmin)
                department: userDepartment || decoded.department,
                department_id: decoded.department_id || null,
                college_name: userCollegeName || decoded.college_name,
                college_id: userCollegeId || decoded.college_id,
            };
            
            // Also set req.userId for backward compatibility
            req.userId = req.user.id;
            
            console.log('[Auth Middleware] User authenticated:', {
                userId: req.userId,
                userRole: req.user.role,
                email: req.user.email
            });
            
            next();
        } catch (error) {
            if (error.name === 'JsonWebTokenError') {
                res.locals.responseData = {
                    success: false,
                    status: 401,
                    message: 'Invalid token',
                    error: 'Token verification failed'
                };
            } else if (error.name === 'TokenExpiredError') {
                res.locals.responseData = {
                    success: false,
                    status: 401,
                    message: 'Token expired',
                    error: 'Please login again'
                };
            } else {
                res.locals.responseData = {
                    success: false,
                    status: 401,
                    message: 'Authentication failed',
                    error: error.message
                };
            }
            next();
        }
    } catch (error) {
        res.locals.responseData = {
            success: false,
            status: 500,
            message: 'Authentication middleware error',
            error: error.message
        };
        next();
    }
};

/**
 * Optional JWT auth: sets req.user when a valid token is present, never returns 401.
 * Use for routes that work for both anonymous and authenticated users (e.g. collage list for signup vs superadmin).
 */
export const optionalAuth = async (req, res, next) => {
    try {
        const authHeader = req.headers.authorization;
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return next();
        }
        const token = authHeader.substring(7);
        if (!token) return next();

        const secret = process.env.JWT_SECRET || 'your-secret-key';
        const decoded = jwt.verify(token, secret);

        const collegeIdFromToken = decoded.college_id;
        const roleFromToken = (decoded.role || '').toLowerCase();
        const isCollegeUser = ['tpc', 'depttpc', 'student'].includes(roleFromToken);
        if (collegeIdFromToken && isCollegeUser) {
            const { ObjectId } = await import('mongodb');
            const collegeFilter = typeof collegeIdFromToken === 'string' && /^[0-9a-fA-F]{24}$/.test(collegeIdFromToken)
                ? { _id: new ObjectId(collegeIdFromToken), deleted: false }
                : { _id: collegeIdFromToken, deleted: false };
            const collegeCheck = await fetchData('tblCollage', { _id: 1 }, collegeFilter, {});
            if (!collegeCheck.success || !collegeCheck.data || collegeCheck.data.length === 0) {
                return next();
            }
        }

        req.user = {
            ...decoded,
            id: decoded.id || decoded.userId || decoded.person_id,
            userId: decoded.id || decoded.userId || decoded.person_id,
            person_id: decoded.id || decoded.userId || decoded.person_id,
            role: (decoded.role || '').toLowerCase(),
            department: decoded.department,
            department_id: decoded.department_id || null,
            college_name: decoded.college_name,
            college_id: decoded.college_id,
        };
        req.userId = req.user.id;
        next();
    } catch (err) {
        next();
    }
};

/**
 * Role-based authentication middleware factory
 * Verifies user role from JWT token (special roles don't need database check)
 * @param {Array} allowedRoles - Array of allowed role names
 */
export const requireRole = (...allowedRoles) => {
    return async (req, res, next) => {
        try {
            const userRole = req.user?.role?.toLowerCase();
            
            // Special roles that don't need to be in tblRoles (e.g., Superadmin, TPC, DeptTPC, Student)
            const specialRoles = ['superadmin', 'tpc', 'depttpc', 'student', 'admin'];
            
            // Superadmin is always allowed
            if (userRole === 'superadmin') {
                return next();
            }

            if (!allowedRoles || allowedRoles.length === 0) {
                return next();
            }

            if (!userRole) {
                res.locals.responseData = {
                    success: false,
                    status: 403,
                    message: 'Access denied',
                    error: 'User role not found'
                };
                return next();
            }

            // Check if user's role matches any allowed role
            let isRoleAllowed = false;
            
            for (const allowedRole of allowedRoles) {
                const normalizedAllowed = allowedRole.toLowerCase();
                
                if (userRole === normalizedAllowed) {
                    // For special roles, direct match is enough
                    if (specialRoles.includes(normalizedAllowed)) {
                        isRoleAllowed = true;
                        break;
                    } else {
                        // For other roles, verify existence in tblRoles
                        const database = getDB();
                        const rolesCollection = database.collection('tblRoles');
                        const roleExists = await rolesCollection.findOne({ 
                            role_name: { $regex: new RegExp(`^${allowedRole}$`, 'i') } 
                        });
                        if (roleExists) {
                            isRoleAllowed = true;
                            break;
                        }
                    }
                }
            }
            
            if (!isRoleAllowed) {
                res.locals.responseData = {
                    success: false,
                    status: 403,
                    message: 'Access denied',
                    error: `Only ${allowedRoles.join(', ')} can access this resource`
                };
                return next();
            }

            next();
        } catch (error) {
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Role verification failed',
                error: error.message
            };
            next();
        }
    };
};
