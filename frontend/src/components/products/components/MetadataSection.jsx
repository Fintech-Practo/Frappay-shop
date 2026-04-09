import React from 'react';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue
} from '@/components/ui/select';
import { MultiSelect } from '@/components/ui/multi-select';
import { Switch } from '@/components/ui/switch';
import { TagInput } from '@/components/ui/tag-input';

export function MetadataSection({ definitions, values, onChange }) {
    if (!definitions || definitions.length === 0) return null;

    // Group definitions by group_name
    const groups = definitions.reduce((acc, def) => {
        const group = def.group_name || 'General';
        if (!acc[group]) acc[group] = [];
        acc[group].push(def);
        return acc;
    }, {});

    return (
        <div className="space-y-8 mt-4">
            {Object.entries(groups).map(([groupName, groupDefs]) => (
                <div key={groupName} className="space-y-4">
                    <h3 className="text-lg font-semibold border-b pb-2">{groupName}</h3>
                    <div className="grid md:grid-cols-2 gap-6">
                        {groupDefs.sort((a, b) => (a.sort_order || 0) - (b.sort_order || 0)).map((def) => {
                            const slug = def.slug;
                            const currentValue = values[slug] !== undefined ? values[slug] : (def.is_multi_select ? [] : '');

                            return (
                                <div key={slug} className="space-y-2">
                                    <Label>
                                        {def.name}
                                    </Label>

                                    {def.data_type === 'ENUM' && def.is_multi_select && (
                                        <MultiSelect
                                            options={(def.options || []).map(opt => ({ label: opt.value, value: opt.value }))}
                                            selected={Array.isArray(currentValue) ? currentValue : []}
                                            onChange={(newValues) => onChange(slug, newValues)}
                                            placeholder={`Select ${def.name}...`}
                                        />
                                    )}

                                    {def.data_type === 'ENUM' && !def.is_multi_select && (
                                        <Select
                                            value={currentValue ? String(currentValue) : ''}
                                            onValueChange={(val) => onChange(slug, val)}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder={`Select ${def.name}...`} />
                                            </SelectTrigger>
                                            <SelectContent>
                                                {(def.options || []).map(opt => (
                                                    <SelectItem key={opt.id} value={String(opt.value)}>
                                                        {opt.value}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}


                                    {def.data_type === 'BOOLEAN' && (
                                        <div className="flex items-center h-10 border rounded-md px-3 bg-background">
                                            <Switch
                                                checked={currentValue === 'true' || currentValue === true}
                                                onCheckedChange={(checked) => onChange(slug, checked)}
                                            />
                                            <span className="ml-2 text-sm text-muted-foreground">
                                                {(currentValue === 'true' || currentValue === true) ? 'Yes' : 'No'}
                                            </span>
                                        </div>
                                    )}

                                    {def.data_type === 'STRING' && (
                                        def.is_multi_select ? (
                                            <TagInput
                                                values={Array.isArray(currentValue) ? currentValue : []}
                                                onChange={(vals) => onChange(slug, vals)}
                                                placeholder={`Add ${def.name}`}
                                            />
                                        ) : (
                                            <Input
                                                type="text"
                                                placeholder={`Enter ${def.name}`}
                                                value={currentValue}
                                                onChange={(e) => onChange(slug, e.target.value)}
                                            />
                                        )
                                    )}

                                    {def.data_type === 'NUMBER' && (
                                        <Input
                                            type="number"
                                            placeholder={`Enter ${def.name}`}
                                            value={currentValue}
                                            onChange={(e) => onChange(slug, e.target.value)}
                                        />
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
}
