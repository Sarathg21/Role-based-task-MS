const Badge = ({ children, variant = 'default', className = '' }) => {
    const variants = {
        default: 'bg-slate-100 text-slate-700 border-slate-200',
        success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        warning: 'bg-amber-50 text-amber-700 border-amber-200',
        danger: 'bg-rose-50 text-rose-700 border-rose-200',
        info: 'bg-sky-50 text-sky-700 border-sky-200',
        primary: 'bg-violet-50 text-violet-700 border-violet-200',
        // Status specific
        APPROVED: 'bg-green-100 text-green-700 border-green-200',
        SUBMITTED: 'bg-blue-100 text-blue-700 border-blue-200',
        WORKING_ON_IT: 'bg-orange-100 text-orange-700 border-orange-200',
        REWORK: 'bg-red-100 text-red-700 border-red-200',
        NEW: 'bg-slate-100 text-slate-700 border-slate-200',
        CANCELLED: 'bg-red-100 text-red-700 border-red-200',
        Overdue: 'bg-rose-100 text-rose-700 border-rose-300'
    };

    return (
        <span className={`inline-flex items-center justify-center px-2 py-0.5 rounded-full text-[11px] font-normal border min-w-0 max-w-full truncate ${variants[variant] ? variants[variant] : variants.default} ${className}`}>
            {children}
        </span>
    );
};

export default Badge;
