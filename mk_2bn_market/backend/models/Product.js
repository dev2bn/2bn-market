const mongoose = require('mongoose');

const productSchema = new mongoose.Schema({
  image: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  notice: {
    type: String,
    required: false
  },
  description: {
    type: String,
    required: true
  },
  price: {
    type: String,
    required: true
  },
  content: {
    type: String,
    required: true
  },
  categories: {
    type: String,
    required: true
  },
  fileUrl: {
    type: String,
    required: true
  },
  files: [{
    name: { type: String, required: true },
    description: { type: String, default: '' },
    image: { type: String, default: '' }   // vide = placeholder
  }]
}, {
  timestamps: true
});

module.exports = mongoose.model('Product', productSchema);