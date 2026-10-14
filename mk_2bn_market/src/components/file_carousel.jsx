import { useState } from 'react';
import { Box } from '@mui/material';

export default function FileCarousel({ images = [], alt = '', getImagePath = (p) => p }) {
    const list = images.filter(Boolean).map(getImagePath);
    const [active, setActive] = useState(0);

    if (list.length === 0) return null;
    const current = list[Math.min(active, list.length - 1)];

    return (
        <Box>
            {/* Image principale */}
            <Box sx={{ borderRadius: '16px', overflow: 'hidden', background: '#f5f5f5' }}>
                <img
                    src={current}
                    alt={alt}
                    style={{ width: '100%', aspectRatio: '3 / 2', objectFit: 'contain', display: 'block' }}
                />
            </Box>

            {/* Miniatures sous l'image */}
            {list.length > 1 && (
                <Box sx={{ display: 'flex', gap: '10px', marginTop: '12px', overflowX: 'auto', paddingBottom: '4px' }}>
                    {list.map((src, i) => (
                        <img
                            key={i}
                            src={src}
                            alt={`${alt} ${i + 1}`}
                            onClick={() => setActive(i)}
                            style={{
                                width: 80,
                                height: 60,
                                flexShrink: 0,
                                objectFit: 'cover',
                                borderRadius: 8,
                                cursor: 'pointer',
                                border: i === active ? '2px solid #022a5e' : '2px solid transparent',
                                opacity: i === active ? 1 : 0.7
                            }}
                        />
                    ))}
                </Box>
            )}
        </Box>
    );
}