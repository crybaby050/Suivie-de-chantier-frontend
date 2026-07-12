// cloudinary.config.js
export const CLOUDINARY_CONFIG = {
    cloudName: 'dltogpeir',
    uploadPreset: 'Suivie de chantier',
};

export const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CONFIG.cloudName}/upload`;