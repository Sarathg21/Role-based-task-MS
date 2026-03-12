import { ResponsiveContainer } from 'recharts';

const ChartPanel = ({ title, children, height = 220, compact = true }) => {
    return (
        <div className={`bg-white rounded-3xl shadow-lg border border-slate-200/50 mesh-gradient relative overflow-hidden card-gloss ${compact ? 'p-4' : 'p-6'}`}>
            {/* Top glass accent */}
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-slate-200 to-transparent opacity-40" />

            <h3 className={`font-bold tracking-tight text-slate-800 capitalize ${compact ? 'text-xs mb-3' : 'text-sm mb-6'}`}>{title}</h3>
            <div className="relative z-10">
                <ResponsiveContainer width="100%" height={height} minHeight={height}>
                    {children}
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default ChartPanel;
