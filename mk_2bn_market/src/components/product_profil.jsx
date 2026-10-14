import { Box, Button, Alert } from '@mui/material';
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
    const [productProfil, setProductProfil] = useState(null);
    const [profilLoading, setProfilLoading] = useState(true);
    const [showPaymentForm, setShowPaymentForm] = useState(false);
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

    return (
        <Box className="product_profil_container"
            sx={{
                display: 'flex',
                flexDirection: { xs: 'column', md: 'row' },
                gap: '40px',
                padding: { xs: '20px', md: '30px 80px' }
            }}>

            {/* Gauche : carousel des fichiers (ou image seule si pas de files) */}
            <Box className="profil_product_container_img" sx={{ color: 'black', flex: 1 }}>
                {productProfil.files?.length > 0 ? (
                    <FileCarousel files={productProfil.files} getImagePath={getImagePath} />
                ) : (
                    <div className="profil_product_container">
                        <div className='product_banner'>
                            <img src={getImagePath(productProfil.image)} alt={productProfil.name} width='100%' />
                        </div>
                    </div>
                )}
            </Box>

            {/* Droite : description du pack, prix, paiement */}
            <Box sx={{ flex: 1 }}>
                <div className="profil_product_container_details">
                    {showSuccessMessage && (
                        <Alert severity="success" sx={{ marginBottom: 3 }}>
                            Paiement réussi ! {hasPaid ? 'Vous pouvez maintenant télécharger le fichier.' : 'Vérification en cours...'}
                        </Alert>
                    )}

                    <div className='product_title'><h2>{productProfil.name}</h2></div>
                    <div className='product_description'>{productProfil.description}</div><br />
                    <div className='product_content'>{productProfil.content}</div>
                    <div className='product_price'>{productProfil.price} XAF</div>

                    {!hasPaid && (
                        !showPaymentForm ? (
                            <Button className="basket_button" variant="contained" fullWidth
                                onClick={() => setShowPaymentForm(true)} sx={{ marginTop: 3, padding: '12px' }}>
                                Effectuer le paiement
                            </Button>
                        ) : (
                            <Box>
                                <PaymentForm product={productProfil} />
                                <Button fullWidth onClick={() => setShowPaymentForm(false)} sx={{ marginTop: 2 }}>
                                    Annuler
                                </Button>
                            </Box>
                        )
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
    );
}