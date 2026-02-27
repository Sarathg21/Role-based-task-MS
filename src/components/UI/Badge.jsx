const Badge = ({ children, variant = 'default', className = '' }) => {
    const variants = {
        // Semantic
        default: 'bg-slate-500 text-white border-slate-500',
        success: 'bg-emerald-600 text-white border-emerald-600',
        warning: 'bg-amber-500 text-white border-amber-500',
        danger: 'bg-rose-600 text-white border-rose-600',
        info: 'bg-sky-500 text-white border-sky-500',
        primary: 'bg-violet-600 text-white border-violet-600',

        // ── Task status badges ──
        NEW: 'bg-blue-500 text-white border-blue-500',
        IN_PROGRESS: 'bg-indigo-500 text-white border-indigo-500',
        WORKING_ON_IT: 'bg-indigo-500 text-white border-indigo-500',
        SUBMITTED: 'bg-amber-400 text-amber-900 border-amber-400',
        APPROVED: 'bg-green-600 text-white border-green-600',
        REWORK: 'bg-orange-600 text-white border-orange-600',
        CANCELLED: 'bg-slate-400 text-white border-slate-400',
        // ── Action-based variants ──
        Approve: 'bg-green-600 text-white border-green-600',
        Rework: 'bg-orange-600 text-white border-orange-600',
        Reassign: 'bg-blue-500 text-white border-blue-500',
        Cancel: 'bg-red-600 text-white border-red-600',
        Overdue: 'bg-rose-600 text-white border-rose-600',

        // ── Severity badges ──
        High: 'bg-red-600 text-white border-red-600',
        Medium: 'bg-amber-500 text-white border-amber-500',
        Low: 'bg-emerald-500 text-white border-emerald-500',
    };

    return (
        <span
            className={`
                inline-flex items-center justify-center
                px-4 py-2
                rounded-full
                text-xs font-semibold
                border
                whitespace-nowrap
                shadow-sm
                ${variants[variant] ?? variants.default}
                ${className}
            `}
        >
            {children}
        </span>
    );
};

export default Badge;