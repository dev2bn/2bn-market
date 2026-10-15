import {
    Box, Button, Chip,
    Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper
} from "@mui/material";
import { useState, useEffect } from 'react';
import { getAllProducts, deleteProduct } from './services/productService';
import SideMenu from "./services/side_menu";
import './dashboard.css';

const CATEGORY_LABELS = {
    documents: 'Documents',
    Media: 'Vidéos',
    formations: 'Formations',
    outils: 'Outils',
};

export default function InventoryProduct() {
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        loadProducts();
    }, []);

    const loadProducts = async () => {
        setLoading(true);
        try {
            const data = await getAllProducts();
            setProducts(data);
        } catch (error) {
            alert('Erreur lors du chargement des produits');
        } finally {
            setLoading(false);
        }
    };

    const handleDelete = async (product) => {
        if (window.confirm(`Supprimer « ${product.name} » ? Cette action est définitive.`)) {
            setLoading(true);
            try {
                await deleteProduct(product._id);
                await loadProducts();
            } catch (error) {
                alert('Erreur lors de la suppression');
            } finally {
                setLoading(false);
            }
        }
    };

    const getImagePath = (imagePath) => {
        if (!imagePath) return '';
        if (imagePath.startsWith('../')) return imagePath;
        if (imagePath.startsWith('./')) return imagePath.replace(/^\.\//, '../');
        if (imagePath.startsWith('img/')) return `../${imagePath}`;
        return imagePath;
    };

    const formatPrice = (price) =>
        /fcfa/i.test(String(price)) ? price : `${price} Fcfa`;

    return (
        <Box className="admin_dashboard_service_container">
            <SideMenu />
            <Box className="delete_product_container">
                <h2>Inventaire des produits ({products.length})</h2>

                <TableContainer
                    component={Paper}
                    variant="outlined"
                    sx={{ maxHeight: 'calc(100vh - 140px)', overflowY: 'auto' }}
                >
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
                                            <img
                                                src={getImagePath(product.image)}
                                                alt={product.name}
                                                style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 4, display: 'block' }}
                                            />
                                        )}
                                    </TableCell>
                                    <TableCell sx={{ fontWeight: 600 }}>{product.name}</TableCell>
                                    <TableCell>{CATEGORY_LABELS[product.categories] || product.categories}</TableCell>
                                    <TableCell sx={{ whiteSpace: 'nowrap' }}>{formatPrice(product.price)}</TableCell>
                                    <TableCell align="center">{product.files?.length || 0}</TableCell>
                                    <TableCell align="center">
                                        <Chip
                                            size="small"
                                            label={product.hasFile ? 'Oui' : 'Non'}
                                            color={product.hasFile ? 'success' : 'error'}
                                            variant="outlined"
                                        />
                                    </TableCell>
                                    <TableCell align="right">
                                        <Button
                                            size="small"
                                            variant="outlined"
                                            color="error"
                                            onClick={() => handleDelete(product)}
                                            disabled={loading}
                                        >
                                            Supprimer
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}

                            {products.length === 0 && !loading && (
                                <TableRow>
                                    <TableCell colSpan={7} align="center" sx={{ py: 4, color: '#888' }}>
                                        Aucun produit en inventaire
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>

                {loading && <p>Chargement...</p>}
            </Box>
        </Box>
    );
}