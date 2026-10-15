const express = require('express');
const router = express.Router();
const { v2: cloudinary } = require('cloudinary');

cloudinary.config({
    cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Nom de dossier sûr (lettres, chiffres, espace, - et _)
const cleanName = (n = '') => String(n).replace(/[^\p{L}\p{N} _-]/gu, '').trim().slice(0, 60);

// GET - liste des dossiers
router.get('/folders', async (req, res) => {
    try {
        const result = await cloudinary.api.root_folders();
        res.json({ folders: result.folders.map((f) => ({ name: f.name, path: f.path })) });
    } catch (err) {
        console.error('Erreur folders:', err);
        res.status(500).json({ error: 'Erreur Cloudinary' });
    }
});

// POST - créer un dossier
router.post('/folders', express.json(), async (req, res) => {
    const name = cleanName(req.body.name);
    if (!name) return res.status(400).json({ error: 'Nom de dossier invalide' });
    try {
        await cloudinary.api.create_folder(name);
        res.status(201).json({ name, path: name });
    } catch (err) {
        console.error('Erreur create_folder:', err);
        res.status(500).json({ error: 'Erreur Cloudinary' });
    }
});

// GET - images (toutes, ou celles d'un dossier : /images?folder=Nom)
router.get('/images', async (req, res) => {
    try {
        const folder = cleanName(req.query.folder);
        const expression = folder
            ? `resource_type:image AND folder="${folder}"`
            : 'resource_type:image';

        const result = await cloudinary.search
            .expression(expression)
            .sort_by('created_at', 'desc')
            .max_results(100)
            .execute();

        res.json({
            images: result.resources.map((r) => ({
                public_id: r.public_id,
                secure_url: r.secure_url,
            })),
        });
    } catch (err) {
        console.error('Erreur images:', err);
        res.status(500).json({ error: 'Erreur Cloudinary' });
    }
});

module.exports = router;