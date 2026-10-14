const express = require('express');
const router = express.Router();
const axios = require('axios');
const { google } = require('googleapis');
const Transaction = require('../models/transaction');
const Product = require('../models/Product');

// ---------------------------------------------------------------------------
// Configuration (tout vient des variables d'environnement Render)
// ---------------------------------------------------------------------------
const EBILLING_BASE_URL =
  process.env.EBILLING_BASE_URL ||
  'https://stg.billing-easy.com/api/v1/merchant/e_bills.json';
const EBILLING_BILL_URL =
  process.env.EBILLING_BILL_URL ||
  'https://stg.billing-easy.com/api/v1/merchant/e_bills';
const EBILLING_PORTAL_URL =
  process.env.EBILLING_PORTAL_URL || 'https://staging.billing-easy.net';

const BACKEND_URL = process.env.BACKEND_URL || 'https://twobn-market.onrender.com';
const FRONTEND_URL =
  process.env.FRONTEND_URL || 'https://2bn-market-55ud.vercel.app';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------
function getAuthHeader() {
  const { EBILLING_USERNAME, EBILLING_SHAREDKEY } = process.env;
  if (!EBILLING_USERNAME || !EBILLING_SHAREDKEY) {
    throw new Error(
      'Variables manquantes : EBILLING_USERNAME et/ou EBILLING_SHAREDKEY'
    );
  }
  const token = Buffer.from(`${EBILLING_USERNAME}:${EBILLING_SHAREDKEY}`).toString(
    'base64'
  );
  return `Basic ${token}`;
}

// Création à la demande : le serveur démarre même si la config Google est absente.
function getDrive() {
  const { GOOGLE_CLIENT_EMAIL, GOOGLE_PRIVATE_KEY } = process.env;
  if (!GOOGLE_CLIENT_EMAIL || !GOOGLE_PRIVATE_KEY) {
    throw new Error(
      'Variables manquantes : GOOGLE_CLIENT_EMAIL et/ou GOOGLE_PRIVATE_KEY'
    );
  }
  const auth = new google.auth.GoogleAuth({
    credentials: {
      client_email: GOOGLE_CLIENT_EMAIL,
      private_key: GOOGLE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    },
    scopes: ['https://www.googleapis.com/auth/drive.readonly'],
  });
  return google.drive({ version: 'v3', auth });
}

// Interroge directement Ebilling pour connaître l'état réel d'une facture.
async function fetchBillState(bill_id) {
  const response = await axios.get(`${EBILLING_BILL_URL}/${bill_id}`, {
    headers: {
      Authorization: getAuthHeader(),
      Accept: 'application/json',
    },
  });
  return response.data && response.data.e_bill ? response.data.e_bill.state : null;
}

// Marque une transaction comme payée (sans écraser si déjà complétée).
async function markCompleted(transaction) {
  if (transaction.status !== 'completed') {
    transaction.status = 'completed';
    transaction.paid_at = new Date();
    await transaction.save();
  }
}

// ---------------------------------------------------------------------------
// Création de la facture
// ---------------------------------------------------------------------------
router.post('/create-ebill', async (req, res) => {
  console.log('Route appelée');
  console.log('Body:', req.body);

  try {
    const { payer_msisdn, payer_email, amount, productId, productName } = req.body;

    const external_reference = `${productId}-${Date.now()}`;

    const payload = {
      payer_msisdn: payer_msisdn,
      payer_email: payer_email,
      amount: amount,
      currency: 'XAF',
      short_description: `Achat de ${productName}`,
      description: `Achat de ${productName}`,
      external_reference: external_reference,
      expiry_period: '60',
    };

    console.log('Envoi vers Ebilling:', payload);

    const response = await axios.post(EBILLING_BASE_URL, payload, {
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        Authorization: getAuthHeader(),
      },
    });

    console.log('Réponse Ebilling:', response.data);

    if (response.data.e_bill && response.data.e_bill.bill_id) {
      const bill_id = response.data.e_bill.bill_id;
      console.log('E-bill créé:', bill_id);

      await Transaction.create({
        productId: productId,
        userId: payer_email,
        ebill_id: bill_id,
        external_reference: external_reference,
        amount: amount,
        payer_msisdn: payer_msisdn,
        payer_email: payer_email,
        status: 'pending',
      });

      const payment_url = `${EBILLING_PORTAL_URL}/?invoice=${bill_id}&redirect_url=${BACKEND_URL}/api/payment/return`;

      console.log('URL de paiement:', payment_url);

      res.json({
        success: true,
        payment_url: payment_url,
        ebill_id: bill_id,
      });
    } else {
      throw new Error('Pas de bill_id dans la réponse');
    }
  } catch (error) {
    console.error('Erreur:', error.message);
    if (error.response) {
      console.error('Erreur API:', error.response.data);
    }
    res.status(500).json({
      success: false,
      error: error.message,
    });
  }
});

// ---------------------------------------------------------------------------
// Callback serveur-à-serveur d'Ebilling
// Le statut n'est jamais pris tel quel : on le revérifie auprès d'Ebilling.
// ---------------------------------------------------------------------------
router.post('/callback', async (req, res) => {
  console.log('Callback Ebilling reçu:', req.body);

  try {
    const { billingid } = req.body;

    if (!billingid) {
      console.log('Callback sans billingid');
      return res.status(200).json({ status: 'ignored' });
    }

    const dbTransaction = await Transaction.findOne({ ebill_id: billingid });

    if (!dbTransaction) {
      console.log('Transaction non trouvée pour bill_id:', billingid);
      return res.status(200).json({ status: 'received' });
    }

    const realState = await fetchBillState(billingid);

    if (realState === 'paid') {
      console.log('Paiement confirmé par Ebilling !');
      await markCompleted(dbTransaction);
      console.log('Transaction mise à jour:', dbTransaction._id);
    } else {
      console.log('Paiement non confirmé, state:', realState);
    }

    res.status(200).json({ status: 'received' });
  } catch (error) {
    console.error('Erreur callback:', error.message);
    res.status(200).json({ error: error.message });
  }
});

