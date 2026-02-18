import { executeData, fetchData } from '../methods.js';
import certificateSchema from '../schema/certificate.js';
import { uploadBase64ToCloudinary } from '../utils/cloudinaryUpload.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Pre-load logos (synchrounous read on startup is fine for this size)
let smallLogoBase64 = '';
let textLogoBase64 = '';

try {
    // UPDATED: Now reading from backend's own public folder
    const smallLogoPath = path.join(__dirname, '../public/images/Small_Logo.png');
    if (fs.existsSync(smallLogoPath)) {
        smallLogoBase64 = 'data:image/png;base64,' + fs.readFileSync(smallLogoPath).toString('base64');
    }

    const textLogoPath = path.join(__dirname, '../public/images/black_text_logo.png');
    if (fs.existsSync(textLogoPath)) {
        textLogoBase64 = 'data:image/png;base64,' + fs.readFileSync(textLogoPath).toString('base64');
    }
} catch (e) {
    console.error('Failed to load certificate logos:', e.message);
}

/**
 * Generate SVG certificate for a student
 */
function buildCertificateSVG(studentName, issuedDate) {
    const dateStr = new Date(issuedDate).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'long', year: 'numeric'
    });

    // Escape XML special chars
    const safeName = String(studentName || 'Student')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="900" height="636" viewBox="0 0 900 636">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" style="stop-color:#ffffff;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#f8fafc;stop-opacity:1" />
    </linearGradient>
    <linearGradient id="goldGrad" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" style="stop-color:#b45309;stop-opacity:1" />
      <stop offset="50%" style="stop-color:#d97706;stop-opacity:1" />
      <stop offset="100%" style="stop-color:#b45309;stop-opacity:1" />
    </linearGradient>
    <pattern id="pattern" x="0" y="0" width="20" height="20" patternUnits="userSpaceOnUse">
      <circle cx="2" cy="2" r="1" fill="#e2e8f0" />
    </pattern>
  </defs>

  <!-- Background -->
  <rect width="900" height="636" fill="url(#bgGrad)" />
  <rect width="900" height="636" fill="url(#pattern)" opacity="0.5" />

  <!-- Watermark Logo -->
  ${smallLogoBase64 ? `<image href="${smallLogoBase64}" x="250" y="118" width="400" height="400" opacity="0.05" />` : ''}

  <!-- Elegant Border -->
  <rect x="20" y="20" width="860" height="596" rx="0" ry="0"
        fill="none" stroke="url(#goldGrad)" stroke-width="4"/>
  <rect x="30" y="30" width="840" height="576" rx="0" ry="0"
        fill="none" stroke="#0f172a" stroke-width="1"/>
  
  <!-- Corner Flourishes (Top Left) -->
  <path d="M 50 80 L 50 50 L 80 50" fill="none" stroke="url(#goldGrad)" stroke-width="3" />
  <path d="M 40 90 L 40 40 L 90 40" fill="none" stroke="#0f172a" stroke-width="1" />

  <!-- Corner Flourishes (Top Right) -->
  <path d="M 850 80 L 850 50 L 820 50" fill="none" stroke="url(#goldGrad)" stroke-width="3" />
  <path d="M 860 90 L 860 40 L 810 40" fill="none" stroke="#0f172a" stroke-width="1" />

  <!-- Corner Flourishes (Bottom Left) -->
  <path d="M 50 556 L 50 586 L 80 586" fill="none" stroke="url(#goldGrad)" stroke-width="3" />
  <path d="M 40 546 L 40 596 L 90 596" fill="none" stroke="#0f172a" stroke-width="1" />

  <!-- Corner Flourishes (Bottom Right) -->
  <path d="M 850 556 L 850 586 L 820 586" fill="none" stroke="url(#goldGrad)" stroke-width="3" />
  <path d="M 860 546 L 860 596 L 810 596" fill="none" stroke="#0f172a" stroke-width="1" />

  <!-- Top Logo Header -->
  ${textLogoBase64 ? `<image href="${textLogoBase64}" x="300" y="60" width="300" height="80" />` :
            `<text x="450" y="100" text-anchor="middle" font-family="Georgia, serif" font-size="24" font-weight="700" fill="#0f172a">SCHOLARPLACE</text>`}

  <!-- Main Title -->
  <text x="450" y="170" text-anchor="middle"
        font-family="Georgia, serif" font-size="48" font-weight="700"
        fill="#0f172a" letter-spacing="2">CERTIFICATE</text>
  
  <text x="450" y="205" text-anchor="middle"
        font-family="Arial, sans-serif" font-size="16" font-weight="400"
        fill="#b45309" letter-spacing="6">OF APPRECIATION</text>

  <!-- Divider -->
  <line x1="350" y1="230" x2="550" y2="230" stroke="#cbd5e1" stroke-width="1"/>

  <!-- Presentation line -->
  <text x="450" y="270" text-anchor="middle"
        font-family="Georgia, serif" font-size="20" font-style="italic"
        fill="#64748b">This certificate is proudly presented to</text>

  <!-- Student Name -->
  <text x="450" y="340" text-anchor="middle"
        font-family="Georgia, serif" font-size="56" font-weight="700"
        fill="#1e293b">${safeName}</text>
  
  <line x1="200" y1="360" x2="700" y2="360" stroke="url(#goldGrad)" stroke-width="2"/>

  <!-- Body Text -->
  <foreignObject x="150" y="390" width="600" height="120">
    <div xmlns="http://www.w3.org/1999/xhtml" style="text-align: center; font-family: Georgia, serif; font-size: 18px; color: #475569; line-height: 1.6;">
      In recognition of your outstanding performance and dedication in completing the
      <span style="color: #0f172a; font-weight: bold;">8-Week Placement Training Program</span>.
      We verify your proficiency in Data Structures, Algorithms, and Aptitude.
    </div>
  </foreignObject>

  <!-- Signature / Date Section -->
  <line x1="150" y1="530" x2="350" y2="530" stroke="#94a3b8" stroke-width="1"/>
  <text x="250" y="555" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="#64748b">DATE ISSUED: ${dateStr}</text>

  <line x1="550" y1="530" x2="750" y2="530" stroke="#94a3b8" stroke-width="1"/>
  <text x="650" y="555" text-anchor="middle" font-family="Arial, sans-serif" font-size="14" fill="#64748b">PROGRAM DIRECTOR</text>

  <!-- Badge -->
  <g transform="translate(420, 490)">
    <circle cx="30" cy="30" r="25" fill="#fef3c7" stroke="#d97706" stroke-width="2"/>
    <path d="M 20 30 L 27 37 L 42 22" fill="none" stroke="#d97706" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"/>
  </g>
