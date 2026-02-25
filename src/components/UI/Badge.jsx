const Badge = ({ children, variant = 'default', className = '' }) => {
    const variants = {
        // Semantic
        default: 'bg-slate-500 text-white border-slate-500',
        success: 'bg-emerald-600 text-white border-emerald-600',
        warning: 'bg-amber-500 text-white border-amber-500',
        danger: 'bg-rose-600 text-white border-rose-600',
        info: 'bg-sky-500 text-white border-sky-500',
        primary: 'bg-violet-600 text-white border-violet-600',

        // ── Task status badges — solid filled, same style as action buttons ──
        NEW: 'bg-blue-500 text-white border-blue-500',          // Blue   — Not started
        IN_PROGRESS: 'bg-amber-500 text-white border-amber-500',        // Amber  — Work ongoing
        WORKING_ON_IT: 'bg-amber-500 text-white border-amber-500',        // Amber  — alias
        SUBMITTED: 'bg-violet-600 text-white border-violet-600',      // Purple — Awaiting review
        APPROVED: 'bg-green-600 text-white border-green-600',        // Green  — Done
        Completed: 'bg-green-600 text-white border-green-600',        // Green  — Done (alt)
        REWORK: 'bg-orange-500 text-white border-orange-500',      // Orange — Needs correction
        CANCELLED: 'bg-slate-400 text-white border-slate-400',        // Gray   — Terminated
        Overdue: 'bg-rose-600 text-white border-rose-600',          // Red    — Past due

        // ── Severity badges — vivid & high contrast ──────────────────────────
        High: 'bg-red-600 text-white border-red-700 shadow-red-300',    // Bold red
        Medium: 'bg-yellow-400 text-yellow-900 border-yellow-500 shadow-yellow-200', // Bold amber
        Low: 'bg-emerald-500 text-white border-emerald-600 shadow-emerald-200',   // Bold green
    };

    return (
        <span
            className={`inline-flex items-center justify-center w-24 px-2 py-1 rounded-md text-[11px] font-semibold border truncate shadow-sm ${variants[variant] ?? variants.default} ${className}`}
        >
            {children}
        </span>
    );
};

export default Badge;