// ---------------------------------------------------------------------------
// Retour de l'utilisateur après paiement
// ---------------------------------------------------------------------------
router.get('/return', async (req, res) => {
  console.log('Retour utilisateur');
  console.log('Query params:', req.query);
  console.log('Full URL:', req.url);

  try {
    const bill_id = req.query.invoice || req.query.bill_id || req.query.bill;

    console.log('bill_id trouvé:', bill_id);

    if (bill_id) {
      try {
        const state = await fetchBillState(bill_id);
        console.log('Statut de la facture:', state);

        const transaction = await Transaction.findOne({ ebill_id: bill_id });

        if (transaction) {
          console.log('Transaction trouvée:', transaction.productId);

          if (state === 'paid') {
            await markCompleted(transaction);
            console.log('Transaction mise à jour via /return');
          }

          const paymentStatus =
            transaction.status === 'completed' ? 'success' : 'pending';
          return res.redirect(
            `${FRONTEND_URL}/product/${transaction.productId}?payment=${paymentStatus}`
          );
        } else {
          console.log('Transaction non trouvée pour bill_id:', bill_id);
        }
      } catch (apiError) {
        console.error('Erreur lors de la vérification du statut:', apiError.message);
      }
    } else {
      console.log('Aucun bill_id dans les query params');
    }

    res.redirect(`${FRONTEND_URL}/payment-success?completed=true`);
  } catch (error) {
    console.error('Erreur retour:', error);
    res.redirect(`${FRONTEND_URL}/payment-success?error=true`);
  }
});

// ---------------------------------------------------------------------------
// Vérification du paiement
// TODO : protéger cette route avec ton middleware d'authentification (JWT)
// et utiliser l'email du token au lieu de celui de l'URL.
// ---------------------------------------------------------------------------
router.get('/check-payment/:productId/:userEmail', async (req, res) => {
  try {
    const { productId } = req.params;
    const userEmail = decodeURIComponent(req.params.userEmail);

    const transaction = await Transaction.findOne({
      productId: productId,
      userId: userEmail,
      status: 'completed',
    });

    const downloadCount = transaction ? transaction.downloadCount || 0 : 0;

    res.json({
      hasPaid: !!transaction && downloadCount < 1,
      downloaded: downloadCount >= 1,
    });
  } catch (error) {
    console.error('Erreur vérification:', error);
    res.status(500).json({ error: error.message });
  }
});

// ---------------------------------------------------------------------------
// Conservée pour compatibilité avec le frontend : le compteur est désormais
// géré par /download, cette route ne modifie plus rien.
// ---------------------------------------------------------------------------
router.post('/mark-downloaded/:productId/:userEmail', (req, res) => {
  res.json({ success: true });
});

// ---------------------------------------------------------------------------
// Téléchargement (un seul téléchargement par achat)
// TODO : protéger cette route avec ton middleware d'authentification (JWT).
// ---------------------------------------------------------------------------
router.get('/download/:productId/:userEmail', async (req, res) => {
  let reserved = null; // transaction dont on a réservé le téléchargement

  const releaseDownload = async () => {
    if (!reserved) return;
    const id = reserved._id;
    reserved = null;
    try {
      await Transaction.updateOne({ _id: id }, { $inc: { downloadCount: -1 } });
      console.log('Téléchargement restitué pour la transaction', id);
    } catch (e) {
      console.error('Impossible de restituer le téléchargement:', e.message);
    }
  };

  try {
    const { productId } = req.params;
    const decodedEmail = decodeURIComponent(req.params.userEmail);

    // Réservation atomique : évite deux téléchargements simultanés.
    reserved = await Transaction.findOneAndUpdate(
      {
        productId: productId,
        userId: decodedEmail,
        status: 'completed',
        $or: [
          { downloadCount: { $lt: 1 } },
          { downloadCount: { $exists: false } },
        ],
      },
      { $inc: { downloadCount: 1 } },
      { new: true }
    );

    if (!reserved) {
      return res.status(403).json({ error: 'Accès refusé' });
    }

    const product = await Product.findById(productId);

    if (!product || !product.fileUrl) {
      await releaseDownload();
      return res.status(404).json({ error: 'Fichier introuvable' });
    }

    const match = product.fileUrl.match(/id=([a-zA-Z0-9_-]+)/);
    if (!match) {
      await releaseDownload();
      return res.status(400).json({ error: 'ID Drive invalide' });
    }
    const fileId = match[1];

    const drive = getDrive();

    const fileMeta = await drive.files.get({ fileId, fields: 'name, mimeType' });

    const safeName = encodeURIComponent(fileMeta.data.name);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${safeName}"; filename*=UTF-8''${safeName}`
    );
    res.setHeader('Content-Type', fileMeta.data.mimeType);

    const fileStream = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'stream' }
    );

    // Si le client coupe avant la fin, on lui rend son téléchargement.
    res.on('close', () => {
      if (!res.writableFinished) {
        releaseDownload();
      } else {
        reserved = null;
      }
    });

    fileStream.data.on('error', async (err) => {
      console.error('Erreur stream Drive:', err.message);
      await releaseDownload();
      if (!res.headersSent) {
        res.status(500).json({ error: 'Erreur lors du téléchargement' });
      } else {
        res.destroy(err);
      }
    });

    fileStream.data.pipe(res);
  } catch (error) {
    console.error('Erreur download:', error);
    await releaseDownload();
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    }
  }
});

module.exports = router;