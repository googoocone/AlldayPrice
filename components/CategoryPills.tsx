'use client';

import { CATEGORIES, type Category } from '@/lib/types';

interface CategoryPillsProps {
    selected: Category;
    onSelect: (category: Category) => void;
}

export default function CategoryPills({ selected, onSelect }: CategoryPillsProps) {
    return (
        <div className="px-4 py-3">
            <div className="flex flex-wrap gap-2">
                {CATEGORIES.map((category) => {
                    const isSelected = selected === category;
                    return (
                        <button
                            key={category}
                            onClick={() => onSelect(category)}
                            className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${isSelected
                                    ? 'bg-primary text-white shadow-md'
                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                }`}
                        >
                            {category}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
