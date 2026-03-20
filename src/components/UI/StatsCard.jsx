import { ArrowUp, ArrowDown } from "lucide-react";

/**
 * Premium StatsCard component with gradient background and glassmorphic effects.
 */
const StatsCard = ({
  title,
  label,
  value,
  icon: Icon,
  trend,
  trendValue,
  color = "violet",
  sub,
  className = "",
  style = {},
}) => {
  const displayTitle = title || label;

  const getTrendColor = () => {
    if (typeof trend === "number") {
      return trend >= 0 ? "bg-emerald-400/20 text-emerald-100" : "bg-rose-400/20 text-rose-100";
    }
    if (trend === "up") return "bg-emerald-400/20 text-emerald-100";
    if (trend === "down") return "bg-rose-400/20 text-rose-100";
    return "bg-white/10 text-white/70";
  };

  const colorMap = {
    violet: { 
        bg: 'bg-gradient-to-br from-[#7B51ED] via-[#8B64F1] to-[#6D43E0]', 
        shadow: 'shadow-[0_8px_30px_rgb(123,81,237,0.3)]', 
        accent: 'bg-violet-400/30' 
    },
    green: { 
        bg: 'bg-gradient-to-br from-[#10B981] via-[#34D399] to-[#059669]', 
        shadow: 'shadow-[0_8px_30px_rgb(16,185,129,0.3)]', 
        accent: 'bg-emerald-400/30' 
    },
    emerald: { 
        bg: 'bg-gradient-to-br from-[#10B981] via-[#34D399] to-[#059669]', 
        shadow: 'shadow-[0_8px_30px_rgb(16,185,129,0.3)]', 
        accent: 'bg-emerald-400/30' 
    },
    blue: { 
        bg: 'bg-gradient-to-br from-[#4285F4] via-[#60A5FA] to-[#2563EB]', 
        shadow: 'shadow-[0_8px_30px_rgb(66,133,244,0.3)]', 
        accent: 'bg-blue-400/30' 
    },
    amber: { 
        bg: 'bg-gradient-to-br from-[#F59E0B] via-[#FBBF24] to-[#D97706]', 
        shadow: 'shadow-[0_8px_30px_rgb(245,158,11,0.3)]', 
        accent: 'bg-amber-400/30' 
    },
    rose: { 
        bg: 'bg-gradient-to-br from-[#F43F5E] via-[#FB7185] to-[#E11D48]', 
        shadow: 'shadow-[0_8px_30px_rgb(244,63,94,0.3)]', 
        accent: 'bg-rose-400/30' 
    },
  };

  const c = colorMap[color] || colorMap.violet;

  return (
    <div
      className={`group relative overflow-hidden rounded-[1.75rem] ${c.bg} ${c.shadow} p-6 transition-all duration-500 hover:scale-[1.03] hover:shadow-2xl border border-white/10 ${className}`}
      style={style}
    >
      {/* Background Ornaments */}
      <div className={`absolute -top-6 -right-6 w-32 h-32 rounded-full ${c.accent} blur-3xl opacity-50 group-hover:scale-125 transition-transform duration-700`} />
      <div className={`absolute -bottom-10 -left-10 w-28 h-28 rounded-full ${c.accent} blur-2xl opacity-30 group-hover:scale-125 transition-transform duration-700 delay-100`} />
      
      {/* Glass Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.1),transparent_70%)] pointer-events-none" />

      <div className="relative z-10 flex items-center justify-between">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-[11px] font-bold text-white/70 uppercase tracking-[0.1em] drop-shadow-sm truncate">
              {displayTitle}
            </span>
            {(trendValue !== undefined || trend !== undefined) && (
              <span
                className={`flex items-center gap-0.5 px-2 py-0.5 rounded-full text-[9px] font-bold border border-white/10 backdrop-blur-md ${getTrendColor()}`}
              >
                {trend === "up" || (typeof trend === "number" && trend > 0) ? (
                  <ArrowUp size={8} strokeWidth={3} />
                ) : (
                  <ArrowDown size={8} strokeWidth={3} />
                )}
                {trendValue || (typeof trend === "number" ? Math.abs(trend) + "%" : "")}
              </span>
            )}
          </div>
          <div className="text-4xl font-extrabold text-white tabular-nums tracking-tighter leading-none drop-shadow-md mb-2">
            {value ?? '0'}
          </div>
          {(sub || label) && (
            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-white/10 text-white/90 text-[10px] font-bold backdrop-blur-md border border-white/10 truncate max-w-full">
               {sub || label}
            </div>
          )}
        </div>
        
        {Icon && (
          <div className={`flex-shrink-0 w-14 h-14 rounded-2xl bg-white/20 backdrop-blur-md flex items-center justify-center transition-all duration-500 group-hover:scale-110 group-hover:rotate-6 border border-white/25 shadow-lg`}>
            <Icon size={26} className="text-white drop-shadow-md" strokeWidth={2.5} />
          </div>
        )}
      </div>
    </div>
  );
};

export default StatsCard;