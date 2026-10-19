import { Box, Button, CircularProgress } from "@mui/material";
import { useState, useEffect, useRef } from "react";
import { useNavigate } from 'react-router-dom';
import { getProducts } from "./services/productServices";
import '../custome.css';

const PAGE_SIZE = 9;

export default function Products({ onAddToBasket }) {
    const navigate = useNavigate();
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [visibleCount, setVisibleCount] = useState(PAGE_SIZE);
    const sentinelRef = useRef(null);

    useEffect(() => {
        getProducts().then(data => {
            setProducts(data);
            setLoading(false);
        });
    }, []);

    const visibleProducts = products.slice(0, visibleCount);
    const hasMore = visibleCount < products.length;

    // Charge 9 produits de plus quand le repère approche de l'écran
    useEffect(() => {
        const el = sentinelRef.current;
        if (!el || !hasMore) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                if (entry.isIntersecting) setVisibleCount((c) => c + PAGE_SIZE);
            },
            { rootMargin: '200px' }
        );
        observer.observe(el);
        return () => observer.disconnect();
    }, [hasMore, visibleCount]);

    if (loading) return <div className="product_load">Chargement des produits...</div>;

    return (
        <Box className="products_container">
            <h2 aria-label="Documents" datatype="documents documents_word">Découvrez nos Produits</h2>
            <Box
                className="products_list"
                sx={{
                    marginTop: '20px',
                    display: 'flex',
                    flexWrap: 'wrap',
                    justifyContent: 'flex-start',
                    alignItems: 'stretch',
                    gap: '30px'
                }}
            >
                {visibleProducts.map(product => (
                    <div className="product_container" key={product._id}>
                        <div
                            className="product_img"
                            onClick={() => navigate(`/product/${product._id}`)}
                            style={{ cursor: 'pointer' }}
                        >
                            <img src={product.image} alt={product.name} width='100%' />
                        </div>
                        <div className="details_product">
                            <h3 className="title_product">{product.name}</h3>
                            <p className="price">{product.price}</p>
                            <p className="description">{product.description}</p>
                            <Button className="basket_button" onClick={() => onAddToBasket(product)}>
                                Mettre dans le panier
                            </Button>
                        </div>
                    </div>
                ))}
            </Box>

            {hasMore && (
                <Box ref={sentinelRef} sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress size={28} />
                </Box>
            )}
        </Box>
    )
}