'use client';

import { useState, useEffect, useRef } from 'react';
import { Combobox } from '@headlessui/react';
import { CheckIcon, ChevronUpDownIcon, XMarkIcon } from '@heroicons/react/20/solid';

interface Option {
    value: string;
    label: string;
}

interface MultiSelectAsyncProps {
    label: string;
    placeholder?: string;
    fetchOptions: (query: string) => Promise<Option[]>;
    value: string[];
    onChange: (value: string[]) => void;
}

export default function MultiSelectAsync({
    label,
    placeholder = 'Pesquisar...',
    fetchOptions,
    value,
    onChange,
}: MultiSelectAsyncProps) {
    const [query, setQuery] = useState('');
    const [options, setOptions] = useState<Option[]>([]);
    const [loading, setLoading] = useState(false);

    // Custom debounce implementation if hook doesn't exist
    // I will assume it doesn't exist to be safe and implement inside useEffect

    useEffect(() => {
        let active = true;

        const search = async () => {
            if (query.length < 2) {
                setOptions([]);
                return;
            }

            setLoading(true);
            try {
                const results = await fetchOptions(query);
                if (active) {
                    setOptions(results);
                }
            } catch (err) {
                console.error(err);
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        };

        const timer = setTimeout(() => {
            search();
        }, 300);

        return () => {
            active = false;
            clearTimeout(timer);
        };
    }, [query, fetchOptions]);

    const handleSelect = (selectedOptions: Option[]) => {
        // Headless UI Combobox multiple returns an array of selected objects if value is objects
        // But here we might want to manage it manually if we use simple strings
        // Let's see. If we pass `value` (string[]) to Combobox, it expects `onChange` to give string[].

        // We'll trust Headless UI to handle the array.
        // However, options change dynamically.
        // If the selected value is not in current `options`, Headless UI might have trouble rendering it if we only feed it `options`.
        // But for `selected` chips, we render them based on `value` prop.
        // The `Combobox.Input` is for search.

        // Actually, a better pattern for async + existing selections:
        // maintain `selectedItems` objects list if we need labels.
        // But here value and label are same. So string[] is fine.

        // NO, Headless UI Combobox(multiple) replaces the selection.
        // With autocomplete, we usually want to ADD to selection.

        // Let's implement controlled way:
        // We treat Combobox as a single select that adds to our list.
        // Or usage of multiple mode.

        // Let's try "Single select that adds to list" pattern
        // because "multiple" with "input text for search" is tricky in some versions.
        // But Headless UI v2.0 `multiple` works well.
        // Let's stick to `multiple={true}`.
        // But wait, if I select one, does it clear the query?
        // Headless UI v2.0 doesn't auto clear query on select.

        // Let's do the "Classic" multi-select:
        // Button/Input wrapper.
        // Chips rendered outside or inside.
    };

    // Since we are managing strings (names), let's render chips manually and use Combobox for *adding*.

    return (
        <div className="w-full">
            <label className="block text-sm font-medium text-gray-700 mb-2">
                {label}
            </label>

            <Combobox
                as="div"
                value={null} // We don't hold value in Combobox itself, we use it to emit events
                onChange={(option: Option | null) => {
                    if (option && !value.includes(option.value)) {
                        onChange([...value, option.value]);
                        setQuery(''); // Clear search
                    }
                }}
                nullable // Allow clearing
            >
                <div className="relative mt-1">
                    <div className="relative w-full cursor-default overflow-hidden rounded-lg bg-white text-left border border-gray-300 focus-within:ring-2 focus-within:ring-emerald-500 focus-within:border-emerald-500 sm:text-sm">
                        {/* Chips Container */}
                        <div className="flex flex-wrap gap-2 p-2 min-h-[42px]">
                            {value.map((item) => (
                                <span key={item} className="inline-flex items-center px-2 py-1 rounded bg-emerald-100 text-emerald-800 text-xs font-medium">
                                    {item}
                                    <button
                                        type="button"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onChange(value.filter((v) => v !== item));
                                        }}
                                        className="ml-1 text-emerald-600 hover:text-emerald-900 focus:outline-none"
                                    >
                                        <XMarkIcon className="h-3 w-3" aria-hidden="true" />
                                    </button>
                                </span>
                            ))}

                            <Combobox.Input
                                className="w-full border-none py-1 pl-2 pr-10 text-sm leading-5 text-gray-900 focus:ring-0 min-w-[120px]"
                                onChange={(event) => setQuery(event.target.value)}
                                displayValue={() => query} // Keep what user types
                                placeholder={value.length === 0 ? placeholder : ''}
                                value={query}
                            />

                            {/* Spinner */}
                            {loading && (
                                <div className="absolute right-8 top-1/2 -translate-y-1/2">
                                    <svg className="animate-spin h-4 w-4 text-emerald-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                </div>
                            )}

                            <Combobox.Button className="absolute inset-y-0 right-0 flex items-center pr-2">
                                <ChevronUpDownIcon
                                    className="h-5 w-5 text-gray-400"
                                    aria-hidden="true"
                                />
                            </Combobox.Button>
                        </div>
                    </div>

                    <Combobox.Options className="absolute z-10 mt-1 max-h-60 w-full overflow-auto rounded-md bg-white py-1 text-base shadow-lg ring-1 ring-black ring-opacity-5 focus:outline-none sm:text-sm">
                        {query.length > 0 && options.length === 0 && !loading ? (
                            <div className="relative cursor-default select-none py-2 px-4 text-gray-700">
                                Nenhum resultado encontrado.
                            </div>
                        ) : (
                            options.map((option) => (
                                <Combobox.Option
                                    key={option.value}
                                    className={({ active }) =>
                                        `relative cursor-default select-none py-2 pl-10 pr-4 ${active ? 'bg-emerald-600 text-white' : 'text-gray-900'
                                        }`
                                    }
                                    value={option}
                                >
                                    {({ selected, active }) => (
                                        <>
                                            <span
                                                className={`block truncate ${selected ? 'font-medium' : 'font-normal'
                                                    }`}
                                            >
                                                {option.label}
                                            </span>
                                            {/* We don't mark selected here because we remove them from list typically or just let them be re-selectable (no-op) */}
                                            {/* If we want to check if it's already selected: */}
                                            {value.includes(option.value) ? (
                                                <span
                                                    className={`absolute inset-y-0 left-0 flex items-center pl-3 ${active ? 'text-white' : 'text-emerald-600'
                                                        }`}
                                                >
                                                    <CheckIcon className="h-5 w-5" aria-hidden="true" />
                                                </span>
                                            ) : null}
                                        </>
                                    )}
                                </Combobox.Option>
                            ))
                        )}
                        {/* Allow selecting what the user typed if it's not in the list? 
                 The requirement says "puxe do banco" (pull from db), so likely restricted to DB or at least suggested.
                 But user said "joao or joão", maybe they want to verify spelling.
                 I won't enforce restrictions, but the autocomplete suggests DB values.
                 Currently if they type something not in DB, they can't select it with this setup unless I add a "Create 'query'" option.
                 For now, let's assume they pick from the list.
             */}
                    </Combobox.Options>
                </div>
            </Combobox>
        </div>
    );
}
