import React, { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check } from 'lucide-react';

const CustomSelect = ({
    options,
    value,
    onChange,
    placeholder = "Select option",
    className = "",
    style = {},
    variant = "default"
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

    const selectedOption = options.find(opt => String(opt.value) === String(value)) || 
                           options.find(opt => String(opt.label) === String(value));
    const displayLabel = selectedOption ? selectedOption.label : placeholder;

    const buttonClasses = variant === 'borderless'
        ? "w-full flex items-center justify-between px-4 py-2 bg-transparent border-none rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 focus:outline-none transition-all"
        : "w-full flex items-center justify-between px-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm font-medium text-slate-700 hover:border-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-500/20 transition-all shadow-sm";

    return (
        <div
            ref={containerRef}
            className={`relative inline-block ${className}`}
            style={style}
        >
            <button
                type="button"
                onClick={() => setIsOpen(!isOpen)}
                className={buttonClasses}
            >
                <span className="whitespace-nowrap px-1">{displayLabel}</span>
                <ChevronDown
                    size={16}
                    className={`text-slate-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                />
            </button>

            {isOpen && (
                <div className="absolute z-[100] mt-2 w-full min-w-[180px] bg-white/95 backdrop-blur-xl border border-slate-100/50 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] py-1.5 overflow-hidden animate-in fade-in zoom-in duration-100 origin-top">
                    <div className="max-h-60 overflow-y-auto custom-scrollbar p-1">
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
