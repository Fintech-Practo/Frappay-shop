import { useState, useEffect } from 'react';
import {
    Package,
    IndianRupee,
    Box,
    Tag,
    Image as ImageIcon,
    Save,
    Eye,
    Plus,
    Trash2,
} from 'lucide-react';
import { Layout } from '@/index.js';
import { MetadataSection } from './MetadataSection';
import { TagInput } from '@/components/ui/tag-input';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem
} from '@/components/ui/select';
import { useToast } from '@/components/ui/use-toast';
import { useProduct } from '@/context/ProductContext';
import { useNavigate, useLocation, useParams } from 'react-router-dom';
import api from '@/config/api';


import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogTrigger } from '@/components/ui/dialog';

/* -------------------- CONSTANTS -------------------- */

const INITIAL_FORM = {
    productType: 'BOOK',
    format: 'PHYSICAL',
    category: '',
    subcategory: '',
    topic: '',
    productName: '',
    sku: '',
    author: '',
    publisher: '',
    isbn: '',
    edition: '',
    language: 'English',
    pageCount: '',
    paperGsm: '',
    rulingType: '',
    bindingType: '',
    brand: '',
    packSize: '',
    material: '',
    subject: '',
    board: '',
    grade: '',
    mrp: '',
    sellingPrice: '',
    discount: '',
    stock: '',
    description: '',
    specifications: '',
    metaTitle: '',
    metaDescription: '',
    tags: [],
    weight: '',
    gstRate: '',
    isGstInclusive: true,
    metadata: {}
};

// Map frontend types to backend product_type_code
const PRODUCT_TYPE_MAP = {
    'BOOK': 'BOOK',
    'NOTEBOOK': 'NOTEBOOK',
    'STATIONERY': 'STATIONERY'
};



const CATEGORY_MAP = {
    BOOK: {
        Academic: ['School Books', 'College Books', 'Reference Books'],
        Competitive: ['JEE', 'NEET', 'SSC', 'Banking'],
        Activity: ['Coloring', 'Puzzle', 'Rhymes']
    },
    NOTEBOOK: {
        Exercise: ['Single Line', 'Double Line', 'Four Line', 'Graph'],
        Specialty: ['Drawing', 'Project', 'Lab']
    },
    STATIONERY: {
        Writing: ['Pen', 'Pencil', 'Marker'],
        Paper: ['Chart Paper', 'Loose Sheets'],
        School: ['Geometry Box', 'Eraser', 'Sharpener']
    }
};




/* -------------------- COMPONENT -------------------- */

