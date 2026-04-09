import React, { useState, useEffect, useMemo } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Layout, productService, ProductCard } from '@/index.js';
import { ChevronRight, Home, Filter, BookOpen } from 'lucide-react';
import { Button } from '@/components/ui/button';
import './CategoryPage.css';

const CategoryPage = () => {
  const { '*': path } = useParams(); // Using * for deep paths
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState([]);
  const [currentCategory, setCurrentCategory] = useState(null);

  // 1. Fetch Categories Tree
  useEffect(() => {
    fetch('/api/categories/tree')
      .then(res => res.json())
      .then(setCategories);
  }, []);

  // 2. Find Current Category from Tree by Path
  useEffect(() => {
    if (categories.length === 0 || !path) return;

    const findByPath = (nodes, pathParts, currentIdx = 0) => {
      const slug = pathParts[currentIdx];
      const node = nodes.find(n => n.slug === slug);
      
      if (!node) return null;
      if (currentIdx === pathParts.length - 1) return node;
      
      return findByPath(node.children || [], pathParts, currentIdx + 1);
    };

    const parts = path.split('/');
    const found = findByPath(categories, parts);
    setCurrentCategory(found);
  }, [categories, path]);

  // 3. Fetch Products for this path
  useEffect(() => {
    const fetchProductsData = async () => {
      setLoading(true);
      try {
        const res = await productService.getProducts({ category_path: path, limit: 100 });
        setProducts(res.data?.data?.products || []);
      } catch (err) {
        console.error('Error fetching products by path:', err);
      } finally {
        setLoading(false);
      }
    };

    if (path) fetchProductsData();
  }, [path]);

  // Breadcrumbs logic
  const breadcrumbs = useMemo(() => {
    const parts = path.split('/');
    return parts.map((part, index) => {
      const breadPath = parts.slice(0, index + 1).join('/');
      return {
        name: part.charAt(0).toUpperCase() + part.slice(1).replace(/-/g, ' '),
        url: `/category/${breadPath}`
      };
    });
  }, [path]);

  return (
    <Layout>
      <div className="category-page container-custom py-8">
        {/* Breadcrumbs */}
        <nav className="breadcrumbs flex items-center gap-2 text-sm text-muted-foreground mb-6 overflow-x-auto whitespace-nowrap pb-2">
          <Link to="/" className="hover:text-primary flex items-center gap-1">
            <Home size={14} /> Home
          </Link>
          {breadcrumbs.map((bc, index) => (
            <React.Fragment key={bc.url}>
              <ChevronRight size={14} />
              <Link 
                to={bc.url} 
                className={`hover:text-primary ${index === breadcrumbs.length - 1 ? 'text-foreground font-semibold' : ''}`}
              >
                {bc.name}
              </Link>
            </React.Fragment>
          ))}
        </nav>

        <div className="grid grid-cols-12 gap-8">
          {/* Sidebar - Subcategories */}
          <aside className="col-span-12 md:col-span-3">
            <div className="category-sidebar border rounded-xl p-5 sticky top-24 bg-card shadow-sm">
              <h3 className="font-bold text-lg mb-4 flex items-center gap-2">
                <Filter size={18} /> 
                {currentCategory ? currentCategory.name : 'Categories'}
              </h3>
              
              <div className="subcategory-list flex flex-col gap-1">
                {currentCategory?.children?.length > 0 ? (
                  currentCategory.children.map(child => (
                    <Link 
                      key={child.id}
                      to={`/category/${path}/${child.slug}`}
                      className="text-sm p-2 rounded-md hover:bg-muted transition-colors flex justify-between items-center group"
                    >
                      {child.name}
                      <ChevronRight size={14} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                    </Link>
                  ))
                ) : (
                  <p className="text-sm text-muted-foreground italic">No further subcategories</p>
                )}
              </div>
            </div>
          </aside>

          {/* Main Content - Products */}
          <main className="col-span-12 md:col-span-9">
            <div className="flex justify-between items-end mb-6">
              <div>
                <h1 className="text-3xl font-bold mb-1">
                  {currentCategory ? currentCategory.name : path.split('/').pop().replace(/-/g, ' ')}
                </h1>
                <p className="text-muted-foreground">
                  {loading ? 'Finding products...' : `${products.length} products found in this category`}
                </p>
              </div>
            </div>

            {loading ? (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                {[1, 2, 3, 4, 5, 6].map(i => (
                  <div key={i} className="aspect-[3/4] bg-muted animate-pulse rounded-xl" />
                ))}
              </div>
            ) : products.length > 0 ? (
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                {products.map(p => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 text-center gap-4 border rounded-2xl bg-muted/30">
                <BookOpen size={48} className="text-muted-foreground/30" />
                <div>
                  <h3 className="text-xl font-semibold">No products found</h3>
                  <p className="text-muted-foreground">We couldn't find any products in this specific category.</p>
                </div>
                <Button variant="outline" onClick={() => window.history.back()}>Go Back</Button>
              </div>
            )}
          </main>
        </div>
      </div>
    </Layout>
  );
};

export default CategoryPage;
