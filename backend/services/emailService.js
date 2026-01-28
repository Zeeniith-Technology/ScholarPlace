import nodemailer from 'nodemailer';
import dotenv from 'dotenv';
dotenv.config();

/**
 * Email Service for sending OTPs and password reset emails
 * Uses Gmail SMTP
 */

class EmailService {
    constructor() {
        this.transporter = null;
        this.initializeTransporter();
    }

    initializeTransporter() {
        try {
            this.transporter = nodemailer.createTransport({
                service: 'gmail',
                auth: {
                    user: process.env.EMAIL_USER,
                    pass: process.env.EMAIL_APP_PASSWORD
                }
            });

            console.log('[EmailService] Email service initialized');
        } catch (error) {
            console.error('[EmailService] Failed to initialize email service:', error);
        }
    }

    /**
     * Send OTP email for password reset
     */
    async sendPasswordResetOTP(email, otp, userName = 'User') {
        try {
            if (!this.transporter) {
                throw new Error('Email service not configured. Please set EMAIL_USER and EMAIL_APP_PASSWORD in .env');
            }

            const mailOptions = {
                from: `"ScholarPlace" <${process.env.EMAIL_USER}>`,
                to: email,
                subject: 'Password Reset OTP - ScholarPlace',
                html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .otp-box { background: white; border: 2px dashed #667eea; padding: 20px; text-align: center; margin: 20px 0; border-radius: 8px; }
              .otp-code { font-size: 32px; font-weight: bold; color: #667eea; letter-spacing: 8px; }
              .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
              .warning { background: #fff3cd; border-left: 4px solid #ffc107; padding: 12px; margin: 20px 0; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>🔐 Password Reset Request</h1>
              </div>
              <div class="content">
                <p>Hi <strong>${userName}</strong>,</p>
                <p>We received a request to reset your ScholarPlace password. Use the OTP below to proceed:</p>
                
                <div class="otp-box">
                  <p style="margin: 0; font-size: 14px; color: #666;">Your OTP Code</p>
                  <div class="otp-code">${otp}</div>
                  <p style="margin: 10px 0 0 0; font-size: 12px; color: #999;">Valid for 15 minutes</p>
                </div>

                <div class="warning">
                  <strong>⚠️ Security Notice:</strong> If you didn't request this password reset, please ignore this email. Your password will remain unchanged.
                </div>

                <p>For your security:</p>
                <ul>
                  <li>Never share this OTP with anyone</li>
                  <li>Our team will never ask for your OTP</li>
                  <li>This code expires in 15 minutes</li>
                </ul>

                <p>Best regards,<br><strong>ScholarPlace Team</strong></p>
              </div>
              <div class="footer">
                <p>This is an automated email. Please do not reply.</p>
                <p>&copy; ${new Date().getFullYear()} ScholarPlace. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `
            };

            const info = await this.transporter.sendMail(mailOptions);
            console.log('[EmailService] OTP email sent:', info.messageId);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error('[EmailService] Failed to send OTP email:', error);
            throw error;
        }
    }

    /**
     * Send password reset confirmation email
     */
    async sendPasswordResetConfirmation(email, userName = 'User') {
        try {
            if (!this.transporter) {
                throw new Error('Email service not configured');
            }

            const mailOptions = {
                from: `"ScholarPlace" <${process.env.EMAIL_USER}>`,
                to: email,
                subject: 'Password Reset Successful - ScholarPlace',
                html: `
          <!DOCTYPE html>
          <html>
          <head>
            <style>
              body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
              .container { max-width: 600px; margin: 0 auto; padding: 20px; }
              .header { background: linear-gradient(135deg, #11998e 0%, #38ef7d 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
              .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
              .success-box { background: #d4edda; border: 1px solid #c3e6cb; padding: 20px; border-radius: 8px; margin: 20px 0; text-align: center; }
              .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
            </style>
          </head>
          <body>
            <div class="container">
              <div class="header">
                <h1>✅ Password Reset Successful</h1>
              </div>
              <div class="content">
                <p>Hi <strong>${userName}</strong>,</p>
                
                <div class="success-box">
                  <h2 style="color: #155724; margin: 0;">Your password has been reset successfully!</h2>
                </div>

                <p>You can now log in to your ScholarPlace account using your new password.</p>

                <p><strong>Security Tips:</strong></p>
                <ul>
                  <li>Use a strong, unique password</li>
                  <li>Don't share your password with anyone</li>
                  <li>Change your password regularly</li>
                </ul>

                <p style="margin-top: 30px;">If you did not make this change, please contact our support team immediately.</p>

                <p>Best regards,<br><strong>ScholarPlace Team</strong></p>
              </div>
              <div class="footer">
                <p>&copy; ${new Date().getFullYear()} ScholarPlace. All rights reserved.</p>
              </div>
            </div>
          </body>
          </html>
        `
            };

            const info = await this.transporter.sendMail(mailOptions);
            console.log('[EmailService] Confirmation email sent:', info.messageId);
            return { success: true, messageId: info.messageId };
        } catch (error) {
            console.error('[EmailService] Failed to send confirmation email:', error);
            throw error;
        }
    }

    /**
     * Test email configuration
     */
    async testConnection() {
        try {
            if (!this.transporter) {
                return { success: false, message: 'Email service not configured' };
            }

            await this.transporter.verify();
            return { success: true, message: 'Email service is working!' };
        } catch (error) {
            console.error('[EmailService] Connection test failed:', error);
            return { success: false, message: error.message };
        }
    }
}

export default new EmailService();
