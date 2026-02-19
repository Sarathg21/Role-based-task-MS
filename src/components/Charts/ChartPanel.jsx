import { ResponsiveContainer } from 'recharts';

const ChartPanel = ({ title, children, height = 300, compact = false }) => {
    return (
        <div className={`bg-white rounded-xl shadow-sm border border-slate-100 ${compact ? 'p-4' : 'p-6'}`}>
            <h3 className={`font-bold text-slate-800 ${compact ? 'text-base mb-3' : 'text-lg mb-6'}`}>{title}</h3>
            <div style={{ width: '100%', height }}>
                <ResponsiveContainer width="100%" height="100%">
                    {children}
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default ChartPanel;
