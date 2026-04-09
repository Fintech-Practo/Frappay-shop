import { useState } from 'react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

export function TagInput({ values = [], onChange, placeholder }) {
    const [input, setInput] = useState('');

    const addTag = () => {
        const trimmed = input.trim().toLowerCase();
        if (!trimmed) return;
        if (values.includes(trimmed)) return;
        if (trimmed.length > 50) return; // Validation: Max length 50
        if (values.length >= 50) return; // Validation: Max 50 tags

        onChange([...values, trimmed]);
        setInput('');
    };

    const removeTag = (tag) => {
        onChange(values.filter(t => t !== tag));
    };

    return (
        <div className="space-y-2">
            <div className="flex gap-2">
                <Input
                    value={input}
                    placeholder={placeholder}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                            e.preventDefault();
                            addTag();
                        }
                    }}
                />
                <Button type="button" onClick={addTag}>+</Button>
            </div>

            <div className="flex flex-wrap gap-2">
                {values.map((tag, idx) => (
                    <Badge key={idx} variant="secondary" className="flex items-center gap-1">
                        {tag}
                        <X
                            size={14}
                            className="cursor-pointer"
                            onClick={() => removeTag(tag)}
                        />
                    </Badge>
                ))}
            </div>
        </div>
    );
}
