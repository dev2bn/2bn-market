const express = require('express');
const router = express.Router();
const fileUpload = require('express-fileupload');
const { v2: cloudinary } = require('cloudinary');

router.use(fileUpload());

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

const cleanName = (n = '') => String(n).replace(/[^\p{L}\p{N} _-]/gu, '').trim().slice(0, 60);

const uploadOne = (file, options) =>
    new Promise((resolve, reject) => {
        cloudinary.uploader
            .upload_stream(options, (error, result) => (error ? reject(error) : resolve(result)))
            .end(file.data);
    });

router.post('/', async (req, res) => {
    try {
        if (!req.files || !req.files.file) {
            return res.status(400).json({ error: 'Aucun fichier fourni' });
        }

        // Un seul fichier = objet, plusieurs = tableau
        const files = Array.isArray(req.files.file) ? req.files.file : [req.files.file];
        const isImage = req.body.category === 'Images';
        const folder = cleanName(req.body.folder);

        const options = isImage
            ? { resource_type: 'image', transformation: [{ width: 1536, height: 1024, crop: 'limit' }] }
            : { resource_type: 'auto' };
        if (folder) options.asset_folder = folder;

        const results = await Promise.all(files.map((f) => uploadOne(f, options)));
        const fileUrls = results.map((r) => r.secure_url);

        res.json({ success: true, fileUrl: fileUrls[0], fileUrls });
    } catch (error) {
        console.error('❌ Erreur upload:', error);
        res.status(500).json({ error: error.message });
    }
});

module.exports = router;