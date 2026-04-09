import React, { useState, useEffect } from 'react';
import api from '@/config/api';
import { Grid3X3, List } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Layout, ProductCard } from '@/index.js';

const PAGE_SIZE = 12;

export default function BooksPage() {
  const [viewMode, setViewMode] = useState('grid');
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [total, setTotal] = useState(0);

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const params = {
          product_type_code: 'BOOK',
          limit: PAGE_SIZE,
          offset: (page - 1) * PAGE_SIZE
        };

        if (search) params.search = search;

        const res = await api.get('/api/products', { params });
        const productList = res.data.data?.products || res.data.data || [];
        setProducts(productList);
        setTotal(res.data.data?.pagination?.total || res.data.total || productList.length || 0);
      } catch (err) {
        console.error('Failed to fetch books', err);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [page, search]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <Layout>
      <div className="container-custom py-8">
        <div className="flex flex-col md:flex-row justify-between gap-4 mb-6">
          <h1 className="text-3xl font-bold">Books</h1>
          <div className="flex gap-3">
            <Input
              placeholder="Search books..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-64"
            />
            <div className="hidden sm:flex border rounded-lg">
              <Button
                size="icon"
                variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
                onClick={() => setViewMode('grid')}
              >
                <Grid3X3 size={18} />
              </Button>
              <Button
                size="icon"
                variant={viewMode === 'list' ? 'secondary' : 'ghost'}
                onClick={() => setViewMode('list')}
              >
                <List size={18} />
              </Button>
            </div>
          </div>
        </div>

        {loading ? (
          <div className="text-center py-20">Loading books…</div>
        ) : products.length === 0 ? (
          <div className="text-center py-20">No books found</div>
        ) : (
          <>
            <div className={viewMode === 'grid'
              ? 'grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4'
              : 'space-y-4'}
            >
              {products.map((p, i) => (
                <ProductCard key={p.id} product={p} index={i} />
              ))}
            </div>

            {totalPages > 1 && (
              <div className="flex justify-center gap-3 mt-8">
                <Button
                  variant="outline"
                  disabled={page === 1}
                  onClick={() => setPage(p => p - 1)}
                >
                  Prev
                </Button>
                <span className="px-4 py-2 text-sm">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  disabled={page === totalPages}
                  onClick={() => setPage(p => p + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </>
        )}
      </div>
    </Layout>
  );
}

