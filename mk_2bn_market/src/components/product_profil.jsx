import {
    Box, Button, Alert, Dialog, DialogTitle, DialogContent, IconButton, Typography, useMediaQuery, useTheme
} from '@mui/material';
import { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import { getProductById } from './services/productServices';
import { API_URL } from '../config/api';
import PaymentForm from './checkout/ebilling_paiement';
import FileCarousel from './file_carousel';
import '../custome.css';

export default function Product_profil() {

    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const theme = useTheme();
    const fullScreen = useMediaQuery(theme.breakpoints.down('sm'));

    const [productProfil, setProductProfil] = useState(null);
    const [profilLoading, setProfilLoading] = useState(true);
    const [paymentOpen, setPaymentOpen] = useState(false); // modal de paiement
    const [hasPaid, setHasPaid] = useState(false);
    const [userEmail, setUserEmail] = useState('');
    const [showSuccessMessage, setShowSuccessMessage] = useState(false);

    useEffect(() => {
        getProductById(id).then(data => {
            setProductProfil(data);
            setProfilLoading(false);
        });

        if (searchParams.get('payment') === 'success') {
            setShowSuccessMessage(true);
            setTimeout(() => setShowSuccessMessage(false), 10000);
        }
    }, [id, searchParams]);

    useEffect(() => {
        const checkPayment = async () => {
            const alreadyDownloaded = localStorage.getItem(`downloaded_${id}`);
            if (alreadyDownloaded) {
                setHasPaid(false);
                return;
            }

            const email = localStorage.getItem('userEmail');
            if (email && id) {
                setUserEmail(email);
                try {
                    const response = await fetch(`${API_URL}/api/payment/check-payment/${id}/${email}`);
                    const data = await response.json();

                    if (data.downloaded) {
                        localStorage.setItem(`downloaded_${id}`, 'true');
                        setHasPaid(false);
                    } else {
                        setHasPaid(data.hasPaid);
                    }
                } catch (error) {
                    console.error('Erreur vérification paiement:', error);
                }
            }
        };

        if (!profilLoading) {
            checkPayment();

            if (showSuccessMessage) {
                const interval = setInterval(checkPayment, 3000);
                return () => clearInterval(interval);
            }
        }
    }, [id, profilLoading, showSuccessMessage]);

    if (profilLoading) return <div>Chargement de la fiche de produit...</div>;
    if (!productProfil) return <div>Produit non trouvé</div>;

    const getImagePath = (imagePath) => {
        if (!imagePath) return '';
        if (imagePath.startsWith('../')) return imagePath;
        if (imagePath.startsWith('./')) return imagePath.replace(/^\.\//, '../');
        if (imagePath.startsWith('img/')) return `../${imagePath}`;
        return imagePath;
    };

    const handleDownload = () => {
        if (productProfil.hasFile) {
            const email = localStorage.getItem('userEmail');
            window.location.href = `${API_URL}/api/payment/download/${id}/${encodeURIComponent(email)}`;
        } else {
            alert('Aucun fichier disponible pour ce produit');
        }
    };

    // Le bloc "Contenu" est masqué s'il est vide ou identique à la description
    const showContent =
        productProfil.content &&
        productProfil.content.trim() !== (productProfil.description || '').trim();

    return (
        <>
            <Box className="product_profil_container"
                sx={{
                    display: 'flex',
                    flexDirection: { xs: 'column', md: 'row' },
                    gap: { xs: '20px', md: '40px' },
                    padding: { xs: '20px', md: '30px 80px' },
                    overflowX: 'hidden'
                }}>

                {/* Gauche : image du produit + miniatures */}
                <Box className="profil_product_container_img" sx={{
                    color: 'black',
                    flex: 1,
                    // Mobile : annule le padding de 20px du conteneur => image pleine largeur
                    margin: { xs: '-20px -20px 0', md: 0 },
                    width: { xs: 'calc(100% + 40px)', md: 'auto' },
                    maxWidth: { xs: 'none', md: '100%' },
                    '& img': { maxWidth: '100%' }
                }}>
                    <FileCarousel
                        images={[productProfil.image, ...(productProfil.files || []).map(f => f.image)]}
                        alt={productProfil.name}
                        getImagePath={getImagePath}
                    />
                </Box>

                {/* Droite : nom, description, prix, paiement */}
                <Box sx={{ flex: 1 }}>
                    <div className="profil_product_container_details">
                        {showSuccessMessage && (
                            <Alert severity="success" sx={{ marginBottom: 3 }}>
                                Paiement réussi ! {hasPaid ? 'Vous pouvez maintenant télécharger le fichier.' : 'Vérification en cours...'}
                            </Alert>
                        )}

                        <Typography component="h2" sx={{ fontSize: { xs: 24, md: 32 }, color: 'text.primary', fontWeight: 600, lineHeight: 1.25, mb: 1.5 }}>
                            {productProfil.name}
                        </Typography>

                        <Typography sx={{ fontSize: { xs: 15, md: 17 }, lineHeight: 1.6, color: 'text.secondary', mb: 2 }}>
                            {productProfil.description}
                        </Typography>

                        {showContent && (
                            <Box sx={{ mb: 3, color: 'black' }}>
                                <Typography component="h3" sx={{ fontSize: { xs: 17, md: 20 }, fontWeight: 600, mb: 1 }}>
                                    Contenu du produit
                                </Typography>
                                <Typography sx={{ fontSize: { xs: 14, md: 16 }, lineHeight: 1.6, color: 'text.secondary', whiteSpace: 'pre-line' }}>
                                    {productProfil.content}
                                </Typography>
                            </Box>
                        )}

                        <Typography sx={{
                            textAlign: 'center', fontWeight: 700, fontSize: 17,
                            color: '#fff', bgcolor: '#0a2a669d', borderRadius: 1, py: 1.2, mb: 2
                        }}>
                            {productProfil.price} XAF
                        </Typography>

                        {!hasPaid && (
                            <Button className="basket_button" variant="contained" fullWidth
                                onClick={() => setPaymentOpen(true)} sx={{ marginTop: 3, padding: '12px' }}>
                                Effectuer le paiement
                            </Button>
                        )}

                        {hasPaid && productProfil.hasFile && (
                            <Button
                                className="basket_button_validate"
                                variant="contained"
                                color="success"
                                onClick={handleDownload}
                                sx={{ marginTop: 3 }}
                            >
                                Télécharger le fichier
                            </Button>
                        )}

                        {hasPaid && !productProfil.hasFile && (
                            <Box sx={{ marginTop: 3, color: 'orange' }}>
                                Paiement confirmé mais aucun fichier disponible
                            </Box>
                        )}

                        {showSuccessMessage && !hasPaid && (
                            <Box sx={{ marginTop: 3, color: 'blue' }}>
                                Vérification du paiement en cours...
                            </Box>
                        )}
                    </div>
                </Box>
            </Box>

            {/* Modal de paiement : formulaire (puis redirection vers Ebilling) */}
            <Dialog
                open={paymentOpen}
                onClose={() => setPaymentOpen(false)}
                fullWidth
                maxWidth="sm"
                fullScreen={fullScreen}
            >
                <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    Paiement
                    <IconButton aria-label="Fermer" onClick={() => setPaymentOpen(false)}>
                        ✕
                    </IconButton>
                </DialogTitle>
                <DialogContent dividers>
                    {/* Remonté à chaque ouverture => le formulaire repart de zéro */}
                    {paymentOpen && (
                        <PaymentForm product={productProfil} />
                    )}
                </DialogContent>
            </Dialog>
        </>
    );
}