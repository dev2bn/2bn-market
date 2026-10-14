import { Box, Button, TextField, Typography } from '@mui/material';

export default function FilesEditor({ files = [], onChange, disabled }) {
    const update = (i, field, value) =>
        onChange(files.map((f, idx) => (idx === i ? { ...f, [field]: value } : f)));

    const add = () => onChange([...files, { name: '', description: '', image: '' }]);

    const remove = (i) => onChange(files.filter((_, idx) => idx !== i));

    const move = (i, dir) => {
        const j = i + dir;
        if (j < 0 || j >= files.length) return;
        const copy = [...files];
        [copy[i], copy[j]] = [copy[j], copy[i]];
        onChange(copy);
    };

    return (
        <Box sx={{ marginTop: 2, marginBottom: 2, padding: 2, border: '1px solid #ddd', borderRadius: '4px' }}>
            <h4 style={{ marginTop: 0 }}>Fichiers du pack (carousel)</h4>
            <Typography sx={{ fontSize: '0.85rem', color: '#666', mb: 2 }}>
                Une carte par fichier. Image vide = placeholder blanc. Pour une vraie image, colle l'URL depuis la bibliothèque médias.
            </Typography>

            {files.map((f, i) => (
                <Box key={i} sx={{ border: '1px solid #eee', borderRadius: '4px', p: 2, mb: 2 }}>
                    <TextField
                        fullWidth size="small" label={`Nom du fichier ${i + 1}`}
                        value={f.name || ''}
                        onChange={(e) => update(i, 'name', e.target.value)}
                        disabled={disabled} sx={{ mb: 1 }}
                    />
                    <TextField
                        fullWidth size="small" label="Description du fichier"
                        value={f.description || ''}
                        onChange={(e) => update(i, 'description', e.target.value)}
                        disabled={disabled} multiline rows={2} sx={{ mb: 1 }}
                    />
                    <TextField
                        fullWidth size="small" label="URL de l'image (optionnel)"
                        value={f.image || ''}
                        onChange={(e) => update(i, 'image', e.target.value)}
                        disabled={disabled}
                        placeholder="https://res.cloudinary.com/..."
                    />
                    <Box sx={{ mt: 1 }}>
                        <Button size="small" onClick={() => move(i, -1)} disabled={disabled || i === 0}>↑</Button>
                        <Button size="small" onClick={() => move(i, 1)} disabled={disabled || i === files.length - 1}>↓</Button>
                        <Button size="small" color="error" onClick={() => remove(i)} disabled={disabled}>Supprimer</Button>
                    </Box>
                </Box>
            ))}

            <Button variant="outlined" size="small" onClick={add} disabled={disabled}>
                + Ajouter un fichier
            </Button>
        </Box>
    );
}