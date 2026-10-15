import {
    Box, Button, CircularProgress, Typography, Snackbar, Alert,
    TextField, List, ListItemButton, ListItemText, Checkbox, MenuItem, Select
} from '@mui/material';
import { useState, useEffect, useRef, useCallback } from 'react';
import SideMenu from './services/side_menu';
import { API_URL } from '../src/config/api';
import './dashboard.css';

const MEDIA_API = `${API_URL}/api/cloudinary`;
const ROOT = '__root__';

export default function MediaLibrary() {
    const [folders, setFolders] = useState([]);
    const [current, setCurrent] = useState('');
    const [newFolder, setNewFolder] = useState('');
    const [images, setImages] = useState([]);
    const [loading, setLoading] = useState(true);
    const [uploading, setUploading] = useState(false);
    const [copiedUrl, setCopiedUrl] = useState('');
    const [selectMode, setSelectMode] = useState(false);
    const [selected, setSelected] = useState([]);
    const [target, setTarget] = useState('');
    const [moving, setMoving] = useState(false);
    const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
    const fileInputRef = useRef();

    const showSnackbar = (message, severity = 'success') =>
        setSnackbar({ open: true, message, severity });

    const fetchFolders = useCallback(async () => {
        try {
            const res = await fetch(`${MEDIA_API}/folders`);
            const data = await res.json();
            setFolders(data.folders || []);
        } catch {
            showSnackbar('Erreur lors du chargement des dossiers', 'error');
        }
    }, []);

    const fetchImages = useCallback(async (folder) => {
        setLoading(true);
        try {
            const url = `${MEDIA_API}/images${folder ? `?folder=${encodeURIComponent(folder)}` : ''}`;
            const res = await fetch(url);
            const data = await res.json();
            setImages(data.images || []);
        } catch {
            showSnackbar('Erreur lors du chargement des images', 'error');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => { fetchFolders(); }, [fetchFolders]);
    useEffect(() => {
        setSelected([]);
        fetchImages(current);
    }, [current, fetchImages]);

    const createFolder = async () => {
        if (!newFolder.trim()) return;
        try {
            const res = await fetch(`${MEDIA_API}/folders`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name: newFolder }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Erreur');
            setNewFolder('');
            await fetchFolders();
            setCurrent(data.name);
            showSnackbar(`Dossier « ${data.name} » créé`);
        } catch (err) {
            showSnackbar(err.message, 'error');
        }
    };

    const handleUpload = async (e) => {
        const files = Array.from(e.target.files);
        e.target.value = '';
        if (files.length === 0) return;

        setUploading(true);
        try {
            const formData = new FormData();
            formData.append('category', 'Images');
            if (current) formData.append('folder', current);
            files.forEach((f) => formData.append('file', f));

            const res = await fetch(`${API_URL}/api/upload`, { method: 'POST', body: formData });
            const data = await res.json();
            if (!data.success) throw new Error(data.error || 'Erreur upload');

            showSnackbar(`${files.length} image(s) uploadée(s) !`);
            fetchImages(current);
        } catch (err) {
            showSnackbar(err.message || 'Erreur upload', 'error');
        } finally {
            setUploading(false);
        }
    };

    const handleCopy = (url) => {
        navigator.clipboard.writeText(url);
        setCopiedUrl(url);
        showSnackbar('URL copiée ! Tu peux la coller dans "Créer un produit"');
        setTimeout(() => setCopiedUrl(''), 2000);
    };

    const toggleSelect = (id) =>
        setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

    const exitSelectMode = () => {
        setSelectMode(false);
        setSelected([]);
    };

    const handleMove = async () => {
        if (selected.length === 0 || !target) return;
        setMoving(true);
        try {
            const res = await fetch(`${MEDIA_API}/move`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    public_ids: selected,
                    folder: target === ROOT ? '' : target,
                }),
            });
            const data = await res.json();
            if (!res.ok) throw new Error(data.error || 'Erreur');

            if (data.failed?.length) {
                showSnackbar(`${data.moved} déplacée(s), ${data.failed.length} échec(s) (nom déjà pris ?)`, 'warning');
            } else {
                showSnackbar(`${data.moved} image(s) déplacée(s)`);
            }
            setSelected([]);
            await fetchImages(current);
        } catch (err) {
            showSnackbar(err.message, 'error');
        } finally {
            setMoving(false);
        }
    };

    const allSelected = images.length > 0 && selected.length === images.length;

    return (
        <Box sx={{ display: 'flex' }}>
            <SideMenu />
            <Box className="media_library_container">

                {/* En-tête */}
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: 'black', mb: 2 }}>
                    <Typography variant="h5" fontWeight="bold">Bibliothèque médias</Typography>

                    <Box sx={{ display: 'flex', gap: 1 }}>
                        <input ref={fileInputRef} type="file" accept="image/*" multiple
                            style={{ display: 'none' }} onChange={handleUpload} />

                        <Button variant={selectMode ? 'contained' : 'outlined'} color={selectMode ? 'secondary' : 'primary'}
                            onClick={() => (selectMode ? exitSelectMode() : setSelectMode(true))}>
                            {selectMode ? 'Terminer' : 'Sélectionner'}
                        </Button>

                        <Button variant="contained" onClick={() => fileInputRef.current.click()}
                            disabled={uploading} sx={{ backgroundColor: '#1976d2' }}>
                            {uploading
                                ? <><CircularProgress size={16} sx={{ mr: 1, color: 'white' }} /> Upload en cours...</>
                                : `+ Ajouter des images${current ? ` dans « ${current} »` : ''}`}
                        </Button>
                    </Box>
                </Box>

                {/* Barre de déplacement */}
                {selectMode && (
                    <Box sx={{
                        display: 'flex', alignItems: 'center', gap: 2, mb: 2, p: 1.5,
                        border: '1px solid #cfe0f5', borderRadius: 1, background: '#f3f8ff', color: 'black'
                    }}>
                        <Checkbox size="small" checked={allSelected}
                            indeterminate={selected.length > 0 && !allSelected}
                            onChange={() => setSelected(allSelected ? [] : images.map((i) => i.public_id))} />
                        <Typography sx={{ fontSize: '0.9rem', minWidth: 140 }}>
                            {selected.length} sélectionnée(s)
                        </Typography>

                        <Select size="small" displayEmpty value={target}
                            onChange={(e) => setTarget(e.target.value)} sx={{ minWidth: 200 }}>
                            <MenuItem value="" disabled>Déplacer vers…</MenuItem>
                            <MenuItem value={ROOT}>Racine (sans dossier)</MenuItem>
                            {folders.map((f) => (
                                <MenuItem key={f.path} value={f.name}>{f.name}</MenuItem>
                            ))}
                        </Select>

                        <Button variant="contained" size="small" onClick={handleMove}
                            disabled={moving || selected.length === 0 || !target}>
                            {moving ? 'Déplacement...' : 'Déplacer'}
                        </Button>
                    </Box>
                )}

                <Box sx={{ display: 'flex', gap: 3, flex: 1, minHeight: 0 }}>

                    {/* Colonne dossiers */}
                    <Box sx={{ width: 220, flexShrink: 0, display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Box sx={{ display: 'flex', gap: 1 }}>
                            <TextField size="small" placeholder="Nouveau dossier" value={newFolder}
                                onChange={(e) => setNewFolder(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && createFolder()} />
                            <Button variant="contained" size="small" onClick={createFolder}>+</Button>
                        </Box>

                        <List dense sx={{ overflowY: 'auto', border: '1px solid #eee', borderRadius: 1, flex: 1 }}>
                            <ListItemButton selected={current === ''} onClick={() => setCurrent('')}>
                                <ListItemText primary="Toutes les images" sx={{ color: 'black' }} />
                            </ListItemButton>
                            {folders.map((f) => (
                                <ListItemButton key={f.path} selected={current === f.name} onClick={() => setCurrent(f.name)}>
                                    <ListItemText primary={f.name} sx={{ color: 'black' }} />
                                </ListItemButton>
                            ))}
                        </List>
                    </Box>

                    {/* Images */}
                    <Box sx={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column' }}>
                        <Typography sx={{ mb: 1, color: '#666', fontSize: '0.9rem' }}>
                            {current || 'Toutes les images'} ({images.length}) ·{' '}
                            {selectMode ? 'Clique sur les images à déplacer.' : 'Clique sur une image pour copier son URL.'}
                        </Typography>

                        <Box sx={{ flex: 1, overflowY: 'auto', pr: 1 }}>
                            {loading ? (
                                <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}>
                                    <CircularProgress />
                                </Box>
                            ) : images.length === 0 ? (
                                <Typography sx={{ color: '#999', textAlign: 'center', mt: 10 }}>
                                    Aucune image dans ce dossier. Ajoute-en !
                                </Typography>
                            ) : (
                                <Box sx={{
                                    display: 'grid',
                                    gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
                                    gap: '16px',
                                    paddingBottom: '20px',
                                }}>
                                    {images.map((img) => {
                                        const isSel = selected.includes(img.public_id);
                                        return (
                                            <Box
                                                key={img.public_id}
                                                onClick={() => (selectMode ? toggleSelect(img.public_id) : handleCopy(img.secure_url))}
                                                sx={{
                                                    position: 'relative',
                                                    cursor: 'pointer',
                                                    borderRadius: '8px',
                                                    overflow: 'hidden',
                                                    border: isSel || copiedUrl === img.secure_url
                                                        ? '3px solid #1976d2' : '3px solid transparent',
                                                    transition: 'all 0.2s',
                                                    '&:hover .overlay': { opacity: selectMode ? 0 : 1 },
                                                    '&:hover': { transform: 'scale(1.02)', boxShadow: '0 4px 20px rgba(0,0,0,0.15)' },
                                                }}
                                            >
                                                <img src={img.secure_url} alt={img.public_id}
                                                    style={{ width: '100%', height: '140px', objectFit: 'cover', display: 'block' }} />

                                                {selectMode && (
                                                    <Checkbox checked={isSel} size="small"
                                                        sx={{ position: 'absolute', top: 2, left: 2, background: 'rgba(255,255,255,0.85)', borderRadius: '4px', p: 0.5 }} />
                                                )}

                                                <Box className="overlay" sx={{
                                                    position: 'absolute', inset: 0,
                                                    backgroundColor: 'rgba(25, 118, 210, 0.75)',
                                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                    opacity: 0, transition: 'opacity 0.2s',
                                                }}>
                                                    <Typography sx={{ color: 'white', fontWeight: 'bold', fontSize: '0.85rem' }}>
                                                        {copiedUrl === img.secure_url ? '✅ Copié !' : '📋 Copier l\'URL'}
                                                    </Typography>
                                                </Box>
                                            </Box>
                                        );
                                    })}
                                </Box>
                            )}
                        </Box>
                    </Box>
                </Box>
            </Box>

            <Snackbar open={snackbar.open} autoHideDuration={3000}
                onClose={() => setSnackbar({ ...snackbar, open: false })}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
                <Alert severity={snackbar.severity} onClose={() => setSnackbar({ ...snackbar, open: false })}>
                    {snackbar.message}
                </Alert>
            </Snackbar>
        </Box>
    );
}