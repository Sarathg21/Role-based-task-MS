import { ArrowUp, ArrowDown } from 'lucide-react';

const StatsCard = ({ title, value, icon: Icon, trend, trendValue, color = 'primary' }) => {
    const getTrendColor = () => {
        if (trend === 'up') return 'text-emerald-600 bg-emerald-50';
        if (trend === 'down') return 'text-rose-600 bg-rose-50';
        return 'text-slate-500 bg-slate-100';
    };

    const colorVariants = {
        primary: 'from-blue-500 to-blue-600 text-white shadow-blue-200',
        success: 'from-emerald-500 to-emerald-600 text-white shadow-emerald-200',
        warning: 'from-amber-400 to-amber-500 text-white shadow-amber-200',
        danger: 'from-rose-500 to-rose-600 text-white shadow-rose-200',
        purple: 'from-violet-500 to-violet-600 text-white shadow-violet-200',
        info: 'from-cyan-400 to-cyan-500 text-white shadow-cyan-200'
    };

    return (
        <div className="bg-white p-6 rounded-2xl shadow-[0_2px_10px_-3px_rgba(6,81,237,0.1)] border border-slate-100/50 hover:shadow-lg transition-all duration-300 group">
            <div className="flex justify-between items-start">
                <div className="space-y-1">
                    <p className="text-sm font-medium text-slate-500 tracking-wide">{title}</p>
                    <h3 className="text-2xl font-bold text-slate-800 tracking-tight">{value}</h3>
                </div>
                <div className={`p-3 rounded-xl bg-gradient-to-br shadow-lg ${colorVariants[color] || colorVariants.primary} transform group-hover:scale-110 transition-transform duration-300`}>
                    {Icon && <Icon size={22} strokeWidth={2} />}
                </div>
            </div>

            {trendValue && (
                <div className="mt-4 flex items-center gap-3 text-xs font-semibold">
                    <span className={`flex items-center gap-1 px-2 py-1 rounded-md ${getTrendColor()}`}>
                        {trend === 'up' ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                        {trendValue}
                    </span>
                    <span className="text-slate-400 font-normal">vs last month</span>
                </div>
            )}
        </div>
    );
};

export default StatsCard;
