import { ArrowUp, ArrowDown } from "lucide-react";

const StatsCard = ({
  title,
  label,
  value,
  icon: Icon,
  trend,
  trendValue,
  color = "primary",
  compact = false,
  size = "md",
  className = "",
  style = {},
}) => {
  const displayTitle = title || label;
  const isSmall = size === "sm" || compact;

  const getTrendColor = () => {
    if (typeof trend === "number") {
      return trend >= 0
        ? "text-emerald-600 bg-emerald-50 border border-emerald-100"
        : "text-rose-600 bg-rose-50 border border-rose-100";
    }
    if (trend === "up")
      return "text-emerald-600 bg-emerald-50 border border-emerald-100";
    if (trend === "down")
      return "text-rose-600 bg-rose-50 border border-rose-100";

    return "text-slate-500 bg-slate-100 border border-slate-200";
  };

  const colorMap = {
    primary: {
      gradient: "from-violet-500 to-violet-700",
      shadow: "shadow-violet-200/50",
      glow: "rgba(139,92,246,0.1)",
      cardBg: "bg-violet-50",
      accent: "violet",
      textHover: "group-hover:text-violet-600",
    },
    violet: {
      gradient: "from-violet-500 to-violet-700",
      shadow: "shadow-violet-200/50",
      glow: "rgba(139,92,246,0.1)",
      cardBg: "bg-violet-50",
      accent: "violet",
      textHover: "group-hover:text-violet-600",
    },
    emerald: {
      gradient: "from-emerald-400 to-emerald-600",
      shadow: "shadow-emerald-200/50",
      glow: "rgba(16,185,129,0.1)",
      cardBg: "bg-emerald-50",
      accent: "emerald",
      textHover: "group-hover:text-emerald-600",
    },
    amber: {
      gradient: "from-amber-400 to-amber-600",
      shadow: "shadow-amber-200/50",
      glow: "rgba(245,158,11,0.1)",
      cardBg: "bg-orange-50",
      accent: "amber",
      textHover: "group-hover:text-amber-600",
    },
    rose: {
      gradient: "from-rose-500 to-rose-700",
      shadow: "shadow-rose-200/50",
      glow: "rgba(239,68,68,0.1)",
      cardBg: "bg-rose-50",
      accent: "rose",
      textHover: "group-hover:text-rose-600",
    },
  };

  const c = colorMap[color] || colorMap.primary;

  return (
    <div
      className={`stat-card group relative overflow-hidden transition-all duration-300 hover:-translate-y-1 border border-slate-200 shadow-sm ${c.cardBg} ${
        isSmall ? "py-2.5 px-4" : "py-5 px-6"
      } rounded-2xl ${className}`}
      style={{ "--glow-color": c.glow, ...style }}
    >
      {/* Top accent line */}
      <div
        className={`absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-${c.accent}-300 to-transparent opacity-80`}
      />

      <div className="flex items-center gap-4 relative z-10">
        {/* Icon */}
        <div
          className={`flex-shrink-0 flex items-center justify-center bg-gradient-to-br ${c.gradient} shadow-md ${c.shadow} transition-all duration-300 group-hover:rotate-6 ${
            isSmall ? "w-9 h-9 rounded-lg" : "w-12 h-12 rounded-xl"
          }`}
        >
          {Icon && (
            <Icon
              size={isSmall ? 18 : 24}
              className="text-white"
              strokeWidth={2.5}
            />
          )}
        </div>

        {/* Content */}
        <div className="min-w-0 flex-1 flex flex-col pt-1">
          <p
            className={`font-medium text-slate-400 truncate mb-1 ${
              isSmall ? "text-[8px]" : "text-[9px]"
            }`}
          >
            {displayTitle}
          </p>

          <div className="flex items-baseline gap-2">
            <h3
              className={`font-semibold text-slate-800 tabular-nums tracking-tight leading-none transition-colors ${c.textHover} ${
                isSmall ? "text-2xl" : "text-3xl"
              }`}
            >
              {value ?? "—"}
            </h3>

            {(trendValue !== undefined || trend !== undefined) && (
              <span
                className={`flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[9px] font-semibold border ${getTrendColor()}`}
              >
                {trend === "up" ||
                (typeof trend === "number" && trend > 0) ? (
                  <ArrowUp size={8} strokeWidth={3} />
                ) : (
                  <ArrowDown size={8} strokeWidth={3} />
                )}
                {trendValue ||
                  (typeof trend === "number" ? Math.abs(trend) + "%" : "")}
              </span>
            )}
          </div>
        </div>

        {/* Status Dot */}
        <div className="absolute bottom-4 right-4 flex gap-1">
          <div
            className={`w-1.5 h-1.5 rounded-full ${
              color === "rose"
                ? "bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.4)]"
                : "bg-slate-200"
            } opacity-0 group-hover:opacity-100 transition-opacity`}
          />
        </div>
      </div>

      {/* Bottom accent */}
      <div
        className={`absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-${c.accent}-400 to-transparent opacity-0 group-hover:opacity-100 transition-opacity`}
      />
    </div>
  );
};

export default StatsCard;