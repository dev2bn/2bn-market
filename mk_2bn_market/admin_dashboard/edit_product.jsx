import {
    Box, Button, TextField, MenuItem, LinearProgress, Typography,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
    Dialog, DialogTitle, DialogContent, DialogActions, Tabs, Tab, Chip
} from '@mui/material';
import { useState, useEffect } from 'react';
import { getAllProducts, updateProduct, uploadFile } from './services/getAllProducts';
import SideMenu from './services/side_menu';
import FilesEditor from './FilesEditor';
import { API_URL } from '../src/config/api';
import './dashboard.css';

const CATEGORIES = [
    { label: 'Documents', value: 'documents' },
    { label: 'Vidéos', value: 'Media' },
    { label: 'Formations', value: 'formations' },
    { label: 'Outils', value: 'outils' },
];

const EMPTY_FORM = {
    name: '', price: '', description: '', content: '', image: '', categories: '', files: []
};

export default function EditProduct() {
    const [products, setProducts] = useState([]);
    const [editing, setEditing] = useState(null);      // produit en cours d'édition
    const [tab, setTab] = useState(0);
    const [formData, setFormData] = useState(EMPTY_FORM);
    const [selectedFile, setSelectedFile] = useState(null);
    const [uploadingImage, setUploadingImage] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => { loadProducts(); }, []);

    const loadProducts = async () => {
        const data = await getAllProducts();
        setProducts(data);
    };

    const set = (field) => (e) => setFormData((prev) => ({ ...prev, [field]: e.target.value }));

    const openEdit = (product) => {
        setEditing(product);
        setTab(0);
        setError('');
        setSelectedFile(null);
        setFormData({
            name: product.name || '',
            price: product.price || '',
            description: product.description || '',
            content: product.content || '',
            image: product.image || '',
            categories: product.categories || '',
            files: (product.files || []).map((f) => ({ image: f.image }))
        });
    };

    const closeEdit = () => {
        if (loading || uploadingImage) return;
        setEditing(null);
    };

    const handleImageChange = async (e) => {
        const file = e.target.files[0];
        e.target.value = '';
        if (!file) return;

        setUploadingImage(true);
        setError('');
        try {
            const fd = new FormData();
            fd.append('category', 'Images');
            fd.append('file', file);

            const response = await fetch(`${API_URL}/api/upload`, { method: 'POST', body: fd });
            const data = await response.json();
            if (!data.success) throw new Error(data.error || 'Erreur upload image');

            setFormData((prev) => ({ ...prev, image: data.fileUrl }));
        } catch (err) {
            setError('Erreur upload image : ' + err.message);
        } finally {
            setUploadingImage(false);
        }
    };

    const handleSave = async () => {
        if (!formData.image) { setTab(0); setError("L'image du produit est obligatoire"); return; }
        if (!formData.name.trim() || !formData.description.trim() || !formData.categories || !String(formData.price).trim()) {
            setTab(0); setError('Remplis le nom, la description, la catégorie et le prix'); return;
        }
        if (!formData.content.trim()) { setTab(1); setError('La description du contenu est obligatoire'); return; }

        setLoading(true);
        setError('');
        try {
            // fileUrl n'est envoyé que si un nouveau fichier payant est uploadé
            const updatedData = {
                ...formData,
                files: formData.files.filter((f) => f.image)
            };

            if (selectedFile) {
                const uploadResult = await uploadFile(selectedFile, formData.categories);
                updatedData.fileUrl = uploadResult.fileUrl;
            }

            await updateProduct(editing._id, updatedData);
            setEditing(null);
            await loadProducts();
        } catch (err) {
            console.error('Erreur:', err);
            setError('Erreur lors de la modification');
        } finally {
            setLoading(false);
        }
    };

    const categoryLabel = (value) => CATEGORIES.find((c) => c.value === value)?.label || value;
    const busy = loading || uploadingImage;

    // Si la catégorie du produit n'est pas dans la liste, on l'ajoute pour ne pas la perdre
    const categoryOptions = CATEGORIES.some((c) => c.value === formData.categories) || !formData.categories
        ? CATEGORIES
        : [...CATEGORIES, { label: formData.categories, value: formData.categories }];

    return (
        <Box>
            <SideMenu />
            <Box className="admin_edit_product_container">
                <h2>Modifier les produits</h2>

                    <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 'calc(100vh - 140px)', overflowY: 'auto' }} >
                        <Table size="small" stickyHeader>
                        <TableHead>
                            <TableRow>
                                <TableCell sx={{ width: 70 }}>Image</TableCell>
                                <TableCell>Nom</TableCell>
                                <TableCell>Catégorie</TableCell>
                                <TableCell>Prix</TableCell>
                                <TableCell align="center">Carousel</TableCell>
                                <TableCell align="center">Fichier</TableCell>
                                <TableCell align="right" />
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {products.map((product) => (
                                <TableRow key={product._id} hover>
                                    <TableCell>
                                        {product.image && (
                                            <img src={product.image} alt={product.name}
                                                style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 4, display: 'block' }} />
                                        )}
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>{product.name}</TableCell>
                                    <TableCell>{categoryLabel(product.categories)}</TableCell>
                                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{product.price} Fcfa</TableCell>
                                    <TableCell align="center">{product.files?.length || 0}</TableCell>
                                    <TableCell align="center">
                                        <Chip size="small" label={product.hasFile ? 'Oui' : 'Non'}
                                            color={product.hasFile ? 'success' : 'error'} variant="outlined" />
                                    </TableCell>
                                    <TableCell align="right">
                                        <Button size="small" variant="outlined" onClick={() => openEdit(product)}>
                                            Modifier
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </TableContainer>
            </Box>

            {/* Fenêtre d'édition */}
            <Dialog open={!!editing} onClose={closeEdit} fullWidth maxWidth="md">
                <DialogTitle sx={{ paddingBottom: 0 }}>
                    Modifier : {editing?.name}
                </DialogTitle>

                <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ px: 3, borderBottom: '1px solid #eee' }}>
                    <Tab label="Aperçu" />
                    <Tab label="Fiche produit" />
                    <Tab label="Fichier payant" />
                </Tabs>

                <DialogContent sx={{ minHeight: 360 }}>

                    {/* Onglet 1 : aperçu liste */}
                    {tab === 0 && (
                        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '200px 1fr' }, gap: 3, pt: 1 }}>
                            <Box>
                                <Box sx={{
                                    width: '100%', aspectRatio: '1 / 1', border: '1px dashed #bbb', borderRadius: '8px',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    overflow: 'hidden', background: '#fafafa'
                                }}>
                                    {formData.image
                                        ? <img src={formData.image} alt="aperçu" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                                        : <Typography sx={{ color: '#999', fontSize: '0.85rem' }}>Image du produit *</Typography>}
                                </Box>

                                <input accept="image/*" style={{ display: 'none' }} id="edit-image-upload"
                                    type="file" onChange={handleImageChange} disabled={busy} />
                                <label htmlFor="edit-image-upload">
                                    <Button variant="outlined" component="span" fullWidth size="small"
                                        disabled={busy} sx={{ marginTop: 1 }}>
                                        {uploadingImage ? '📤 Upload...' : '🖼️ Remplacer'}
                                    </Button>
                                </label>
                                {uploadingImage && <LinearProgress sx={{ marginTop: 1 }} />}

                                <TextField fullWidth size="small" label="ou coller une URL" value={formData.image}
                                    onChange={set('image')} sx={{ marginTop: 1 }} disabled={busy} />
                            </Box>

                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                                <TextField fullWidth size="small" label="Nom du produit" value={formData.name}
                                    onChange={set('name')} disabled={busy} required />
                                <TextField fullWidth size="small" label="Description du produit" multiline rows={3}
                                    value={formData.description} onChange={set('description')} disabled={busy} required />
                                <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2 }}>
                                    <TextField fullWidth size="small" label="Catégorie" select value={formData.categories}
                                        onChange={set('categories')} disabled={busy} required>
                                        {categoryOptions.map((o) => (
                                            <MenuItem key={o.value} value={o.value}>{o.label}</MenuItem>
                                        ))}
                                    </TextField>
                                    <TextField fullWidth size="small" label="Prix (XAF)" value={formData.price}
                                        onChange={set('price')} disabled={busy} required />
                                </Box>
                            </Box>
                        </Box>
                    )}

                    {/* Onglet 2 : fiche produit */}
                    {tab === 1 && (
                        <Box sx={{ pt: 1 }}>
                            <TextField fullWidth size="small" label="Description du contenu du produit"
                                multiline rows={5} value={formData.content} onChange={set('content')}
                                disabled={busy} required
                                helperText="Visible sur la fiche produit. Utilise des retours à la ligne pour aérer le texte." />
                            <FilesEditor
                                files={formData.files}
                                onChange={(files) => setFormData((prev) => ({ ...prev, files }))}
                                disabled={loading}
                            />
                        </Box>
                    )}

                    {/* Onglet 3 : fichier payant */}
                    {tab === 2 && (
                        <Box sx={{ pt: 1 }}>
                            <Box sx={{ marginBottom: 2, color: editing?.hasFile ? 'green' : 'red', fontSize: '0.9rem' }}>
                                {editing?.hasFile
                                    ? '✅ Un fichier est enregistré (n\'en choisis un nouveau que pour le remplacer)'
                                    : '❌ Aucun fichier enregistré'}
                            </Box>
                            <input type="file" onChange={(e) => setSelectedFile(e.target.files[0])} disabled={busy} />
                            {selectedFile && (
                                <Box sx={{ marginTop: 1, color: 'blue', fontSize: '0.85rem' }}>
                                    📎 Nouveau fichier : {selectedFile.name}
                                </Box>
                            )}
                        </Box>
                    )}

                    {error && <Box sx={{ color: 'red', marginTop: 2, fontSize: '0.9rem' }}>{error}</Box>}
                </DialogContent>

                <DialogActions sx={{ px: 3, pb: 2 }}>
                    <Button onClick={closeEdit} disabled={busy}>Annuler</Button>
                    <Button variant="contained" onClick={handleSave} disabled={busy}>
                        {loading ? 'Enregistrement...' : 'Enregistrer'}
                    </Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}