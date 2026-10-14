const mongoose = require('mongoose');

const connectDB = async () => {
  // Ne log jamais la valeur de l'URI, seulement si elle existe
  console.log(
    'Connexion à MongoDB... MONGODB_URI définie :',
    Boolean(process.env.MONGODB_URI)
  );

  try {
    await mongoose.connect(process.env.MONGODB_URI, {
      serverSelectionTimeoutMS: 10000, // échoue après 10 s au lieu de 30 s
    });
    console.log('MongoDB connecté avec succès');
  } catch (error) {
    console.error('Erreur de connexion MongoDB:');
    console.error('  nom     :', error.name);
    console.error('  message :', error.message);
    if (error.code) console.error('  code    :', error.code);
    process.exit(1);
  }
};

module.exports = connectDB;