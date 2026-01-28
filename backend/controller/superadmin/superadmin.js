import { fetchData, executeData } from '../../methods.js';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import dotenv from 'dotenv';
dotenv.config();

export default class superadmincontroller {
    /**
     * Superadmin Login - Authenticate and return JWT token
     * Checks database first, then falls back to hardcoded credentials (for backward compatibility)
     */
    async login(req, res, next) {
        try {
            const { email, password } = req.body || {};

            if (!email || !password) {
                res.locals.responseData = {
                    success: false,
                    status: 400,
                    message: 'Email and password are required',
                    error: 'Missing credentials'
                };
                return next();
            }

            // Normalize email
            const normalizedEmail = email.toLowerCase().trim();
            console.log('[Superadmin Login] Attempt:', { email, normalizedEmail, passwordLength: password?.length });

            // First, try to find superadmin in database
            const dbUserResponse = await fetchData(
                'tblPersonMaster',
                {},
                {
                    person_email: normalizedEmail,
                    person_role: 'superadmin',
                    person_deleted: false
                },
                {}
            );

            let user = null;
            let userId = null;

            // If found in database, verify password
            if (dbUserResponse.success && dbUserResponse.data && dbUserResponse.data.length > 0) {
                console.log('[Superadmin Login] Found user in database');
                const dbUser = dbUserResponse.data[0];
                const isValidPassword = await bcrypt.compare(password, dbUser.person_password);
                console.log('[Superadmin Login] Password valid:', isValidPassword);
                
                if (isValidPassword) {
                    user = {
                        _id: dbUser._id,
                        person_id: dbUser._id,
                        person_email: dbUser.person_email,
                        person_role: dbUser.person_role,
                        person_name: dbUser.person_name,
                        person_status: dbUser.person_status
                    };
                    userId = dbUser._id;
                    
                    // Update last login
                    await executeData(
                        'tblPersonMaster',
                        { last_login: new Date().toISOString(), updatedAt: new Date().toISOString() },
                        'u',
                        null,
                        { _id: dbUser._id }
                    );
                }
            } else {
                console.log('[Superadmin Login] No user found in database, checking hardcoded credentials');
            }

            // Fallback to hardcoded credentials (for backward compatibility)
            if (!user) {
                const allowedEmail = '123@gmail.com';
                const allowedPassword = 'a';

                console.log('[Superadmin Login] Checking hardcoded:', {
                    normalizedEmail,
                    allowedEmail,
                    emailMatch: normalizedEmail === allowedEmail,
                    passwordMatch: password === allowedPassword,
                    password,
                    allowedPassword
                });

                if (normalizedEmail === allowedEmail && password === allowedPassword) {
                    console.log('[Superadmin Login] Hardcoded credentials matched!');
                    user = {
                        person_email: allowedEmail,
                        person_role: 'superadmin',
                        person_name: 'Super Admin',
                        person_status: 'active'
                    };
                    userId = 'superadmin-dev';
                } else {
                    console.log('[Superadmin Login] Hardcoded credentials did not match');
                }
            }

            // If still no valid user, return error
            if (!user) {
                res.locals.responseData = {
                    success: false,
                    status: 401,
                    message: 'Invalid email or password',
                    error: 'Superadmin credentials mismatch'
                };
                return next();
            }

            // Generate JWT token
            const secret = process.env.JWT_SECRET || 'your-secret-key';
            const token = jwt.sign(
                {
                    id: userId || user._id || user.person_id || 'superadmin-dev',
                    email: user.person_email,
                    role: user.person_role,
                    name: user.person_name
                },
                secret,
                { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
            );

            // Prepare response (JWT token only, no cookies)
            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'Superadmin login successful',
                data: {
                    token: token,
                    user: {
                        id: userId || user._id || user.person_id,
                        name: user.person_name,
                        email: user.person_email,
                        role: user.person_role,
                        status: user.person_status
                    }
                }
            };

            next();
        } catch (error) {
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Superadmin login failed',
                error: error.message
            };
            next();
        }
    }
}

