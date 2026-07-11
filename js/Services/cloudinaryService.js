import { CLOUDINARY_UPLOAD_URL, CLOUDINARY_CONFIG } from "../Config/cloudinary.js";

/**
 * Upload un fichier image vers Cloudinary (upload non signé).
 * @param {File} file
 * @returns {Promise<string>} l'URL sécurisée de l'image uploadée
 */
export async function uploadImageCloudinary(file) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", CLOUDINARY_CONFIG.uploadPreset);

    const response = await fetch(CLOUDINARY_UPLOAD_URL, {
        method: "POST",
        body: formData,
    });

    if (!response.ok) {
        throw new Error("Impossible d'envoyer la photo sur Cloudinary.");
    }

    const data = await response.json();
    return data.secure_url;
}