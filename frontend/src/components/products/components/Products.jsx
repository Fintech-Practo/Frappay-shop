import React, { useState, useEffect, useMemo } from "react";
import { useSearchParams } from "react-router-dom";
import { Layout, productService, ProductCard } from "@/index.js";

import {
  SlidersHorizontal,
  ChevronDown,
  ChevronUp,
  X,
  BookOpen,
  Tablet,
  BookMarked,
  Paperclip,
  Star,
  Tag,
  LayoutGrid,
  List,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";

const PAGE_SIZE = 100;
const PRICE_MIN = 0;
const PRICE_MAX = 5000;

const PRODUCT_TYPES = [
  { code: "BOOK", label: "Books", icon: BookOpen },
  { code: "EBOOK", label: "E-Books", icon: Tablet },
  { code: "NOTEBOOK", label: "Notebooks", icon: BookMarked },
  { code: "STATIONERY", label: "Stationery", icon: Paperclip },
];

const SORT_OPTIONS = [
  { value: "", label: "Default" },
  { value: "price_asc", label: "Price: Low to High" },
  { value: "price_desc", label: "Price: High to Low" },
  { value: "discount", label: "Best Discount" },
  { value: "rating", label: "Top Rated" },
];

const FORMAT_OPTIONS = [
  { value: "", label: "All Formats" },
  { value: "PHYSICAL", label: "Physical" },
  { value: "EBOOK", label: "E-Book" },
];

/* ───────── helpers ───────── */
const getLeafIds = (node) => {
  if (!node.children || node.children.length === 0) return [node.id];
  let ids = [];
  node.children.forEach((child) => {
    ids = ids.concat(getLeafIds(child));
  });
  return ids;
};

const countActiveFilters = (filters) => {
  let n = 0;
  if (filters.type) n++;
  if (filters.parent) n++;
  if (filters.leaf) n++;
  if (filters.format) n++;
  if (filters.minRating) n++;
  if (filters.price[0] !== PRICE_MIN || filters.price[1] !== PRICE_MAX) n++;
  return n;
};

/* ───────── collapsible section ───────── */
function FilterSection({ title, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-border/60 pb-4">
      <button
        className="flex w-full items-center justify-between py-2 text-sm font-semibold text-foreground hover:text-primary transition-colors"
        onClick={() => setOpen((o) => !o)}
      >
        {title}
        {open ? <ChevronUp size={15} /> : <ChevronDown size={15} />}
      </button>
      {open && <div className="mt-3">{children}</div>}
    </div>
  );
}

/* ───────── main component ───────── */
export default function Products() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoryTree, setCategoryTree] = useState([]);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [viewMode, setViewMode] = useState("grid"); // grid | list
  const [sort, setSort] = useState("");

  const [filters, setFilters] = useState({
    type: "",
    parent: "",
    leaf: "",
    format: "",
    minRating: 0,
    price: [PRICE_MIN, PRICE_MAX],
  });

  const [searchParams] = useSearchParams();
  const search = searchParams.get("search") || "";
  const categoryFromURL = searchParams.get("category");

  /* ── load categories ── */
  useEffect(() => {
    const loadCategories = async () => {
      try {
        const res = await productService.getProductTree();
        if (res.data?.success) {
          setCategoryTree(res.data.data.categories || []);
        }
      } catch (err) {
        console.error("Category load error", err);
      }
    };
    loadCategories();
  }, []);
  useEffect(() => {
    if (!categoryFromURL) return;

    const map = {
      stationery: "STATIONERY",
      notebooks: "NOTEBOOK",
      ebooks: "EBOOK",
      "school-books": "BOOK",
      "reference-books": "BOOK",
      novels: "BOOK",
    };

    const type = map[categoryFromURL];

    if (type) {
      setFilters((prev) => ({
        ...prev,
        type,
        format: categoryFromURL === "ebooks" ? "EBOOK" : prev.format,
      }));
    }
  }, [categoryFromURL]);
  useEffect(() => {
    if (!search) return;

    const q = search.toLowerCase().trim();

    if (["ebook", "ebooks", "e-book"].includes(q)) {
      setFilters((prev) => ({
        ...prev,
        type: "EBOOK",
        format: "EBOOK",
      }));
    }
    else if (["book", "books"].includes(q)) {
      setFilters((prev) => ({
        ...prev,
        type: "BOOK",
        format: "PHYSICAL",
      }));
    }
    else if (["notebook", "notebooks"].includes(q)) {
      setFilters((prev) => ({
        ...prev,
        type: "NOTEBOOK",
      }));
    }
    else if (q === "stationery") {
      setFilters((prev) => ({
        ...prev,
        type: "STATIONERY",
      }));
    }
  }, [search]);
  /* ── fetch products ── */
  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      try {
        const params = {
          page: 1,
          limit: PAGE_SIZE,
          min_price: Number(filters.price[0]) || PRICE_MIN,   // 🔥 FIX
          max_price: Number(filters.price[1]) || PRICE_MAX,   // 🔥 FIX
        };

        // 🟢 STRICT SEARCH MAPPING (ADD THIS BLOCK)
        if (search && !categoryFromURL) {
          const q = search.toLowerCase().trim();

          if (q === "ebook" || q === "ebooks" || q === "e-book") {
            params.product_type_code = "BOOK";
            params.format = "EBOOK";
          }
          else if (q === "book" || q === "books") {
            params.product_type_code = "BOOK";
            params.format = "PHYSICAL";
          }
          else if (q === "notebook" || q === "notebooks") {
            params.product_type_code = "NOTEBOOK";
          }
          else if (q === "stationery") {
            params.product_type_code = "STATIONERY";
          }
          else {
            // fallback: normal search
            params.search = search;
          }
        }

        /* product type + format */
        if (filters.type) {
          if (filters.type === "EBOOK") {
            params.product_type_code = "BOOK";
            params.format = "EBOOK";
          } else {
            params.product_type_code = filters.type;
            if (filters.format) params.format = filters.format;
          }
        } else if (filters.format) {
          params.format = filters.format;
        }

        /* category leaf / parent */
        if (filters.leaf) {
          params.category_leaf_id = filters.leaf;
        } else if (filters.parent) {
          const parentNode = categoryTree.find(
            (c) => c.id === Number(filters.parent)
          );
          if (parentNode) {
            const leafIds = getLeafIds(parentNode);
            params.category_ids = leafIds.join(",");
          }
        }

        const res = await productService.getProducts(params);
        setProducts(res.data?.data?.products || []);
      } catch (err) {
        console.error("Product load error", err);
        setProducts([]);
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [
    filters.type,
    filters.parent,
    filters.leaf,
    filters.format,
    filters.minRating,
    filters.price[0],   // 🔥 important
    filters.price[1],   // 🔥 important
    search,
    categoryTree
  ]);

  /* ── derived category lists ── */
  const parentCategories = useMemo(() => {
    if (!filters.type) return [];
    const type = filters.type === "EBOOK" ? "BOOK" : filters.type;
    return categoryTree.filter((c) => c.product_type_code === type);
  }, [filters.type, categoryTree]);

  const leafCategories = useMemo(() => {
    if (!filters.parent) return [];
    return (
      categoryTree.find((c) => c.id === Number(filters.parent))?.children || []
    );
  }, [filters.parent, categoryTree]);

  /* ── client-side sort + rating filter ── */
  const displayProducts = useMemo(() => {
    let list = [...products];

    // 🔥 PRICE FILTER (CLIENT SIDE)
    list = list.filter((p) => {
      const price = Number(p.selling_price || 0);
      return price >= filters.price[0] && price <= filters.price[1];
    });

    // 🔥 RATING FILTER (ROBUST)
    if (filters.minRating > 0) {
      list = list.filter((p) => {
        const rating =
          Number(p.rating) ||
          Number(p.average_rating) ||
          Number(p.avg_rating) ||
          0;

        return rating >= filters.minRating;
      });
    }

    // 🔥 SORT FIXED
    switch (sort) {
      case "price_asc":
        list.sort((a, b) => Number(a.selling_price || 0) - Number(b.selling_price || 0));
        break;

      case "price_desc":
        list.sort((a, b) => Number(b.selling_price || 0) - Number(a.selling_price || 0));
        break;

      case "discount":
        list.sort((a, b) => Number(b.discount_percent || 0) - Number(a.discount_percent || 0));
        break;

      case "rating":
        list.sort((a, b) => {
          const ra =
            Number(a.rating) ||
            Number(a.average_rating) ||
            0;

          const rb =
            Number(b.rating) ||
            Number(b.average_rating) ||
            0;

          return rb - ra;
        });
        break;

      default:
        break;
    }

    return list;
  }, [products, sort, filters]);

  /* ── handlers ── */
  const updateFilter = (key, value) => {
    setFilters((prev) => ({
      ...prev,
      [key]: value,
      ...(key === "type" && { parent: "", leaf: "" }),
      ...(key === "parent" && { leaf: "" }),
    }));
  };

  const clearFilters = () => {
    setFilters({
      type: "",
      parent: "",
      leaf: "",
      format: "",
      minRating: 0,
      price: [PRICE_MIN, PRICE_MAX],
    });
    setSort("");
  };

  const activeCount = countActiveFilters(filters);

  /* ── active filter chips ── */
  const activeChips = [];
  if (filters.type) {
    const t = PRODUCT_TYPES.find((x) => x.code === filters.type);
    activeChips.push({ label: t?.label || filters.type, key: "type" });
  }
  if (filters.parent) {
    const p = categoryTree.find((c) => c.id === Number(filters.parent));
    if (p) activeChips.push({ label: p.name, key: "parent" });
  }
  if (filters.leaf) {
    const p = categoryTree.find((c) => c.id === Number(filters.parent));
    const l = p?.children?.find((c) => c.id === Number(filters.leaf));
    if (l) activeChips.push({ label: l.name, key: "leaf" });
  }
  if (filters.format)
    activeChips.push({ label: filters.format, key: "format" });
  if (filters.minRating > 0)
    activeChips.push({ label: `${filters.minRating}★ & up`, key: "minRating" });
  if (filters.price[0] !== PRICE_MIN || filters.price[1] !== PRICE_MAX)
    activeChips.push({
      label: `₹${filters.price[0]}–₹${filters.price[1]}`,
      key: "price",
    });

  /* ── sidebar JSX ── */
  const Sidebar = (
    <div className="space-y-4">
      {/* header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 font-bold text-base">
          <SlidersHorizontal size={17} />
          Filters
          {activeCount > 0 && (
            <Badge className="ml-1 text-xs px-1.5 py-0">{activeCount}</Badge>
          )}
        </div>
        {activeCount > 0 && (
          <button
            onClick={clearFilters}
            className="text-xs text-muted-foreground hover:text-destructive flex items-center gap-1 transition-colors"
          >
            <X size={12} /> Clear all
          </button>
        )}
      </div>

      {/* Product Type */}
      <FilterSection title="Product Type">
        <div className="grid grid-cols-2 gap-2">
          {PRODUCT_TYPES.map(({ code, label, icon: Icon }) => {
            const selected = filters.type === code;
            return (
              <button
                key={code}
                onClick={() => updateFilter("type", selected ? "" : code)}
                className={`flex flex-col items-center gap-1.5 rounded-lg border p-2.5 text-xs font-medium transition-all
                  ${selected
                    ? "border-primary bg-primary/10 text-primary"
                    : "border-border text-muted-foreground hover:border-primary/50 hover:text-foreground"
                  }`}
              >
                <Icon size={18} />
                {label}
              </button>
            );
          })}
        </div>
      </FilterSection>

      {/* Format (only when type is BOOK or not set) */}
      {(filters.type === "BOOK" || filters.type === "") && (
        <FilterSection title="Format">
          <div className="flex flex-col gap-1.5">
            {FORMAT_OPTIONS.map(({ value, label }) => (
              <label
                key={value}
                className="flex items-center gap-2 cursor-pointer"
              >
                <input
                  type="radio"
                  name="format"
                  checked={filters.format === value}
                  onChange={() => updateFilter("format", value)}
                  className="accent-primary"
                />
                <span className="text-sm">{label}</span>
              </label>
            ))}
          </div>
        </FilterSection>
      )}

      {/* Category */}
      {parentCategories.length > 0 && (
        <FilterSection title="Category">
          <div className="flex flex-col gap-1.5 max-h-52 overflow-y-auto pr-1">
            {parentCategories.map((c) => {
              const selected = filters.parent === String(c.id);
              return (
                <button
                  key={c.id}
                  onClick={() =>
                    updateFilter("parent", selected ? "" : String(c.id))
                  }
                  className={`text-left text-sm rounded-md px-3 py-1.5 transition-colors
                    ${selected
                      ? "bg-primary/10 text-primary font-medium"
                      : "hover:bg-muted text-foreground"
                    }`}
                >
                  {c.name}
                </button>
              );
            })}
          </div>
        </FilterSection>
      )}

      {/* Subcategory */}
      {leafCategories.length > 0 && (
        <FilterSection title="Subcategory">
          <div className="flex flex-col gap-1.5 max-h-52 overflow-y-auto pr-1">
            {leafCategories.map((c) => {
              const selected = filters.leaf === String(c.id);
              return (
                <button
                  key={c.id}
                  onClick={() =>
                    updateFilter("leaf", selected ? "" : String(c.id))
                  }
                  className={`text-left text-sm rounded-md px-3 py-1.5 transition-colors
                    ${selected
                      ? "bg-primary/10 text-primary font-medium"
                      : "hover:bg-muted text-foreground"
                    }`}
                >
                  {c.name}
                </button>
              );
            })}
          </div>
        </FilterSection>
      )}

      {/* Price Range */}
      <FilterSection title="Price Range">
        <div className="px-1">
          <Slider
            min={PRICE_MIN}
            max={PRICE_MAX}
            step={50}
            value={[filters.price[1]]}   // ✅ only max value
            onValueChange={(v) =>
              updateFilter("price", [PRICE_MIN, v[0]])  // ✅ min always 0
            }
          />
          <div className="flex justify-between mt-2 text-xs text-muted-foreground font-medium">
            <span>₹{PRICE_MIN}</span>
            <span>₹{filters.price[1]}</span>
          </div>
        </div>
      </FilterSection>

      {/* Min Rating */}
      <FilterSection title="Minimum Rating">
        <div className="flex gap-1 flex-wrap">
          {[0, 1, 2, 3, 4].map((r) => (
            <button
              key={r}
              onClick={() => updateFilter("minRating", r)}
              className={`flex items-center gap-1 text-xs rounded-full border px-2.5 py-1 transition-all font-medium
                ${filters.minRating === r
                  ? "border-amber-400 bg-amber-50 text-amber-600"
                  : "border-border text-muted-foreground hover:border-amber-300"
                }`}
            >
              {r === 0 ? (
                "All"
              ) : (
                <>
                  <Star size={11} className="fill-amber-400 text-amber-400" />
                  {r}+
                </>
              )}
            </button>
          ))}
        </div>
      </FilterSection>
    </div>
  );

  /* ── render ── */
  return (
    <Layout>
      <div className="container-custom py-8">

        {/* ── top bar ── */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold">
              {search ? `Results for "${search}"` : "All Products"}
            </h1>
            {!loading && (
              <p className="text-sm text-muted-foreground mt-0.5">
                {displayProducts.length} product
                {displayProducts.length !== 1 ? "s" : ""} found
              </p>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* mobile filter toggle */}
            <Button
              variant="outline"
              size="sm"
              className="md:hidden flex items-center gap-1.5"
              onClick={() => setSidebarOpen((o) => !o)}
            >
              <SlidersHorizontal size={15} />
              Filters
              {activeCount > 0 && (
                <Badge className="ml-0.5 text-xs px-1.5 py-0">{activeCount}</Badge>
              )}
            </Button>

            {/* sort */}
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="text-sm border border-border rounded-md px-3 py-1.5 bg-background text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
            >
              {SORT_OPTIONS.map(({ value, label }) => (
                <option key={value} value={value}>
                  {label}
                </option>
              ))}
            </select>

            {/* view toggle */}
            <div className="hidden md:flex border border-border rounded-md overflow-hidden">
              <button
                onClick={() => setViewMode("grid")}
                className={`p-1.5 ${viewMode === "grid" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
              >
                <LayoutGrid size={16} />
              </button>
              <button
                onClick={() => setViewMode("list")}
                className={`p-1.5 ${viewMode === "list" ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted"}`}
              >
                <List size={16} />
              </button>
            </div>
          </div>
        </div>

        {/* ── active filter chips ── */}
        {activeChips.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {activeChips.map((chip) => (
              <span
                key={chip.key}
                className="inline-flex items-center gap-1.5 bg-primary/10 text-primary text-xs font-medium rounded-full px-3 py-1 border border-primary/20"
              >
                <Tag size={11} />
                {chip.label}
                <button
                  onClick={() => {
                    if (chip.key === "price") updateFilter("price", [PRICE_MIN, PRICE_MAX]);
                    else if (chip.key === "minRating") updateFilter("minRating", 0);
                    else updateFilter(chip.key, "");
                  }}
                  className="hover:text-destructive transition-colors ml-0.5"
                >
                  <X size={11} />
                </button>
              </span>
            ))}
            <button
              onClick={clearFilters}
              className="text-xs text-muted-foreground hover:text-destructive underline underline-offset-2"
            >
              Clear all
            </button>
          </div>
        )}

        <div className="grid grid-cols-12 gap-4 md:gap-8">

          {/* ── SIDEBAR desktop ── */}
          <div className="hidden md:block col-span-3">
            <div className="border rounded-xl p-5 sticky top-24 bg-card shadow-sm">
              {Sidebar}
            </div>
          </div>

          {/* ── SIDEBAR mobile drawer ── */}
          {sidebarOpen && (
            <div className="fixed inset-0 z-50 flex md:hidden">
              {/* backdrop */}
              <div
                className="absolute inset-0 bg-black/40"
                onClick={() => setSidebarOpen(false)}
              />
              {/* panel */}
              <div className="relative ml-auto w-80 h-full overflow-y-auto p-5 shadow-xl border-l border-border" style={{ backgroundColor: "hsl(var(--card))" }}>
                <div className="flex items-center justify-between mb-4">
                  <span className="font-bold text-base">Filters</span>
                  <button onClick={() => setSidebarOpen(false)}>
                    <X size={20} />
                  </button>
                </div>
                {Sidebar}
                <div className="mt-6">
                  <Button
                    className="w-full"
                    onClick={() => setSidebarOpen(false)}
                  >
                    Show {displayProducts.length} results
                  </Button>
                </div>
              </div>
            </div>
          )}

          {/* ── PRODUCTS GRID ── */}
          <div className="col-span-12 md:col-span-9">
            {loading ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div
                    key={i}
                    className="rounded-xl bg-muted animate-pulse aspect-[3/4]"
                  />
                ))}
              </div>
            ) : displayProducts.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-24 text-center gap-3">
                <BookOpen size={48} className="text-muted-foreground/40" />
                <p className="text-lg font-semibold">No products found</p>
                <p className="text-sm text-muted-foreground">
                  Try adjusting your filters or search term.
                </p>
                {activeCount > 0 && (
                  <Button variant="outline" size="sm" onClick={clearFilters}>
                    Clear filters
                  </Button>
                )}
              </div>
            ) : viewMode === "grid" ? (
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {displayProducts.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>
            ) : (
              /* list view */
              <div className="flex flex-col gap-4">
                {displayProducts.map((p) => (
                  <ProductCard key={p.id} product={p} viewMode="list" />
                ))}
              </div>
            )}
          </div>

        </div>
      </div>
    </Layout>
  );
}