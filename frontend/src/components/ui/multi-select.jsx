import React, { useState, useEffect, useRef } from 'react';
import { Check, ChevronsUpDown, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
    Command,
    CommandEmpty,
    CommandGroup,
    CommandInput,
    CommandItem,
    CommandList,
} from '@/components/ui/command';
import {
    Popover,
    PopoverContent,
    PopoverTrigger,
} from '@/components/ui/popover';
import { Badge } from '@/components/ui/badge';

export function MultiSelect({ options, selected, onChange, placeholder = "Select items..." }) {
    const [open, setOpen] = useState(false);

    // Ensure selected is always an array
    const selectedArray = Array.isArray(selected) ? selected : [];

    const handleSelect = (value) => {
        if (selectedArray.includes(value)) {
            onChange(selectedArray.filter((item) => item !== value));
        } else {
            onChange([...selectedArray, value]);
        }
    };

    const handleRemove = (value, e) => {
        e.stopPropagation();
        onChange(selectedArray.filter((item) => item !== value));
    };

    return (
        <Popover open={open} onOpenChange={setOpen}>
            <PopoverTrigger asChild>
                <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={open}
                    className="w-full justify-between hover:bg-transparent h-auto min-h-10 py-2"
                >
                    <div className="flex flex-wrap gap-1">
                        {selectedArray.length === 0 && (
                            <span className="text-muted-foreground font-normal">{placeholder}</span>
                        )}
                        {selectedArray.map((item) => (
                            <Badge
                                variant="secondary"
                                key={item}
                                className="mr-1 mb-1 font-normal"
                                onClick={(e) => handleRemove(item, e)}
                            >
                                {options.find((opt) => opt.value === item)?.label || item}
                                <X className="ml-1 h-3 w-3 hover:text-destructive cursor-pointer" />
                            </Badge>
                        ))}
                    </div>
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                </Button>
            </PopoverTrigger>
            <PopoverContent className="w-[300px] p-0" align="start">
                <Command>
                    <CommandInput placeholder={`Search...`} />
                    <CommandEmpty>No item found.</CommandEmpty>
                    <CommandGroup className="max-h-60 overflow-auto">
                        <CommandList>
                            {options.map((option) => (
                                <CommandItem
                                    key={option.value}
                                    value={option.value}
                                    onSelect={() => handleSelect(option.value)}
                                >
                                    <Check
                                        className={cn(
                                            "mr-2 h-4 w-4",
                                            selectedArray.includes(option.value) ? "opacity-100" : "opacity-0"
                                        )}
                                    />
                                    {option.label}
                                </CommandItem>
                            ))}
                        </CommandList>
                    </CommandGroup>
                </Command>
            </PopoverContent>
        </Popover>
    );
}
