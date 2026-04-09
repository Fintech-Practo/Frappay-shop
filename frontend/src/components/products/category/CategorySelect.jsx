import  { useState, useEffect } from 'react';
import {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem
} from '@/components/ui/select';
import api from '@/config/api';

/**
 * CategorySelect Component
 * 
 * Handles unlimited depth category selection.
 * 
 * @param {string} value - The selected leaf category ID
 * @param {function} onChange - Callback (leafId) => void
 * @param {string} productType - Optional product type filter (BOOK, NOTEBOOK, etc.)
 * @param {string} className - Optional util classes
 */
export default function CategorySelect({ value, onChange, productType, className }) {
    const [tree, setTree] = useState([]);
    const [loading, setLoading] = useState(true);
    const [selectedPath, setSelectedPath] = useState([]);

    // Fetch Full Category Tree
    useEffect(() => {
        const fetchTree = async () => {
            try {
              
                const res = await api.get('/api/products/tree');
                if (res.data.success) {
                    setTree(res.data.data.categories || []);
                }
            } catch (err) {
                console.error("Category tree fetch failed", err);
            } finally {
                setLoading(false);
            }
        };
        fetchTree();
    }, []);

     const findPathToNode = (nodes, targetId, currentPath = []) => {
        for (const node of nodes) {
            const newPath = [...currentPath, node];
            if (String(node.id) === String(targetId)) {
                return newPath;
            }
            if (node.children && node.children.length > 0) {
                const result = findPathToNode(node.children, targetId, newPath);
                if (result) return result;
            }
        }
        return null;
    };

    useEffect(() => {
        if (!loading && tree.length > 0) {
            if (value) {
                const path = findPathToNode(tree, value);
                if (path) {
                    if (productType && path[0].product_type_code !== productType) {
                       
                        setSelectedPath([]);
                    } else {
                        setSelectedPath(path);
                    }
                }
            } else {
                setSelectedPath([]);
            }
        }
    }, [value, loading, tree, productType]);


    // handle selection at a specific level
    const handleSelect = (level, nodeId) => {
       
        let currentOptions = tree;
        if (productType) {
            currentOptions = tree.filter(n => n.product_type_code === productType);
        }

        // For levels > 0, we need to find children of the known path
        if (level > 0) {
            // we trust selectedPath up to level-1 is correct
            const parent = selectedPath[level - 1];
            currentOptions = parent.children || [];
        }

        const selectedNode = currentOptions.find(n => String(n.id) === String(nodeId));
        if (!selectedNode) return;

        // Construct new path: keep up to level, add new node
        const newPath = [...selectedPath.slice(0, level), selectedNode];
        setSelectedPath(newPath);

        // If this is a LEAF (no children), trigger onChange
        const isLeaf = !selectedNode.children || selectedNode.children.length === 0;

        if (isLeaf) {
            onChange(selectedNode.id);
        } else {
            // It's a parent, so we haven't reached a leaf yet.
            // Clear the parent's value (leafId) because the user is changing branch
            onChange('');
        }
    };


    if (loading) return <div className="text-muted-foreground text-sm animate-pulse">Loading categories...</div>;

    // Filter roots based on productType
    const roots = productType ? tree.filter(n => n.product_type_code === productType) : tree;

    if (roots.length === 0) return <div className="text-sm text-muted-foreground">No categories found for {productType}</div>;

    const levelsToRender = [];

    // Level 0 options
    levelsToRender.push({
        level: 0,
        options: roots,
        value: selectedPath[0]?.id || ''
    });

    // Subsequent levels
    for (let i = 0; i < selectedPath.length; i++) {
        const node = selectedPath[i];
        if (node.children && node.children.length > 0) {
            levelsToRender.push({
                level: i + 1,
                options: node.children,
                value: selectedPath[i + 1]?.id || ''
            });
        }
    }

    return (
        <div className={`space-y-4 ${className}`}>
            {levelsToRender.map((layer, idx) => (
                <div key={idx}>
                    <label className="text-sm font-medium mb-1 block">
                        {idx === 0 ? "Category" :
                            idx === 1 ? "Subcategory" :
                                `Subsection (Level ${idx + 1})`}
                    </label>
                    <Select
                        value={String(layer.value)}
                        onValueChange={(val) => handleSelect(layer.level, val)}
                    >
                        <SelectTrigger>
                            <SelectValue placeholder={`Select ${idx === 0 ? 'Category' : 'Option'}`} />
                        </SelectTrigger>
                        <SelectContent>
                            {layer.options.map(opt => (
                                <SelectItem key={opt.id} value={String(opt.id)}>
                                    {opt.name}
                                </SelectItem>
                            ))}
                        </SelectContent>
                    </Select>
                </div>
            ))}
        </div>
    );
}