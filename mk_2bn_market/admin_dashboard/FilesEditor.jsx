import { useRef, useState } from 'react';
import { Box, Button, TextField, Typography, LinearProgress } from '@mui/material';
import { API_URL } from '../src/config/api';

export default function FilesEditor({ files = [], onChange, disabled }) {
    const [uploadingIndex, setUploadingIndex] = useState(null);
    const [uploadError, setUploadError] = useState('');

    // Toujours la dernière version de files, même après un upload asynchrone
    const filesRef = useRef(files);
    filesRef.current = files;

    const update = (i, field, value) =>
        onChange(filesRef.current.map((f, idx) => (idx === i ? { ...f, [field]: value } : f)));

    const add = () => onChange([...files, { name: '', description: '', image: '' }]);
    const remove = (i) => onChange(files.filter((_, idx) => idx !== i));

    const move = (i, dir) => {
        const j = i + dir;
        if (j < 0 || j >= files.length) return;
        const copy = [...files];
        [copy[i], copy[j]] = [copy[j], copy[i]];
        onChange(copy);
    };

    const handleImageUpload = async (i, e) => {
        const file = e.target.files[0];
        e.target.value = '';
        if (!file) return;

        setUploadingIndex(i);
        setUploadError('');

        try {
            const formData = new FormData();
            formData.append('category', 'Images');
            formData.append('file', file);

            const response = await fetch(`${API_URL}/api/upload`, {
                method: 'POST',
                body: formData
            });
            const data = await response.json();

            if (!data.success) throw new Error(data.error || 'Erreur upload image');
            update(i, 'image', data.fileUrl);
        } catch (err) {
            setUploadError(err.message);
        } finally {
            setUploadingIndex(null);
        }
    };

    const busy = disabled || uploadingIndex !== null;

    return (
        <Box sx={{ marginTop: 2, marginBottom: 2, padding: 2, border: '1px solid #ddd', borderRadius: '4px' }}>
            <h4 style={{ marginTop: 0 }}>Images du pack (carousel)</h4>
            <Typography sx={{ fontSize: '0.85rem', color: '#666', mb: 2 }}>
                Une carte par aperçu. Image vide = placeholder blanc. Les images sont réduites automatiquement à 1536 × 1024 maximum.
            </Typography>

            {files.map((f, i) => (
                <Box key={i} sx={{ border: '1px solid #eee', borderRadius: '4px', p: 2, mb: 2 }}>
                    <TextField
                        fullWidth size="small" label={`Nom du fichier ${i + 1}`}
                        value={f.name || ''}
                        onChange={(e) => update(i, 'name', e.target.value)}
                        disabled={busy} sx={{ mb: 1 }}
                    />
                    <TextField
                        fullWidth size="small" label="Description du fichier"
                        value={f.description || ''}
                        onChange={(e) => update(i, 'description', e.target.value)}
                        disabled={busy} multiline rows={2} sx={{ mb: 1 }}
                    />

                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        {f.image ? (
                            <img
                                src={f.image} alt="aperçu"
                                style={{ width: 90, height: 60, objectFit: 'cover', borderRadius: 4, border: '1px solid #ddd' }}
                            />
                        ) : (
                            <Box sx={{ width: 90, height: 60, background: '#fff', border: '1px dashed #ccc', borderRadius: '4px' }} />
                        )}

                        <input
                            accept="image/*" type="file" id={`files-editor-img-${i}`}
                            style={{ display: 'none' }}
                            onChange={(e) => handleImageUpload(i, e)}
                            disabled={busy}
                        />
                        <label htmlFor={`files-editor-img-${i}`}>
                            <Button variant="outlined" size="small" component="span" disabled={busy}>
                                {uploadingIndex === i ? '📤 Upload...' : '🖼️ Uploader une image'}
                            </Button>
                        </label>

                        {f.image && (
                            <Button size="small" onClick={() => update(i, 'image', '')} disabled={busy}>
                                Retirer l'image
                            </Button>
                        )}
                    </Box>

                    {uploadingIndex === i && <LinearProgress sx={{ mt: 1 }} />}

                    <Box sx={{ mt: 1 }}>
                        <Button size="small" onClick={() => move(i, -1)} disabled={busy || i === 0}>↑</Button>
                        <Button size="small" onClick={() => move(i, 1)} disabled={busy || i === files.length - 1}>↓</Button>
                        <Button size="small" color="error" onClick={() => remove(i)} disabled={busy}>Supprimer</Button>
                    </Box>
                </Box>
            ))}

            {uploadError && <Box sx={{ color: 'red', mb: 1, fontSize: '0.85rem' }}>{uploadError}</Box>}

            <Button variant="outlined" size="small" onClick={add} disabled={busy}>
                + Ajouter une image
            </Button>
        </Box>
    );
}