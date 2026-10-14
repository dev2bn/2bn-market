const express = require('express');
const router = express.Router();
const Product = require('../models/Product');

// Retire fileUrl (lien du fichier payant) et le remplace par un booléen
const toPublic = (doc) => {
  const obj = doc.toObject ? doc.toObject() : doc;
  const { fileUrl, ...data } = obj;
  return { ...data, hasFile: !!fileUrl };
};

// GET - Tous les produits
router.get('/', async (req, res) => {
  try {
    const products = await Product.find();
    res.json(products.map(toPublic));
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

// GET - Un produit par ID
router.get('/:id', async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);
    if (!product) {
      return res.status(404).json({ message: 'Produit non trouvé' });
    }
    res.json(toPublic(product));
  } catch (error) {
    console.error('Erreur:', error);
    res.status(500).json({ message: 'Erreur serveur' });
  }
});

// POST - Ajouter un produit
router.post('/', async (req, res) => {
  try {
    const product = new Product(req.body);
    const saved = await product.save();
    res.status(201).json(toPublic(saved));
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// PUT - Modifier un produit
router.put('/:id', async (req, res) => {
  try {
    // Un fileUrl vide ou absent ne doit jamais écraser le lien existant
    if (!req.body.fileUrl) delete req.body.fileUrl;
    delete req.body.hasFile;

    const updated = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    });
    if (!updated) {
      return res.status(404).json({ message: 'Produit non trouvé' });
    }
    res.json(toPublic(updated));
  } catch (error) {
    res.status(400).json({ message: error.message });
  }
});

// DELETE - Supprimer un produit
router.delete('/:id', async (req, res) => {
  try {
    await Product.findByIdAndDelete(req.params.id);
    res.json({ message: 'Produit supprimé' });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;