import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

const CustomSelect = ({
    options,
    value,
    onChange,
    placeholder = "Select option",
    className = "",
    style = {}
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const containerRef = useRef(null);

    // Close dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (containerRef.current && !containerRef.current.contains(event.target)) {
                setIsOpen(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const selectedOption = options.find(opt => opt.value === value) || options.find(opt => opt.label === value);
    const displayLabel = selectedOption ? selectedOption.label : placeholder;

    return (
        <div
            ref={containerRef}
            className={`relative inline-block ${className}`}
            style={style}
        >
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className="w-full flex items-center justify-between px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition-all shadow-sm"
            >
                <span className="truncate">{displayLabel}</span>
                <ChevronDown
                    size={16}
                    className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>

            {isOpen && (
                <div className="absolute z-[100] mt-2 w-full min-w-[160px] bg-white border border-slate-100 rounded-xl shadow-xl py-1 overflow-hidden animate-in fade-in zoom-in duration-100 origin-top">
                    <div className="max-h-60 overflow-y-auto custom-scrollbar">
                        {options.map((option, idx) => (
                            <button
                                key={`${option.value}-${idx}`}
                                type="button"
                                onClick={() => {
                                    onChange(option.value);
                                    setIsOpen(false);
                                }}
                                className={`w-full flex items-center justify-between px-4 py-2 text-sm transition-colors ${value === option.value
                                    ? 'bg-violet-50 text-violet-700 font-semibold'
                                    : 'text-slate-600 hover:bg-slate-50'
                                    }`}
                            >
                                <span>{option.label}</span>
                                {value === option.value && <Check size={14} className="text-violet-600" />}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

export default CustomSelect;
