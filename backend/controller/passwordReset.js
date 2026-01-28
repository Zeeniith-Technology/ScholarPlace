import { fetchData, executeData } from '../methods.js';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import emailService from '../services/emailService.js';
import passwordResetSchema from '../schema/passwordReset.js';

/**
 * Password Reset Controller
 * Handles forgot password, OTP verification, and password reset
 */
class PasswordResetController {
    /**
     * Generate 6-digit OTP
     */
    generateOTP() {
        return Math.floor(100000 + Math.random() * 900000).toString();
    }

    /**
     * Generate unique reset token
     */
    generateToken() {
        return crypto.randomBytes(32).toString('hex');
    }

    /**
     * Request password reset - Send OTP to email
     * Route: POST /auth/forgot-password
     */
    async requestPasswordReset(req, res, next) {
        try {
            const { email } = req.body;

            if (!email) {
                res.locals.responseData = {
                    success: false,
                    status: 400,
                    message: 'Email is required'
                };
                return next();
            }

            // Normalize email
            const normalizedEmail = email.toLowerCase().trim();

            // Check if user exists
            const userResult = await fetchData(
                'tblPersonMaster',
                {},
                { person_email: normalizedEmail }
            );

            // For security, always return success even if email doesn't exist
            // This prevents email enumeration attacks
            if (!userResult.data || userResult.data.length === 0) {
                console.log('[PasswordReset] Email not found:', normalizedEmail);
                res.locals.responseData = {
                    success: true,
                    status: 200,
                    message: 'If the email exists, an OTP has been sent to it.'
                };
                return next();
            }

            const user = userResult.data[0];
            const userName = user.person_name || 'User';

            // Check rate limiting - max 3 requests per hour
            const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
            const recentRequests = await fetchData(
                'tblPasswordReset',
                {},
                {
                    email: normalizedEmail,
                    created_at: { $gte: oneHourAgo }
                }
            );

            if (recentRequests.data && recentRequests.data.length >= 3) {
                res.locals.responseData = {
                    success: false,
                    status: 429,
                    message: 'Too many reset requests. Please try again later.'
                };
                return next();
            }

            // Generate OTP and token
            const otp = this.generateOTP();
            const token = this.generateToken();
            const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

            // Store reset request
            const resetData = {
                email: normalizedEmail,
                otp: otp,
                token: token,
                expires_at: expiresAt,
                used: false,
                attempts: 0,
                created_at: new Date()
            };

            await executeData('tblPasswordReset', resetData, 'i', passwordResetSchema);

            // Send OTP email
            try {
                await emailService.sendPasswordResetOTP(normalizedEmail, otp, userName);
                console.log('[PasswordReset] OTP sent to:', normalizedEmail);
            } catch (emailError) {
                console.error('[PasswordReset] Failed to send email:', emailError);
                res.locals.responseData = {
                    success: false,
                    status: 500,
                    message: 'Failed to send OTP email. Please try again later.'
                };
                return next();
            }

            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'OTP has been sent to your email. Please check your inbox.',
                data: {
                    email: normalizedEmail,
                    expiresIn: '15 minutes'
                }
            };
            next();
        } catch (error) {
            console.error('[PasswordReset] Error in requestPasswordReset:', error);
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Failed to process password reset request',
                error: error.message
            };
            next();
        }
    }

    /**
     * Verify OTP and return reset token
     * Route: POST /auth/verify-reset-otp
     */
    async verifyOTP(req, res, next) {
        try {
            const { email, otp } = req.body;

            if (!email || !otp) {
                res.locals.responseData = {
                    success: false,
                    status: 400,
                    message: 'Email and OTP are required'
                };
                return next();
            }

            const normalizedEmail = email.toLowerCase().trim();
            const normalizedOTP = otp.trim();

            // Find reset request
            const resetResult = await fetchData(
                'tblPasswordReset',
                {},
                {
                    email: normalizedEmail,
                    otp: normalizedOTP,
                    used: false
                },
                { sort: { created_at: -1 }, limit: 1 }
            );

            if (!resetResult.data || resetResult.data.length === 0) {
                res.locals.responseData = {
                    success: false,
                    status: 400,
                    message: 'Invalid OTP'
                };
                return next();
            }

            const resetRequest = resetResult.data[0];

            // Check if OTP is expired
            if (new Date() > new Date(resetRequest.expires_at)) {
                res.locals.responseData = {
                    success: false,
                    status: 400,
                    message: 'OTP has expired. Please request a new one.'
                };
                return next();
            }

            // Check attempts (max 5)
            if (resetRequest.attempts >= 5) {
                res.locals.responseData = {
                    success: false,
                    status: 429,
                    message: 'Too many failed attempts. Please request a new OTP.'
                };
                return next();
            }

            // OTP is valid - return token
            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'OTP verified successfully',
                data: {
                    token: resetRequest.token,
                    email: normalizedEmail
                }
            };
            next();
        } catch (error) {
            console.error('[PasswordReset] Error in verifyOTP:', error);
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Failed to verify OTP',
                error: error.message
            };
            next();
        }
    }

    /**
     * Reset password using token
     * Route: POST /auth/reset-password
     */
    async resetPassword(req, res, next) {
        try {
            const { token, newPassword, confirmPassword } = req.body;

            if (!token || !newPassword || !confirmPassword) {
                res.locals.responseData = {
                    success: false,
                    status: 400,
                    message: 'Token, new password, and confirmation are required'
                };
                return next();
            }

            // Validate password match
            if (newPassword !== confirmPassword) {
                res.locals.responseData = {
                    success: false,
                    status: 400,
                    message: 'Passwords do not match'
                };
                return next();
            }

            // Validate password strength
            if (newPassword.length < 8) {
                res.locals.responseData = {
                    success: false,
                    status: 400,
                    message: 'Password must be at least 8 characters long'
                };
                return next();
            }

            // Find reset request by token
            const resetResult = await fetchData(
                'tblPasswordReset',
                {},
                {
                    token: token,
                    used: false
                },
                { sort: { created_at: -1 }, limit: 1 }
            );

            if (!resetResult.data || resetResult.data.length === 0) {
                res.locals.responseData = {
                    success: false,
                    status: 400,
                    message: 'Invalid or expired reset token'
                };
                return next();
            }

            const resetRequest = resetResult.data[0];

            // Check if token is expired
            if (new Date() > new Date(resetRequest.expires_at)) {
                res.locals.responseData = {
                    success: false,
                    status: 400,
                    message: 'Reset token has expired. Please request a new password reset.'
                };
                return next();
            }

            // Find user
            const userResult = await fetchData(
                'tblPersonMaster',
                {},
                { person_email: resetRequest.email }
            );

            if (!userResult.data || userResult.data.length === 0) {
                res.locals.responseData = {
                    success: false,
                    status: 404,
                    message: 'User not found'
                };
                return next();
            }

            const user = userResult.data[0];

            // Hash new password
            const hashedPassword = await bcrypt.hash(newPassword, 10);

            // Update user password
            await executeData(
                'tblPersonMaster',
                { person_password: hashedPassword },
                'u',
                null,
                { _id: user._id }
            );

            // Mark token as used
            await executeData(
                'tblPasswordReset',
                { used: true },
                'u',
                null,
                { token: token }
            );

            // Send confirmation email
            try {
                await emailService.sendPasswordResetConfirmation(
                    resetRequest.email,
                    user.person_name || 'User'
                );
            } catch (emailError) {
                console.error('[PasswordReset] Failed to send confirmation email:', emailError);
                // Don't fail the request if confirmation email fails
            }

            console.log('[PasswordReset] Password reset successful for:', resetRequest.email);

            res.locals.responseData = {
                success: true,
                status: 200,
                message: 'Password reset successful. You can now login with your new password.'
            };
            next();
        } catch (error) {
            console.error('[PasswordReset] Error in resetPassword:', error);
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Failed to reset password',
                error: error.message
            };
            next();
        }
    }

    /**
     * Resend OTP
     * Route: POST /auth/resend-otp
     */
    async resendOTP(req, res, next) {
        try {
            const { email } = req.body;

            if (!email) {
                res.locals.responseData = {
                    success: false,
                    status: 400,
                    message: 'Email is required'
                };
                return next();
            }

            // Just call the request password reset again
            // It has built-in rate limiting
            return this.requestPasswordReset(req, res, next);
        } catch (error) {
            console.error('[PasswordReset] Error in resendOTP:', error);
            res.locals.responseData = {
                success: false,
                status: 500,
                message: 'Failed to resend OTP',
                error: error.message
            };
            next();
        }
    }
}

export default PasswordResetController;
