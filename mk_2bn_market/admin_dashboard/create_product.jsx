import { Box, Button, TextField, MenuItem, LinearProgress, Typography, Stepper, Step, StepLabel } from '@mui/material';
import { useState } from 'react';
import { createProduct } from './services/productService';
import SideMenu from './services/side_menu';
import FilesEditor from './FilesEditor';
import { API_URL } from '../src/config/api';
import './dashboard.css';

const STEPS = ['Aperçu', 'Fiche produit', 'Fichier payant'];

export default function CreateProduct() {
    const [step, setStep] = useState(0);
    const [image, setImage] = useState('');
    const [imagePreview, setImagePreview] = useState('');
    const [uploadPicture, setUploadPicture] = useState(false);
    const [name, setName] = useState('');
    const [description, setDescription] = useState('');
    const [content, setContent] = useState('');
    const [price, setPrice] = useState('');
    const [categories, setCategories] = useState('');
    const [fileUrl, setFileUrl] = useState('');
    const [files, setFiles] = useState([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const categoriesOptions = [
        { label: 'Xls', value: 'documents', id: 'xls' },
        { label: 'Documents', value: 'documents', id: 'doc' },
        { label: 'Vidéos', value: 'Media', id: 'media' },
        { label: 'Word', value: 'documents', id: 'word' },
        { label: 'Formations', value: 'formations', id: 'form' },
        { label: 'Outils', value: 'outils', id: 'outils' },
    ];

    const convertDriveUrl = (url) => {
        const match = url.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
        if (match) {
            return `https://drive.google.com/uc?export=download&id=${match[1]}`;
        }
        return url;
    };

    const handleImageUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        setUploadPicture(true);
        setError('');
        setImagePreview(URL.createObjectURL(file));

        try {
            const formData = new FormData();
            formData.append('category', 'Images');
            formData.append('file', file);

            const response = await fetch(`${API_URL}/api/upload`, { method: 'POST', body: formData });
            const data = await response.json();

            if (data.success) {
                setImage(data.fileUrl);
                setImagePreview(data.fileUrl);
            } else {
                throw new Error(data.error || 'Erreur upload image');
            }
        } catch (err) {
            setError(err.message);
            setImagePreview('');
        } finally {
            setUploadPicture(false);
        }
    };

    const validateStep = () => {
        if (step === 0 && !image) {
            setError("L'image du produit est obligatoire");
            return false;
        }
        setError('');
        return true;
    };

    const goBack = () => {
        setError('');
        setStep((s) => Math.max(0, s - 1));
    };

    const resetForm = () => {
        setImage('');
        setImagePreview('');
        setName('');
        setDescription('');
        setContent('');
        setPrice('');
        setCategories('');
        setFileUrl('');
        setFiles([]);
        setStep(0);
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (!validateStep()) return;

        if (step < STEPS.length - 1) {
            setStep(step + 1);
            return;
        }

        setLoading(true);
        try {
            await createProduct({
                image,
                name,
                description,
                content,
                price,
                categories,
                fileUrl,
                files: files.filter((f) => f.image)
            });
            resetForm();
            alert('Produit créé avec succès ! ✅');
        } catch (err) {
            setError(err.message || 'Erreur lors de la création');
        } finally {
            setLoading(false);
        }
    };

    const isLast = step === STEPS.length - 1;
    const categoryLabel = categoriesOptions.find((o) => o.value === categories)?.label || categories;

    return (
        <Box className="create_product_container">
            <SideMenu />
            <Box className="create_product_form">
                <h2>Créer un nouveau produit</h2>

                <Stepper activeStep={step} sx={{ marginBottom: 1 }}>
                    {STEPS.map((label) => (
                        <Step key={label}>
                            <StepLabel>{label}</StepLabel>
                        </Step>
                    ))}
                </Stepper>

                <form className="form" onSubmit={handleSubmit}>

                    {/* ÉTAPE 1 : aperçu liste (image à gauche, champs à droite) */}
                    {step === 0 && (
                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '240px 1fr' }, gap: 3 }}>

                            <Box>
                                <Box sx={{
                                    width: '100%', aspectRatio: '1 / 1', border: '1px dashed #bbb', borderRadius: '8px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    overflow: 'hidden', background: '#fafafa'
                                }}>
                                    {imagePreview
                                        ? <img src={imagePreview} alt="aperçu" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        : <Typography sx={{ color: '#999', fontSize: '0.85rem', textAlign: 'center', p: 1 }}>
                                            Image du produit *
                                        </Typography>}
                                </Box>

                                <input accept="image/*" style={{ display: 'none' }} id="image-upload" type="file"
                                    onChange={handleImageUpload} disabled={uploadPicture} />
                                <label htmlFor="image-upload">
                                    <Button variant="outlined" component="span" fullWidth size="small"
                                        disabled={uploadPicture || loading} sx={{ marginTop: 1 }}>
                                        {uploadPicture ? '📤 Upload...' : '🖼️ Uploader'}
                                    </Button>
                                </label>
                                {uploadPicture && <LinearProgress sx={{ marginTop: 1 }} />}

                                <TextField fullWidth size="small" label="ou coller une URL" value={image}
                                    onChange={(e) => { setImage(e.target.value); setImagePreview(e.target.value); }}
                                    sx={{ marginTop: 1 }} disabled={uploadPicture || loading} />
                            </Box>

                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <TextField fullWidth size="small" label="Nom du produit" value={name}
                                    onChange={(e) => setName(e.target.value)} disabled={loading} required />

                                <TextField fullWidth size="small" label="Description du produit" multiline rows={3}
                                    value={description} onChange={(e) => setDescription(e.target.value)}
                                    disabled={loading} required />

                                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                                    <TextField fullWidth size="small" label="Catégorie" select value={categories}
                                        onChange={(e) => setCategories(e.target.value)} disabled={loading} required>
                                        {categoriesOptions.map((option) => (
                                            <MenuItem key={option.id} value={option.value}>{option.label}</MenuItem>
                                        ))}
                                    </TextField>
                                    <TextField fullWidth size="small" label="Prix (XAF)" value={price}
                                        onChange={(e) => setPrice(e.target.value)} disabled={loading} required />
                                </Box>
                            </Box>
                        </Box>
                    )}

                    {/* ÉTAPE 2 : fiche produit */}
                    {step === 1 && (
                        <>
                            <TextField fullWidth size="small" label="Description du contenu du produit"
                                multiline rows={5} value={content} onChange={(e) => setContent(e.target.value)}
                                disabled={loading} required
                                helperText="Visible sur la fiche produit. Utilise des retours à la ligne pour aérer le texte." />

                            <FilesEditor files={files} onChange={setFiles} disabled={loading} />
                        </>
                    )}

                    {/* ÉTAPE 3 : fichier payant + récapitulatif */}
                    {step === 2 && (
                        <>
                            <TextField fullWidth size="small" label="URL du fichier payant (Google Drive)"
                                value={fileUrl} onChange={(e) => setFileUrl(convertDriveUrl(e.target.value))}
                                disabled={loading} required placeholder="Colle ton lien Google Drive ici"
                                helperText={fileUrl ? '✅ Lien prêt au téléchargement' : 'Jamais visible du public'} />

                            <Box sx={{ marginTop: 2, padding: 2, border: '1px solid #ddd', borderRadius: '4px', background: '#fafafa' }}>
                                <h4 style={{ marginTop: 0 }}>Récapitulatif</h4>
                                <Box sx={{ display: 'flex', gap: 2, alignItems: 'flex-start' }}>
                                    {imagePreview && (
                                        <img src={imagePreview} alt="produit"
                                            style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 4 }} />
                                    )}
                                    <Box sx={{ fontSize: '0.9rem', lineHeight: 1.6 }}>
                                        <div><strong>{name}</strong></div>
                                        <div>{categoryLabel} · {price} XAF</div>
                                        <div>{files.filter((f) => f.image).length} image(s) dans le carousel</div>
                                    </Box>
                                </Box>
                            </Box>
                        </>
                    )}

                    {error && <Box sx={{ color: 'red', marginTop: '10px' }}>{error}</Box>}

                    <Box sx={{
                        display: 'flex', gap: 2, marginTop: 2,
                        position: 'sticky', bottom: 0, background: '#fff', padding: '10px 0'
                    }}>
                        {step > 0 && (
                            <Button type="button" variant="outlined" onClick={goBack} disabled={loading} sx={{ flex: 1 }}>
                                Précédent
                            </Button>
                        )}
                        <Button className="basket_button" type="submit" variant="contained"
                            disabled={loading || uploadPicture} sx={{ flex: 2 }}>
                            {isLast ? (loading ? 'Création...' : 'Ajouter le produit') : 'Suivant'}
                        </Button>
                    </Box>
                </form>
            </Box>
        </Box>
    );
}