export default function AddProduct() {
    const [formData, setFormData] = useState(INITIAL_FORM);
    const [imageFile, setImageFile] = useState(null);
    const [imagePreview, setImagePreview] = useState(null);
    const [galleryFiles, setGalleryFiles] = useState([]);
    const [galleryPreviews, setGalleryPreviews] = useState([]);
    const [pdfFile, setPdfFile] = useState(null);
    const [removeEbook, setRemoveEbook] = useState(false);
    const [previewOpen, setPreviewOpen] = useState(false);
    const [loadingProduct, setLoadingProduct] = useState(false);
    const location = useLocation();
    const { productId } = useParams();
    const editMode = location.state?.mode === 'edit' || !!productId;

    const [currentStep, setCurrentStep] = useState(editMode ? 2 : 1);
    const [maxStepReached, setMaxStepReached] = useState(editMode ? 8 : 1);
    const totalSteps = 8;
    const [categoryTree, setCategoryTree] = useState(null);

    const nextStep = () => {
        const next = Math.min(currentStep + 1, totalSteps);
        setCurrentStep(next);
        if (!editMode) setMaxStepReached(prev => Math.max(prev, next));
    };
    const prevStep = () => setCurrentStep(prev => Math.max(prev - 1, 1));
    const { toast } = useToast();
    const { createProduct, updateProduct } = useProduct();
    const navigate = useNavigate();
    // Initial product from state, or will be fetched
    const [editingProduct, setEditingProduct] = useState(location.state?.product || null);
    const [metadataDefinitions, setMetadataDefinitions] = useState([]);

    useEffect(() => {
        const fetchMetadata = async () => {
            if (!formData.productType) {
                setMetadataDefinitions([]);
                return;
            }
            try {
                const res = await api.get(`/api/metadata?product_type=${formData.productType}`);
                if (res.data.success) {
                    setMetadataDefinitions(res.data.data);
                }
            } catch (err) {
                console.error('Failed to fetch metadata:', err);
            }
        };
        fetchMetadata();
    }, [formData.productType]);

    const handleMetadataChange = (metaId, value) => {
        setFormData(prev => ({
            ...prev,
            metadata: {
                ...(prev.metadata || {}),
                [metaId]: value
            }
        }));
    };

    /* -------------------- HANDLERS -------------------- */

    // Cleanup object URLs to avoid memory leaks
    useEffect(() => {
        return () => {
            galleryPreviews.forEach(url => {
                if (url.startsWith('blob:')) URL.revokeObjectURL(url);
            });
            if (imagePreview && imagePreview.startsWith('blob:')) URL.revokeObjectURL(imagePreview);
        };
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;

        setFormData(prev => ({ ...prev, [name]: value }));

        if (name === 'mrp' || name === 'sellingPrice') {
            const mrp = name === 'mrp' ? value : formData.mrp;
            const sp = name === 'sellingPrice' ? value : formData.sellingPrice;
            if (mrp && sp) {
                setFormData(prev => ({
                    ...prev,
                    discount: (((mrp - sp) / mrp) * 100).toFixed(2)
                }));
            }
        }
    };

    // Get categories for selected product type (Level 0)
    const getAvailableCategories = () => {
        if (!formData.productType || !categoryTree?.categories) return [];
        return categoryTree.categories.filter(c => c.product_type_code === formData.productType);
    };

    // Get subcategories for selected category (Level 1)
    const getAvailableSubcategories = () => {
        if (!formData.category) return [];
        const parent = getAvailableCategories().find(c => c.name === formData.category);
        return parent?.children || [];
    };

    // Get topics for selected subcategory (Level 2)
    const getAvailableTopics = () => {
        if (!formData.subcategory) return [];
        const sub = getAvailableSubcategories().find(c => c.name === formData.subcategory);
        return sub?.children || [];
    };

    // Resolve leaf category ID
    const getLeafCategoryId = () => {
        if (!formData.category) return null;

        const cats = getAvailableCategories();
        const catNode = cats.find(c => c.name === formData.category);
        if (!catNode) return null;

        if (!formData.subcategory) return catNode.id; // Only needed if level 0 can be leaf? Usually not.

        const subNode = catNode.children?.find(c => c.name === formData.subcategory);
        if (!subNode) return catNode.id; // Fallback? But subcategory is selected...

        if (!formData.topic) {
            // If subNode has no children, it IS the leaf.
            if (!subNode.children || subNode.children.length === 0) return subNode.id;
            return null; // Must select topic
        }

        const topicNode = subNode.children?.find(c => c.name === formData.topic);
        return topicNode ? topicNode.id : subNode.id;
    };

    const fetchCategories = async () => {
        try {
            const response = await api.get('/api/products/tree');
            if (response.data.success) {
                setCategoryTree(response.data.data);
            }
        } catch (error) {
            console.error('Failed to fetch categories:', error);
        }
    };

    // Fetch product details if editing by ID directly
    useEffect(() => {
        const fetchProductDetails = async () => {
            if (productId && !editingProduct) {
                setLoadingProduct(true);
                try {
                    const res = await api.get(`/api/products/${productId}`);
                    if (res.data.success) {
                        setEditingProduct(res.data.data);
                    }
                } catch (error) {
                    toast({
                        title: "Error",
                        description: "Failed to load product details",
                        variant: "destructive"
                    });
                    navigate('/seller/products');
                } finally {
                    setLoadingProduct(false);
                }
            }
        };
        fetchProductDetails();
    }, [productId, editingProduct, navigate, toast]);

    const handleSubmit = async () => {
        try {
            const payload = new FormData();

            const leafId = getLeafCategoryId();

            if (!leafId) {
                toast({
                    title: 'Category error',
                    description: 'Please select product type, category and subcategory',
                    variant: 'destructive'
                });
                return;
            }

            if (formData.sellingPrice && formData.mrp && Number(formData.sellingPrice) > Number(formData.mrp)) {
                toast({
                    title: 'Pricing Error',
                    description: 'Selling Price cannot be greater than MRP',
                    variant: 'destructive'
                });
                return;
            }

            // ISBN validation for physical books
            if (formData.productType === 'BOOK' && formData.format === 'PHYSICAL' && formData.isbn) {
                const cleanIsbn = formData.isbn.replace(/[^0-9Xx]/g, '');
                if (cleanIsbn.length < 10 || cleanIsbn.length > 13) {
                    toast({
                        title: 'ISBN Error',
                        description: 'ISBN must be 10 to 13 characters (digits and X only, hyphens/spaces allowed)',
                        variant: 'destructive'
                    });
                    return;
                }
            }

            const needsPdf = formData.productType === "BOOK" && formData.format === "EBOOK";
            if (needsPdf) {
                const hasExistingPdf = editMode && editingProduct?.ebook_url && !removeEbook;
                if (!pdfFile && !hasExistingPdf) {
                    toast({
                        title: "PDF required",
                        description: "Upload PDF for E-Book format",
                        variant: "destructive"
                    });
                    return;
                }
            }

            //  REQUIRED FIELDS ONLY
            payload.append('title', formData.productName);
            payload.append('product_type_code', formData.productType || 'BOOK');
            payload.append('category_leaf_id', String(leafId));
            payload.append('description', formData.description);

            // Add format: BOOK can be PHYSICAL/EBOOK/BOTH, others must be PHYSICAL
            payload.append('format', formData.productType === 'BOOK' ? (formData.format || 'PHYSICAL') : 'PHYSICAL');

            payload.append('selling_price', Number(formData.sellingPrice || 0));
            payload.append('mrp', Number(formData.mrp || 0));
            payload.append('stock', Number(formData.stock || 0));
            payload.append('weight', Number(formData.weight || 0));
            // FIX: mark ebooks as unlimited stock
            if (formData.format === "EBOOK") {
                payload.append("is_unlimited_stock", 1);
            } else {
                payload.append("is_unlimited_stock", 0);
            }
            if (formData.discount) {
                payload.append('discount_percent', Number(formData.discount));
            }

            if (['NOTEBOOK', 'STATIONERY'].includes(formData.productType)) {
                if (formData.gstRate !== '') {
                    payload.append('gstRate', Number(formData.gstRate));
                }
                payload.append('isGstInclusive', formData.isGstInclusive);
            }

            if (formData.sku) {
                payload.append('sku', formData.sku);
            }

            if (formData.metaTitle) {
                payload.append('meta_title', formData.metaTitle);
            }

            if (formData.metaDescription) {
                payload.append('meta_description', formData.metaDescription);
            }
            if (formData.tags && formData.tags.length > 0) {
                payload.append('tags', JSON.stringify(formData.tags));
            }

            // Attributes (JSON column for structured data)
            const attributes = {
                description: formData.description,
                specifications: formData.specifications
            };

            // Specific attributes based on type
            if (formData.productType === 'BOOK') {
                if (formData.format === 'PHYSICAL') {
                    attributes.type = 'BOOK_PHYSICAL';
                    attributes.author = formData.author;
                    attributes.publisher = formData.publisher;
                    attributes.isbn = formData.isbn;
                    attributes.edition = formData.edition;
                    attributes.language = formData.language;
                    attributes.page_count = Number(formData.pageCount);
                } else {
                    attributes.type = 'BOOK_EBOOK';
                    attributes.author = formData.author;
                    attributes.publisher = formData.publisher;
                    attributes.language = formData.language;
                    attributes.file_format = 'PDF';
                }
            } else if (formData.productType === 'NOTEBOOK') {
                attributes.type = 'NOTEBOOK';
                attributes.page_count = Number(formData.pageCount);
                attributes.paper_gsm = Number(formData.paperGsm);
                attributes.ruling_type = formData.rulingType;
                attributes.binding_type = formData.bindingType;
            } else if (formData.productType === 'STATIONERY') {
                attributes.type = 'STATIONERY';
                attributes.brand = formData.brand;
                attributes.pack_size = Number(formData.packSize);
                attributes.material = formData.material;
            }

            payload.append('attributes', JSON.stringify(attributes));

            if (formData.metadata && Object.keys(formData.metadata).length > 0) {
                let cleanMetadata = {};
                for (const [k, v] of Object.entries(formData.metadata)) {
                    // if editing, ensure we handle arrays logic if it was multi-select, 
                    // currently we use strings/ids.
                    if (v !== '' && v !== null && v !== undefined) {
                        cleanMetadata[k] = v;
                    }
                }
                payload.append('metadata', JSON.stringify(cleanMetadata));
            }

            if (imageFile) payload.append('image', imageFile);

            // Append gallery images
            galleryFiles.forEach(file => {
                payload.append('images', file);
            });

            if (pdfFile) payload.append('ebook_pdf', pdfFile);

            // Handle remove_ebook flag in edit mode
            if (editMode && removeEbook) {
                payload.append('remove_ebook', 'true');
            }

            if (editMode && editingProduct?.id) {
                // Remove product_type_code from update payload (not allowed to change)
                payload.delete('product_type_code');
                await updateProduct(editingProduct.id, payload);
                toast({
                    title: 'Product Updated',
                    description: 'Product updated successfully'
                });
            } else {
                await createProduct(payload);
                toast({
                    title: 'Product Added',
                    description: 'Product added successfully'
                });
            }

            navigate('/seller');

        } catch (err) {
            console.error('Submit error:', err);
            toast({
                title: 'Error',
                description: err.message || 'Failed to add product',
                variant: 'destructive'
            });
        }
    };


    // Simplified resolveCategoryFromLeafId not needed if we do search in useEffect
    function resolveCategoryFromLeafId(productType, leafId, categoryMap) {
        return { category: '', subcategory: '' };
    }


    useEffect(() => {
        fetchCategories();
    }, []);

    useEffect(() => {
        if (!editMode || !editingProduct) return;
        // if (!Object.keys(categoryMap).length) return; // Removed dependency on map

        // Logic moved to findPath above
        // const { category, subcategory } = resolveCategoryFromLeafId(
        //     editingProduct.product_type_code,
        //     editingProduct.category_leaf_id,
        //     categoryMap
        // );

        setFormData({
            ...INITIAL_FORM,
            productType: editingProduct.product_type_code || 'BOOK',
            format: editingProduct.format || 'PHYSICAL',
            // Category/Sub/Topic set below via path search
            productName: editingProduct.title || '',
            sku: editingProduct.sku || '',
            author: editingProduct.attributes?.author || '',
            publisher: editingProduct.attributes?.publisher || '',
            isbn: editingProduct.attributes?.isbn || '',
            edition: editingProduct.attributes?.edition || '',
            language: editingProduct.attributes?.language || 'English',
            pageCount: editingProduct.attributes?.page_count || '',
            paperGsm: editingProduct.attributes?.paper_gsm || '',
            rulingType: editingProduct.attributes?.ruling_type || '',
            bindingType: editingProduct.attributes?.binding_type || '',
            brand: editingProduct.attributes?.brand || '',
            packSize: editingProduct.attributes?.pack_size || '',
            material: editingProduct.attributes?.material || '',
            mrp: editingProduct.mrp || '',
            sellingPrice: editingProduct.selling_price || '',
            discount: editingProduct.discount_percent || '',
            stock: editingProduct.stock || '',
            weight: editingProduct.weight || '',
            gstRate: editingProduct.gst_rate ?? '',
            isGstInclusive: editingProduct.is_gst_inclusive ?? true,
            description: editingProduct.attributes?.description || '',
            specifications: editingProduct.attributes?.specifications || '',
            metaTitle: editingProduct.meta_title || '',
            metaDescription: editingProduct.meta_description || '',
            tags: (() => {
                const rawTags = editingProduct.tags;
                if (Array.isArray(rawTags)) return rawTags;
                if (typeof rawTags === 'string') {
                    try {
                        const parsed = JSON.parse(rawTags);
                        if (Array.isArray(parsed)) return parsed;
                    } catch (e) {
                        return rawTags.split(',').map(t => t.trim()).filter(Boolean);
                    }
                }
                return [];
            })(),
            metadata: editingProduct.metadata || {}
        });

        // Resolve generic paths
        if (categoryTree && categoryTree.categories) {
            // We need to find the node with id = editingProduct.category_leaf_id
            // Traverse tree
            const findPath = (nodes, targetId, path = []) => {
                for (const node of nodes) {
                    if (String(node.id) === String(targetId)) return [...path, node];
                    if (node.children) {
                        const found = findPath(node.children, targetId, [...path, node]);
                        if (found) return found;
                    }
                }
                return null;
            }

            const path = findPath(categoryTree.categories, editingProduct.category_leaf_id);
            if (path) {
                // path[0] = Category, path[1] = Subcategory, path[2] = Topic
                if (path[0]) setFormData(prev => ({ ...prev, category: path[0].name }));
                if (path[1]) setFormData(prev => ({ ...prev, subcategory: path[1].name }));
                if (path[2]) setFormData(prev => ({ ...prev, topic: path[2].name }));
            }
        }

        if (editingProduct.image_url) {
            setImagePreview(editingProduct.image_url);
        }

        // Load existing gallery images
        if (editingProduct.images && Array.isArray(editingProduct.images)) {
            setGalleryPreviews(editingProduct.images);
        } else {
            setGalleryPreviews([]);
        }

        setGalleryFiles([]); // Clear new files on load

        // Reset removeEbook flag when editing product changes
        setRemoveEbook(false);
        setPdfFile(null);
        setRemoveEbook(false);
        setPdfFile(null);
    }, [editMode, editingProduct, categoryTree]);




    /* -------------------- UI -------------------- */

    return (
        <Layout>
            <div className="container-custom py-8 overflow-x-hidden">
                {/* WIZARD PROGRESS */}
                <div className="mb-8">
                    <div className="flex justify-between items-center mb-4">
                        <h1 className="text-2xl font-bold">{editMode ? 'Update Product' : 'Add New Product'}</h1>
                        <span className="text-sm font-medium text-muted-foreground">Step {currentStep} of {totalSteps}</span>
                    </div>
                    <div className="flex gap-2">
                        {[...Array(totalSteps)].map((_, i) => {
                            const stepNumber = i + 1;
                            if (editMode && stepNumber === 1) return null;
                            return (
                                <div
                                    key={i}
                                    className={`h-2 flex-1 rounded-full transition-all duration-300 ${stepNumber <= currentStep ? 'bg-primary' : 'bg-secondary'
                                        }`}
                                />
                            );
                        })}
                    </div>
                    <div className="flex justify-between mt-2 text-[10px] uppercase font-bold text-muted-foreground px-1">
                        {[
                            'Classification', 'Category', 'Basic Info', 'Specifics',
                            'Pricing', 'Stock', 'Faceted Meta', 'Media'
                        ].map((label, idx) => {
                            const stepNumber = idx + 1;
                            if (editMode && stepNumber === 1) return null;
                            const isClickable = editMode || stepNumber <= maxStepReached;
                            return (
                                <span
                                    key={label}
                                    onClick={() => isClickable && setCurrentStep(stepNumber)}
                                    className={`
                                        ${isClickable ? 'cursor-pointer hover:text-primary transition-colors' : 'opacity-50 cursor-not-allowed'} 
                                        ${currentStep === stepNumber ? 'text-primary font-bold' : ''}
                                    `}
                                >
                                    {label}
                                </span>
                            );
                        })}
                    </div>
                </div>

                <div className="grid lg:grid-cols-3 gap-6 w-full">

                    {/* LEFT FORM */}
                    <div className="lg:col-span-2 space-y-6 min-w-0">

                        {currentStep === 1 && (
                            /* STEP 1: PRODUCT TYPE */
                            <Section title="Step 1: Product Classification" icon={Package}>
                                <div className="grid gap-6">
                                    <div className="grid md:grid-cols-3 gap-4">
                                        {[
                                            { id: 'BOOK', label: 'Books', icon: Eye },
                                            { id: 'NOTEBOOK', label: 'Notebooks', icon: Box },
                                            { id: 'STATIONERY', label: 'Stationery', icon: Tag },
                                        ].map(type => (
                                            <button
                                                key={type.id}
                                                type="button"
                                                onClick={() => setFormData({ ...INITIAL_FORM, productType: type.id })}
                                                className={`p-6 rounded-xl border-2 transition-all flex flex-col items-center gap-3 ${formData.productType === type.id
                                                    ? 'border-primary bg-primary/5 ring-4 ring-primary/10'
                                                    : 'hover:border-primary/50'
                                                    }`}
                                            >
                                                <type.icon className={formData.productType === type.id ? 'text-primary' : 'text-muted-foreground'} size={32} />
                                                <span className="font-bold">{type.label}</span>
                                            </button>
                                        ))}
                                    </div>

                                    {formData.productType === "BOOK" && (
                                        <div className="bg-secondary/20 p-4 rounded-lg">
                                            <label className="text-sm font-bold block mb-3">Choose Format</label>
                                            <div className="flex gap-4">
                                                {['PHYSICAL', 'EBOOK'].map(f => (
                                                    <button
                                                        key={f}
                                                        type="button"
                                                        onClick={() => setFormData(prev => ({ ...prev, format: f }))}
                                                        className={`flex-1 py-3 rounded-lg border text-sm font-medium transition-all ${formData.format === f ? 'bg-primary text-white' : 'bg-card hover:bg-muted'
                                                            }`}
                                                    >
                                                        {f === 'PHYSICAL' ? 'Physical Copy' : 'Digital (PDF)'}
                                                    </button>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </Section>
                        )}

                        {currentStep === 2 && (
                            /* STEP 2: CATEGORY TREE */
                            <Section title="Step 2: Category Selection" icon={Tag}>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <SelectField
                                        label="Primary Category"
                                        required
                                        value={formData.category}
                                        onChange={(v) =>
                                            setFormData(prev => ({
                                                ...prev,
                                                category: v,
                                                subcategory: '',
                                                topic: ''
                                            }))
                                        }
                                    >
                                        {getAvailableCategories().map(cat => (
                                            <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                                        ))}
                                    </SelectField>

                                    <SelectField
                                        label="Subcategory"
                                        required
                                        value={formData.subcategory}
                                        onChange={(v) =>
                                            setFormData(prev => ({
                                                ...prev,
                                                subcategory: v,
                                                topic: ''
                                            }))
                                        }
                                    >
                                        {getAvailableSubcategories().map(sub => (
                                            <SelectItem key={sub.id} value={sub.name}>{sub.name}</SelectItem>
                                        ))}
                                    </SelectField>

                                    {getAvailableTopics().length > 0 && (
                                        <div className="md:col-span-2">
                                            <SelectField
                                                label="Topic/Stream (Specific leaf)"
                                                required
                                                value={formData.topic}
                                                onChange={(v) => setFormData(prev => ({ ...prev, topic: v }))}
                                            >
                                                {getAvailableTopics().map(topic => (
                                                    <SelectItem key={topic.id} value={topic.name}>{topic.name}</SelectItem>
                                                ))}
                                            </SelectField>
                                        </div>
                                    )}
                                </div>
                            </Section>
                        )}

                        {currentStep === 3 && (
                            /* STEP 3: BASIC INFO */
                            <Section title="Step 3: Basic Information">
                                <div className="space-y-4">
                                    <InputField
                                        label="Product Name"
                                        required
                                        name="productName"
                                        value={formData.productName}
                                        onChange={handleChange}
                                        placeholder="e.g. Atomic Habits"
                                    />
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <InputField
                                            label="SKU (Stock Keeping Unit)"
                                            required
                                            name="sku"
                                            value={formData.sku}
                                            onChange={handleChange}
                                            placeholder="AH-001"
                                        />
                                        <div className="opacity-60">
                                            <label className="text-sm font-medium">Internal Hash/Slug</label>
                                            <div className="mt-1 p-2 bg-secondary/30 rounded text-xs truncate">
                                                {formData.productName.toLowerCase().replace(/ /g, '-').substring(0, 50)}
                                            </div>
                                        </div>
                                    </div>
                                    <TextareaField
                                        label="General Description"
                                        required
                                        name="description"
                                        value={formData.description}
                                        onChange={handleChange}
                                        rows={4}
                                        placeholder="What makes this product special?"
                                    />
                                </div>
                            </Section>
                        )}

                        {currentStep === 4 && (
                            /* STEP 4: TYPE SPECIFIC DETAILS */
                            <Section title={`Step 4: ${formData.productType} Details`}>
                                {formData.productType === 'BOOK' && (
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <InputField label="Author Name" required name="author" value={formData.author} onChange={handleChange} />
                                        <InputField label="Publisher" required name="publisher" value={formData.publisher} onChange={handleChange} />
                                        <InputField label="ISBN (10 or 13 digits)" required name="isbn" value={formData.isbn} onChange={handleChange} />
                                        <InputField label="Edition" required name="edition" value={formData.edition} onChange={handleChange} />
                                        <SelectField label="Language" value={formData.language} onChange={(v) => setFormData(p => ({ ...p, language: v }))}>
                                            <SelectItem value="English">English</SelectItem>
                                            <SelectItem value="Hindi">Hindi</SelectItem>
                                            <SelectItem value="Bengali">Bengali</SelectItem>
                                        </SelectField>
                                        {formData.format === 'PHYSICAL' && (
                                            <InputField label="Page Count" required name="pageCount" type="number" value={formData.pageCount} onChange={handleChange} />
                                        )}
                                    </div>
                                )}

                                {formData.productType === 'NOTEBOOK' && (
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <SelectField label="Ruling Type" value={formData.rulingType} onChange={v => setFormData(p => ({ ...p, rulingType: v }))}>
                                            <SelectItem value="SINGLE">Single Line</SelectItem>
                                            <SelectItem value="DOUBLE">Double Line</SelectItem>
                                            <SelectItem value="UNRULED">Unruled</SelectItem>
                                            <SelectItem value="FOUR">Four Line</SelectItem>
                                            <SelectItem value="GRAPH">Graph</SelectItem>
                                        </SelectField>
                                        <InputField label="Page Count" name="pageCount" type="number" value={formData.pageCount} onChange={handleChange} />
                                        <InputField label="Paper GSM" name="paperGsm" type="number" value={formData.paperGsm} onChange={handleChange} placeholder="70" />
                                        <SelectField label="Binding Type" value={formData.bindingType} onChange={v => setFormData(p => ({ ...p, bindingType: v }))}>
                                            <SelectItem value="STITCHED">Stitched</SelectItem>
                                            <SelectItem value="SPIRAL">Spiral</SelectItem>
                                            <SelectItem value="HARD">Hard Bound</SelectItem>
                                        </SelectField>
                                    </div>
                                )}

                                {formData.productType === 'STATIONERY' && (
                                    <div className="grid md:grid-cols-2 gap-4">
                                        <InputField label="Brand Name" name="brand" value={formData.brand} onChange={handleChange} />
                                        <InputField label="Pack Size" name="packSize" type="number" value={formData.packSize} onChange={handleChange} />
                                        <InputField label="Material" name="material" value={formData.material} onChange={handleChange} />
                                    </div>
                                )}
                            </Section>
                        )}

                        {currentStep === 5 && (
                            /* STEP 5: PRICING */
                            <Section title="Step 5: Pricing & Commercials" icon={IndianRupee}>
                                <div className="col-span-full mb-2">
                                    <p className="text-sm font-bold text-primary italic">
                                        * u should add GST before adding the product price
                                    </p>
                                </div>
                                <div className="grid md:grid-cols-2 gap-6">
                                    <div className="space-y-4">
                                        <InputField label="Maximum Retail Price (MRP)" required name="mrp" type="number" value={formData.mrp} onChange={handleChange} />
                                        <InputField label="Selling Price" name="sellingPrice" required type="number" value={formData.sellingPrice} onChange={handleChange} />

                                        {['NOTEBOOK', 'STATIONERY'].includes(formData.productType) && (
                                            <div className="grid grid-cols-2 gap-4 bg-muted/30 p-4 rounded-xl border">
                                                <InputField
                                                    label="GST Rate (%)"
                                                    name="gstRate"
                                                    type="number"
                                                    step="0.01"
                                                    min="0"
                                                    max="28"
                                                    value={formData.gstRate}
                                                    onChange={handleChange}
                                                    placeholder="e.g. 18"
                                                />
                                                {/* GST Inclusive toggle removed as per request */}
                                            </div>
                                        )}
                                    </div>
                                    <div className="bg-primary/5 p-4 rounded-xl border border-primary/20">
                                        <div className="flex justify-between items-center mb-2">
                                            <span className="text-sm font-medium">Auto-calculated Discount</span>
                                            <Badge variant="outline" className="bg-card">{formData.discount}%</Badge>
                                        </div>
                                        <div className="text-xs text-muted-foreground mt-4 space-y-1">
                                            <p>• Estimated Admin Commission (10%): ₹{(formData.sellingPrice * 0.1).toFixed(2)}</p>
                                            <p className="font-bold text-primary">• Your Payout: ₹{(formData.sellingPrice * 0.9).toFixed(2)}</p>
                                        </div>
                                    </div>
                                </div>
                            </Section>
                        )}

                        {currentStep === 6 && (
                            /* STEP 6: INVENTORY */
                            <Section title="Step 6: Inventory & Shipping" icon={Box}>
                                <div className="grid md:grid-cols-2 gap-4">
                                    <InputField
                                        label="Stock Quantity"
                                        required
                                        name="stock"
                                        type="number"
                                        value={formData.stock}
                                        onChange={handleChange}
                                        disabled={formData.format === 'EBOOK'}
                                    />
                                    {formData.format === 'PHYSICAL' && (
                                        <InputField
                                            label="Weight (kg)"
                                            required
                                            name="weight"
                                            type="number"
                                            step="0.01"
                                            value={formData.weight}
                                            onChange={handleChange}
                                        />
                                    )}
                                    <div className="md:col-span-2 flex items-center gap-2 bg-secondary/20 p-3 rounded-lg">
                                        <Switch
                                            checked={formData.format === 'EBOOK'}
                                            disabled={formData.format !== 'EBOOK'}
                                        />
                                        <span className="text-sm">Unlimited digital distribution enabled</span>
                                    </div>
                                </div>
                            </Section>
                        )}

                        {currentStep === 7 && (
                            /* STEP 7: METADATA */
                            <Section title="Step 7: Faceted Search Filters (Advanced)" icon={Tag}>
                                {metadataDefinitions.length > 0 ? (
                                    <MetadataSection
                                        definitions={metadataDefinitions}
                                        values={formData.metadata || {}}
                                        onChange={handleMetadataChange}
                                    />
                                ) : (
                                    <div className="text-center py-8 opacity-50">
                                        <Tag size={48} className="mx-auto mb-2" />
                                        <p>No additional filters for this category.</p>
                                    </div>
                                )}
                            </Section>
                        )}

                        {currentStep === 8 && (
                            /* STEP 8: MEDIA */
                            <Section title="Step 8: Product Media" icon={ImageIcon}>
                                <div className="space-y-6">
                                    {formData.format === 'EBOOK' && (
                                        <div className="bg-primary/5 p-4 border border-dashed border-primary/30 rounded-lg">
                                            <label className="text-sm font-bold block mb-2">E-Book PDF Upload</label>
                                            <input
                                                type="file"
                                                accept=".pdf"
                                                onChange={e => setPdfFile(e.target.files[0])}
                                                className="text-sm file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-primary file:text-white"
                                            />
                                            {pdfFile && <p className="text-xs mt-2 text-green-600 font-medium">Current file: {pdfFile.name}</p>}
                                        </div>
                                    )}

                                    <TextareaField
                                        label="Brief Specifications"
                                        name="specifications"
                                        value={formData.specifications}
                                        onChange={handleChange}
                                        rows={3}
                                    />

                                    <Section title="Search Engine Optimized (SEO)">
                                        <InputField label="Meta Title" name="metaTitle" value={formData.metaTitle} onChange={handleChange} />
                                        <TextareaField label="Meta Description" name="metaDescription" value={formData.metaDescription} onChange={handleChange} rows={2} />
                                        <div className="space-y-2">
                                            <label className="text-sm font-medium">Discovery Tags (Hashtags)</label>
                                            <TagInput
                                                values={formData.tags || []}
                                                onChange={(tags) => setFormData(prev => ({ ...prev, tags }))}
                                                placeholder="Add a tag..."
                                            />
                                        </div>
                                    </Section>
                                </div>
                            </Section>
                        )}

                        {/* WIZARD NAVIGATION */}
                        <div className="flex justify-between items-center bg-card border rounded-xl p-4 mt-6">
                            <Button variant="outline" onClick={prevStep} disabled={currentStep === 1 || (editMode && currentStep === 2)}>
                                Previous Step
                            </Button>

                            <div className="flex gap-2">
                                <Button variant="ghost" onClick={() => setPreviewOpen(true)} className="gap-2">
                                    <Eye size={18} /> Preview
                                </Button>

                                {currentStep < totalSteps ? (
                                    <Button onClick={nextStep} className="gap-2">
                                        Next Step
                                    </Button>
                                ) : (
                                    <Button onClick={handleSubmit} className="gap-2 bg-primary hover:bg-primary-foreground">
                                        <Save size={18} /> {editMode ? 'Update Catalog' : 'Publish Product'}
                                    </Button>
                                )}
                            </div>
                        </div>
                    </div>

                    {/* RIGHT SUMMARY */}
                    <div className="space-y-4 lg:sticky lg:top-24 h-fit">
                        {/* GALLERY UPLOAD */}
                        <SummaryCard title="Product Gallery">
                            <div className="grid grid-cols-3 gap-2">
                                {galleryPreviews.map((src, index) => (
                                    <div key={index} className="relative aspect-square border rounded-md overflow-hidden group">
                                        <img src={src} alt={`Gallery ${index}`} className="w-full h-full object-cover" />
                                        <button
                                            type="button"
                                            className="absolute top-2 right-2 bg-red-600/90 text-white p-2 rounded-md shadow-md opacity-0 group-hover:opacity-100 transition-all duration-200 hover:bg-red-700 hover:scale-105"
                                            onClick={() => {
                                                const newPreviews = [...galleryPreviews];
                                                newPreviews.splice(index, 1);
                                                setGalleryPreviews(newPreviews);
                                            }}
                                        >
                                            <Trash2 className="h-4 w-4" />
                                        </button>
                                    </div>
                                ))}
                                <label className="cursor-pointer block aspect-square border-2 border-dashed rounded-md hover:border-primary flex flex-col items-center justify-center text-muted-foreground hover:text-primary transition">
                                    <Plus className="h-6 w-6" />
                                    <span className="text-[10px] uppercase font-bold mt-1">Add</span>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        hidden
                                        onChange={(e) => {
                                            const files = Array.from(e.target.files);
                                            if (files.length > 0) {
                                                setGalleryFiles(prev => [...prev, ...files]);
                                                const newPreviews = files.map(f => URL.createObjectURL(f));
                                                setGalleryPreviews(prev => [...prev, ...newPreviews]);
                                            }
                                        }}
                                    />
                                </label>
                            </div>
                        </SummaryCard>

                        <SummaryCard title="Product Image">
                            <label className="cursor-pointer block">
                                <div className="border-2 border-dashed rounded-lg p-6 text-center hover:border-primary transition">
                                    {imagePreview ? (
                                        <img src={imagePreview} alt="Preview" className="mx-auto h-40 object-contain" />
                                    ) : (
                                        <>
                                            <ImageIcon className="mx-auto text-muted-foreground" size={48} />
                                            <p className="text-sm mt-2">Click to upload image</p>
                                            <p className="text-xs text-muted-foreground">PNG / JPG (max 5MB)</p>
                                        </>
                                    )}
                                </div>
                                <input
                                    type="file"
                                    accept="image/*"
                                    hidden
                                    onChange={(e) => {
                                        const file = e.target.files[0];
                                        if (!file) return;
                                        if (file.size > 5 * 1024 * 1024) {
                                            toast({
                                                title: 'Image too large',
                                                description: 'Max size is 5MB',
                                                variant: 'destructive'
                                            });
                                            return;
                                        }
                                        setImageFile(file);
                                        setImagePreview(URL.createObjectURL(file));
                                    }}
                                />
                            </label>
                        </SummaryCard>

                        <SummaryCard title="Summary">
                            <div className="space-y-2">
                                <SummaryRow label="Type" value={formData.productType || '-'} />
                                <SummaryRow label="Category" value={formData.category || '-'} />
                                <SummaryRow label="Subcategory" value={formData.subcategory || '-'} />
                                <div className="border-t pt-2 mt-2">
                                    <SummaryRow label="MRP" value={`₹${formData.mrp || 0}`} />
                                    <SummaryRow label="Price" value={`₹${formData.sellingPrice || 0}`} />
                                </div>
                                <div className="border-t pt-2 mt-2">
                                    <SummaryRow label="Stock" value={`${formData.stock || 0} units`} />
                                </div>
                            </div>
                        </SummaryCard>
                    </div>
                </div>
            </div>

            {/* PREVIEW DIALOG */}
            <Dialog open={previewOpen} onOpenChange={setPreviewOpen}>
                <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle>Product Preview</DialogTitle>
                        <DialogDescription>
                            See how your product will appear to customers.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="grid md:grid-cols-2 gap-8 mt-4">
                        <div className="space-y-4">
                            <div className="aspect-[3/4] bg-secondary/30 rounded-lg overflow-hidden flex items-center justify-center border">
                                {imagePreview ? (
                                    <img src={imagePreview} alt="Preview" className="w-full h-full object-contain" />
                                ) : (
                                    <div className="text-center text-muted-foreground p-4">
                                        <ImageIcon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                                        <p>No image</p>
                                    </div>
                                )}
                            </div>
                        </div>
                        <div className="space-y-6">
                            <div>
                                <Badge className="mb-2">{formData.productType}</Badge>
                                <h1 className="text-2xl font-bold">{formData.productName || 'Unnamed'}</h1>
                                <p className="text-lg text-muted-foreground">{formData.mrp}</p>
                            </div>
                        </div>
                    </div>
                    <div className="flex justify-end mt-6">
                        <Button onClick={() => setPreviewOpen(false)}>Close</Button>
                    </div>
                </DialogContent>
            </Dialog>
        </Layout>
    );
}

/* -------------------- UI HELPERS -------------------- */

const Section = ({ title, icon: Icon, children }) => (
    <div className="bg-card border rounded-xl p-6 space-y-4">
        <h3 className="font-semibold flex items-center gap-2">
            {Icon && <Icon size={18} />} {title}
        </h3>
        {children}
    </div>
);

const InputField = ({ label, required, ...props }) => (
    <div>
        <label className="text-sm font-medium">
            {label} {required && <span className="text-foreground">*</span>}
        </label>
        <Input {...props} className="mt-1" />
    </div>
);

const TextareaField = ({ label, required, ...props }) => (
    <div>
        <label className="text-sm font-medium">
            {label} {required && <span className="text-foreground">*</span>}
        </label>
        <Textarea {...props} className="mt-1" />
    </div>
);

const SelectField = ({ label, required, children, value, onChange }) => (
    <div>
        <label className="text-sm font-medium">
            {label} {required && <span className="text-foreground">*</span>}
        </label>
        <Select value={value} onValueChange={onChange}>
            <SelectTrigger className="mt-1">
                <SelectValue placeholder="Select" />
            </SelectTrigger>
            <SelectContent>{children}</SelectContent>
        </Select>
    </div>
);

const SummaryCard = ({ title, children }) => (
    <div className="bg-card border rounded-xl p-4 space-y-3">
        <h3 className="font-semibold text-sm uppercase text-muted-foreground">{title}</h3>
        {children}
    </div>
);

const SummaryRow = ({ label, value }) => (
    <div className="flex justify-between text-sm py-1">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{value || '-'}</span>
    </div>
);