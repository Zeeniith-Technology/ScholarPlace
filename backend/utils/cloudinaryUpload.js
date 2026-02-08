import dotenv from 'dotenv';
dotenv.config();

import { v2 as cloudinary } from 'cloudinary';

// Configure Cloudinary
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Upload file buffer to Cloudinary
 * @param {Buffer} fileBuffer - File buffer from req.body or multipart
 * @param {String} folder - Cloudinary folder path (e.g., 'bug-reports')
 * @param {String} resourceType - 'image' or 'video'
 * @returns {Promise<Object>} - { url, public_id, resource_type }
 */
export async function uploadToCloudinary(fileBuffer, folder = 'scholarplace_bug', resourceType = 'auto') {
    try {
        return new Promise((resolve, reject) => {
            const uploadStream = cloudinary.uploader.upload_stream(
                {
                    folder: folder,
                    resource_type: resourceType,
                    transformation: resourceType === 'image'
                        ? [{ quality: 'auto', fetch_format: 'auto' }]
                        : []
                },
                (error, result) => {
                    if (error) {
                        console.error('[Cloudinary Upload Error]:', error);
                        return reject(error);
                    }
                    resolve({
                        url: result.secure_url,
                        public_id: result.public_id,
                        resource_type: result.resource_type,
                        uploaded_at: new Date()
                    });
                }
            );

            uploadStream.end(fileBuffer);
        });
    } catch (error) {
        console.error('[Cloudinary Upload Error]:', error);
        throw new Error('Failed to upload file to Cloudinary');
    }
}

/**
 * Upload base64 encoded file to Cloudinary
 * @param {String} base64Data - Base64 encoded file data (with or without data URI prefix)
 * @param {String} folder - Cloudinary folder path
 * @param {String} resourceType - 'image' or 'video'
 * @returns {Promise<Object>} - { url, public_id, resource_type }
 */
export async function uploadBase64ToCloudinary(base64Data, folder = 'scholarplace_bug', resourceType = 'auto') {
    try {
        // Size validation for Cloudinary free tier
        // Calculate size from base64 string
        let base64String = base64Data;

        // Remove data URI prefix if present
        if (base64Data.includes(',')) {
            base64String = base64Data.split(',')[1];
        }

        // Calculate file size (base64 is ~33% larger than original)
        const sizeInBytes = (base64String.length * 3) / 4;
        const sizeInMB = sizeInBytes / (1024 * 1024);

        // Define size limits for free tier
        const MAX_IMAGE_SIZE_MB = 10;
        const MAX_VIDEO_SIZE_MB = 50;

        // Determine actual resource type from data URI or use provided type
        let actualResourceType = resourceType;
        if (base64Data.startsWith('data:image/')) {
            actualResourceType = 'image';
        } else if (base64Data.startsWith('data:video/')) {
            actualResourceType = 'video';
        }

        // Validate size based on resource type
        if (actualResourceType === 'image' && sizeInMB > MAX_IMAGE_SIZE_MB) {
            throw new Error(`Image size (${sizeInMB.toFixed(2)}MB) exceeds maximum allowed size of ${MAX_IMAGE_SIZE_MB}MB for free tier`);
        }

        if (actualResourceType === 'video' && sizeInMB > MAX_VIDEO_SIZE_MB) {
            throw new Error(`Video size (${sizeInMB.toFixed(2)}MB) exceeds maximum allowed size of ${MAX_VIDEO_SIZE_MB}MB for free tier`);
        }

        console.log(`[Cloudinary Upload] File size: ${sizeInMB.toFixed(2)}MB, Type: ${actualResourceType}`);

        const result = await cloudinary.uploader.upload(base64Data, {
            folder: folder,
            resource_type: actualResourceType === 'auto' ? resourceType : actualResourceType,
            transformation: actualResourceType === 'image'
                ? [{ quality: 'auto', fetch_format: 'auto' }]
                : []
        });

        return {
            url: result.secure_url,
            public_id: result.public_id,
            resource_type: result.resource_type,
            uploaded_at: new Date()
        };
    } catch (error) {
        console.error('[Cloudinary Base64 Upload Error]:', error.message || error);
        throw error; // Re-throw to preserve original error message
    }
}

/**
 * Delete file from Cloudinary
 * @param {String} publicId - Cloudinary public_id
 * @param {String} resourceType - 'image' or 'video'
 * @returns {Promise<Object>} - Cloudinary delete result
 */
export async function deleteFromCloudinary(publicId, resourceType = 'image') {
    try {
        const result = await cloudinary.uploader.destroy(publicId, {
            resource_type: resourceType
        });

        console.log('[Cloudinary Delete]:', publicId, result);
        return result;
    } catch (error) {
        console.error('[Cloudinary Delete Error]:', error);
        throw new Error('Failed to delete file from Cloudinary');
    }
}

/**
 * Delete multiple files from Cloudinary
 * @param {Array} mediaFiles - Array of { public_id, resource_type } objects
 * @returns {Promise<Array>} - Array of delete results
 */
export async function deleteBulkFromCloudinary(mediaFiles) {
    try {
        const deletePromises = mediaFiles.map(file =>
            deleteFromCloudinary(file.public_id, file.resource_type)
        );

        return await Promise.all(deletePromises);
    } catch (error) {
        console.error('[Cloudinary Bulk Delete Error]:', error);
        throw new Error('Failed to delete files from Cloudinary');
    }
}
