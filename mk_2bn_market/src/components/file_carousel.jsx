import { useState } from 'react';
import { Box, Button } from '@mui/material';

export default function FileCarousel({ files = [], getImagePath = (p) => p }) {
    const [index, setIndex] = useState(0);
    if (!files.length) return null;

    const current = files[index];
    const prev = () => setIndex(i => (i - 1 + files.length) % files.length);
    const next = () => setIndex(i => (i + 1) % files.length);

    return (
        <Box sx={{ width: '100%' }}>
            <Box sx={{ position: 'relative' }}>
                {current.image ? (
                    <img
                        src={getImagePath(current.image)}
                        alt={current.name}
                        style={{ width: '100%', aspectRatio: '16 / 9', objectFit: 'cover', display: 'block' }}
                    />
                ) : (
                    <Box sx={{ width: '100%', aspectRatio: '16 / 9', background: '#fff', border: '1px solid #ddd' }} />
                )}

                {files.length > 1 && (
                    <>
                        <Button onClick={prev} aria-label="Précédent"
                            sx={{ position: 'absolute', left: 0, top: '50%', transform: 'translateY(-50%)', minWidth: 40, fontSize: 28 }}>
                            ‹
                        </Button>
                        <Button onClick={next} aria-label="Suivant"
                            sx={{ position: 'absolute', right: 0, top: '50%', transform: 'translateY(-50%)', minWidth: 40, fontSize: 28 }}>
                            ›
                        </Button>
                    </>
                )}
            </Box>

            <Box sx={{ mt: 2 }}>
                <strong>{current.name}</strong>
                <p style={{ margin: '6px 0 0' }}>{current.description}</p>
            </Box>

            <Box sx={{ display: 'flex', justifyContent: 'center', gap: 1, mt: 2 }}>
                {files.map((_, i) => (
                    <Box key={i} onClick={() => setIndex(i)}
                        sx={{ width: 10, height: 10, borderRadius: '50%', cursor: 'pointer',
                              background: i === index ? '#333' : '#ccc' }} />
                ))}
            </Box>
        </Box>
    );
}