</svg>`;
}

export default class CertificateController {

    sendError(res, status, message) {
        res.locals.responseData = { success: false, status, message };
    }

    /**
     * Internal: Check eligibility and generate/return certificate for a student.
     * Called automatically after week 8 completion.
     * @param {string} studentId
     * @param {object} fetchDataFn - fetchData utility
     * @returns {object|null} certificate record or null
     */
    static async generateIfEligible(studentId) {
        try {
            const studentIdStr = studentId.toString();

            // 1. Check if certificate already exists
            const existing = await fetchData('tblCertificate', {}, {
                student_id: studentIdStr,
                deleted: { $ne: true }
            });
            if (existing.data && existing.data.length > 0) {
                return existing.data[0]; // Already issued
            }

            // 2. Check week 8 completion (sequential unlock means 1-7 are done too)
            const week8 = await fetchData('tblStudentProgress', {}, {
                student_id: studentIdStr,
                week: 8,
                status: 'completed'
            });
            if (!week8.data || week8.data.length === 0) {
                return null; // Not eligible yet
            }

            // 3. Fetch student details
            const studentRes = await fetchData('tblPersonMaster', {}, { _id: studentId });
            const student = studentRes.data?.[0];
            if (!student) return null;

            const studentName = student.person_name || 'Student';
            const issuedAt = new Date();

            // 4. Generate SVG certificate
            const svgContent = buildCertificateSVG(studentName, issuedAt);
            const base64SVG = `data:image/svg+xml;base64,${Buffer.from(svgContent).toString('base64')}`;

            // 5. Upload to Cloudinary
            const uploaded = await uploadBase64ToCloudinary(
                base64SVG,
                'scholarplace/certificates',
                'image'
            );

            // 6. Save to DB
            const certData = {
                student_id: studentIdStr,
                student_name: studentName,
                student_email: student.person_email || '',
                college_id: student.person_collage_id?.toString() || '',
                department_id: student.department_id?.toString() || '',
                cloudinary_url: uploaded.url,
                cloudinary_public_id: uploaded.public_id,
                issued_at: issuedAt,
                created_at: issuedAt.toISOString(),
                deleted: false
            };

            const saved = await executeData('tblCertificate', certData, 'i', certificateSchema);
            console.log(`[Certificate] Issued for student ${studentIdStr}`);
            return { ...certData, _id: saved.data?._id };

        } catch (err) {
            console.error('[Certificate] Generation error:', err.message);
            return null;
        }
    }

    /**
     * Student: Get own certificate
     * Route: POST /student/certificate
     */
    async getStudentCertificate(req, res, next) {
        try {
            const userId = req.userId || req.user?.id;
            if (!userId) return this.sendError(res, 401, 'Unauthorized');

            const studentIdStr = userId.toString();

            // Check existing certificate
            const certRes = await fetchData('tblCertificate', {}, {
                student_id: studentIdStr,
                deleted: { $ne: true }
            });

            if (certRes.data && certRes.data.length > 0) {
                res.locals.responseData = {
                    success: true, status: 200,
                    message: 'Certificate found',
                    data: { earned: true, certificate: certRes.data[0] }
                };
                return next();
            }

            // Not yet earned — check progress
            const progressRes = await fetchData('tblStudentProgress', {
                week: 1, status: 1, progress_percentage: 1
            }, { student_id: studentIdStr });

            const progress = progressRes.data || [];
            const completedWeeks = progress.filter(p => p.status === 'completed').map(p => p.week);

            res.locals.responseData = {
                success: true, status: 200,
                message: 'Certificate not yet earned',
                data: {
                    earned: false,
                    completed_weeks: completedWeeks,
                    total_weeks: 8,
                    weeks_remaining: 8 - completedWeeks.length
                }
            };
            next();
        } catch (err) {
            console.error('[Certificate] getStudentCertificate error:', err.message);
            this.sendError(res, 500, err.message);
            next();
        }
    }

    /**
     * DeptTPC: Get all certificates for their department
     * Route: POST /dept-tpc/certificates
     */
    async getDeptCertificates(req, res, next) {
        try {
            const userId = req.userId || req.user?.id;
            const userRole = req.user?.role;
            if (!userId) return this.sendError(res, 401, 'Unauthorized');
            if (userRole !== 'DeptTPC') return this.sendError(res, 403, 'Access denied');

            // Get TPC's department info
            const tpcRes = await fetchData('tblPersonMaster', {}, { _id: userId });
            const tpc = tpcRes.data?.[0];
            if (!tpc) return this.sendError(res, 404, 'TPC not found');

            const certRes = await fetchData(
                'tblCertificate',
                {},
                {
                    department_id: tpc.department_id?.toString(),
                    college_id: tpc.person_collage_id?.toString(),
                    deleted: { $ne: true }
                },
                { sort: { issued_at: -1 } }
            );

            res.locals.responseData = {
                success: true, status: 200,
                message: 'Certificates fetched',
                data: certRes.data || []
            };
            next();
        } catch (err) {
            console.error('[Certificate] getDeptCertificates error:', err.message);
            this.sendError(res, 500, err.message);
            next();
        }
    }
}
