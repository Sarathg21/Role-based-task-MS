import { ResponsiveContainer } from 'recharts';

const ChartPanel = ({ title, children, height = 300 }) => {
    return (
        <div className="bg-white p-6 rounded-xl shadow-sm border border-slate-100">
            <h3 className="text-lg font-bold text-slate-800 mb-6">{title}</h3>
            <div style={{ width: '100%', height }}>
                <ResponsiveContainer width="100%" height="100%">
                    {children}
                </ResponsiveContainer>
            </div>
        </div>
    );
};

export default ChartPanel;
