const Badge = ({ children, variant = 'default', className = '' }) => {
    const variants = {
        // Semantic
        default: 'bg-slate-100 text-slate-600 border-slate-200',
        success: 'bg-emerald-50 text-emerald-700 border-emerald-200',
        warning: 'bg-amber-50 text-amber-700 border-amber-200',
        danger: 'bg-rose-50 text-rose-700 border-rose-200',
        info: 'bg-sky-50 text-sky-700 border-sky-200',
        primary: 'bg-violet-50 text-violet-700 border-violet-200',

        // ── Task status badges ──────────────────────────────────────────
        NEW: 'bg-blue-100 text-blue-700 border-blue-200',       // Blue      — Not started
        IN_PROGRESS: 'bg-amber-100 text-amber-700 border-amber-200',    // Amber     — Work ongoing
        WORKING_ON_IT: 'bg-amber-100 text-amber-700 border-amber-200',    // Amber     — alias
        SUBMITTED: 'bg-violet-100 text-violet-700 border-violet-200', // Purple    — Awaiting review
        APPROVED: 'bg-green-100 text-green-700 border-green-200',    // Green     — Completed
        REWORK: 'bg-orange-100 text-orange-700 border-orange-300', // Orange-Red— Needs correction
        CANCELLED: 'bg-slate-100 text-slate-500 border-slate-200',    // Gray      — Terminated
        Overdue: 'bg-rose-100 text-rose-700 border-rose-300',       // Rose      — Past due
    };

    return (
        <span
            className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-[11px] font-semibold border min-w-0 max-w-full truncate ${variants[variant] ?? variants.default} ${className}`}
        >
            {children}
        </span>
    );
};

export default Badge;
