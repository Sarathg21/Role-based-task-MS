import { ArrowUp, ArrowDown } from 'lucide-react';

const StatsCard = ({ title, label, value, icon: Icon, trend, trendValue, color = 'primary', compact = false, size = 'md' }) => {
    const displayTitle = title || label;
    const isSmall = size === 'sm' || compact;

    const getTrendColor = () => {
        if (typeof trend === 'number') {
            return trend >= 0 ? 'text-emerald-600 bg-emerald-50 border-emerald-100' : 'text-rose-600 bg-rose-50 border-rose-100';
        }
        if (trend === 'up') return 'text-emerald-600 bg-emerald-50 border border-emerald-100';
        if (trend === 'down') return 'text-rose-600 bg-rose-50 border border-rose-100';
        return 'text-slate-500 bg-slate-100 border border-slate-200';
    };

    const colorMap = {
        primary: { gradient: 'from-violet-500 to-violet-700', shadow: 'shadow-violet-200/50', glow: 'rgba(139,92,246,0.1)' },
        violet: { gradient: 'from-violet-500 to-violet-700', shadow: 'shadow-violet-200/50', glow: 'rgba(139,92,246,0.1)' },
        success: { gradient: 'from-emerald-400 to-emerald-600', shadow: 'shadow-emerald-200/50', glow: 'rgba(16,185,129,0.1)' },
        emerald: { gradient: 'from-emerald-400 to-emerald-600', shadow: 'shadow-emerald-200/50', glow: 'rgba(16,185,129,0.1)' },
        warning: { gradient: 'from-amber-400 to-amber-600', shadow: 'shadow-amber-200/50', glow: 'rgba(245,158,11,0.1)' },
        amber: { gradient: 'from-amber-400 to-amber-600', shadow: 'shadow-amber-200/50', glow: 'rgba(245,158,11,0.1)' },
        danger: { gradient: 'from-rose-500 to-rose-700', shadow: 'shadow-rose-200/50', glow: 'rgba(239,68,68,0.1)' },
        rose: { gradient: 'from-rose-500 to-rose-700', shadow: 'shadow-rose-200/50', glow: 'rgba(239,68,68,0.1)' },
        info: { gradient: 'from-sky-400 to-sky-600', shadow: 'shadow-sky-200/50', glow: 'rgba(14,165,233,0.1)' },
    };

    const c = colorMap[color] || colorMap.primary;
    const glowClass = `glow-${color === 'emerald' ? 'emerald' : color === 'rose' ? 'rose' : color === 'amber' ? 'amber' : 'violet'}`;

    return (
        <div
            className={`stat-card group relative overflow-hidden transition-all duration-300 hover-lift ${glowClass} ${isSmall ? 'py-2.5 px-4' : 'py-5 px-6'} mesh-gradient card-gloss`}
            style={{ '--glow-color': c.glow }}
        >
            {/* Top glass line accent */}
            <div className={`absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-${color === 'primary' ? 'violet' : color === 'emerald' ? 'emerald' : color === 'rose' ? 'rose' : color === 'amber' ? 'amber' : 'violet'}-300 to-transparent opacity-80`} />

            <div className="flex items-center gap-4 relative z-10">
                <div className={`
                    flex-shrink-0 flex items-center justify-center
                    bg-gradient-to-br ${c.gradient}
                    shadow-md ${c.shadow}
                    transition-all duration-300
                    group-hover:rotate-6
                    ${isSmall ? 'w-9 h-9 rounded-lg' : 'w-12 h-12 rounded-2xl'}
                `}>
                    {Icon && <Icon size={isSmall ? 18 : 24} className="text-white drop-shadow-sm" strokeWidth={2.5} />}
                </div>

                <div className="min-w-0 flex-1">
                    <div className="flex items-baseline gap-2">
                        <h3 className={`font-black text-slate-800 tabular-nums tracking-tighter leading-none group-hover:text-${color === 'emerald' ? 'emerald-600' : color === 'rose' ? 'rose-600' : color === 'violet' ? 'violet-600' : 'slate-900'} transition-colors ${isSmall ? 'text-xl' : 'text-3xl'}`}>
                            {value ?? '—'}
                        </h3>
                        {trendValue !== undefined || trend !== undefined ? (
                            <span className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-black border ${getTrendColor()} transition-transform group-hover:scale-110 status-ring-pulse`}>
                                {trend === 'up' || (typeof trend === 'number' && trend > 0) ? <ArrowUp size={8} strokeWidth={3} /> : <ArrowDown size={8} strokeWidth={3} />}
                                {trendValue || (typeof trend === 'number' ? Math.abs(trend) + '%' : '')}
                            </span>
                        ) : null}
                    </div>
                    <p className={`font-bold text-slate-400 uppercase tracking-widest truncate mt-1 ${isSmall ? 'text-[9px]' : 'text-[10px]'}`}>
                        {displayTitle}
                    </p>
                </div>
            </div>

            {/* Subtle bottom accent - pulsing on hover */}
            <div className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-${color === 'primary' ? 'violet' : color === 'emerald' ? 'emerald' : color === 'rose' ? 'rose' : color === 'amber' ? 'amber' : 'violet'}-400 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />
        </div>
    );
};

export default StatsCard;
