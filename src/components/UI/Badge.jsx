const Badge = ({ children, variant = 'default', className = '', dot = false, size = 'sm' }) => {
    const variants = {
        // Semantic
        default: 'bg-slate-100 text-slate-600 border-slate-200',
        success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        warning: 'bg-amber-50 text-amber-700 border-amber-200',
        danger: 'bg-rose-50 text-rose-700 border-rose-200',
        info: 'bg-sky-50 text-sky-700 border-sky-200',
        primary: 'bg-violet-50 text-violet-700 border-violet-200',

        // ── Task status badges ──
        NEW: 'bg-blue-50 text-blue-700 border-blue-200',
        IN_PROGRESS: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        WORKING_ON_IT: 'bg-indigo-50 text-indigo-700 border-indigo-200',
        SUBMITTED: 'bg-amber-50 text-amber-700 border-amber-200',
        APPROVED: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        REWORK: 'bg-orange-50 text-orange-700 border-orange-200',
        CANCELLED: 'bg-slate-100 text-slate-500 border-slate-200',

        // ── Action-based variants ──
        Approve: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        Rework: 'bg-orange-50 text-orange-700 border-orange-200',
        Reassign: 'bg-blue-50 text-blue-700 border-blue-200',
        Cancel: 'bg-rose-50 text-rose-700 border-rose-200',
        Overdue: 'bg-rose-50 text-rose-700 border-rose-200',

        // ── Severity badges ──
        HIGH: 'bg-red-50 text-red-700 border-red-200',
        MEDIUM: 'bg-amber-50 text-amber-700 border-amber-200',
        LOW: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    };

    const dotColors = {
        NEW: 'bg-blue-500', IN_PROGRESS: 'bg-indigo-500', SUBMITTED: 'bg-amber-500',
        APPROVED: 'bg-emerald-500', REWORK: 'bg-orange-500', CANCELLED: 'bg-slate-400',
        HIGH: 'bg-red-500', MEDIUM: 'bg-amber-500', LOW: 'bg-emerald-500',
        success: 'bg-emerald-500', warning: 'bg-amber-500', danger: 'bg-rose-500',
        primary: 'bg-violet-500', info: 'bg-sky-500', default: 'bg-slate-400',
    };

    const pulseVariants = ['REWORK', 'HIGH', 'danger', 'Cancel'];
    const shouldPulse = pulseVariants.includes(variant);
    const cls = variants[variant] ?? variants.default;
    const dotColor = dotColors[variant] ?? 'bg-slate-400';

    /* Size variants:
       sm  → compact table cell badge (default)
       md  → slightly more padding for standalone usage  */
    const sizeClass = size === 'md'
        ? 'px-3 py-1 text-xs'
        : 'px-2 py-0.5 text-[11px]';

    return (
        <span
            className={`
                inline-flex items-center gap-1.5
                ${sizeClass}
                rounded-full
                font-black
                uppercase
                tracking-tight
                border
                whitespace-nowrap
                select-none
                transition-all duration-300
                ${shouldPulse ? 'status-ring-pulse shadow-glow' : 'shadow-sm'}
                ${cls}
                ${className}
            `}
        >
            {dot && (
                <span
                    className={`inline-block w-1.5 h-1.5 rounded-full flex-shrink-0 ${dotColor} ${shouldPulse ? 'animate-pulse' : ''}`}
                />
            )}
            {children}
        </span>
    );
};

export default Badge;