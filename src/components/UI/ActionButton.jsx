import { Loader2 } from "lucide-react";

const ActionButton = ({
    children,
    onClick,
    variant = 'neutral',
    size = 'sm',
    isLoading = false,
    isDisabled = false,
    className = '',
    icon: Icon,
    ...props
}) => {
    const baseStyles = "inline-flex items-center justify-center font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-1 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm active:scale-95";

    const variants = {
        primary: "bg-violet-600 text-white hover:bg-violet-700 focus:ring-violet-500 hover:shadow-violet-200",
        success: "bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500 hover:shadow-emerald-200",
        warning: "bg-amber-500 text-white hover:bg-amber-600 focus:ring-amber-500 hover:shadow-amber-200",
        danger: "bg-rose-600 text-white hover:bg-rose-700 focus:ring-rose-500 hover:shadow-rose-200",
        neutral: "bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 hover:text-slate-900 focus:ring-slate-200",
        ghost: "bg-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900",
    };

    const sizes = {
        xs: "text-xs px-2.5 py-1 rounded-md gap-1.5",
        sm: "text-sm px-3.5 py-1.5 rounded-lg gap-2",
        md: "text-sm px-4 py-2 rounded-lg gap-2",
        lg: "text-base px-6 py-2.5 rounded-xl gap-2.5",
    };

    return (
        <button
            onClick={onClick}
            disabled={isDisabled || isLoading}
            className={`
        ${baseStyles}
        ${variants[variant] || variants.neutral}
        ${sizes[size] || sizes.sm}
        ${className}
      `}
            {...props}
        >
            {isLoading ? (
                <Loader2 className="w-4 h-4 animate-spin" />
            ) : Icon ? (
                <Icon className={`${size === 'xs' ? 'w-3.5 h-3.5' : 'w-4 h-4'}`} />
            ) : null}

            {children}
        </button>
    );
};

export default ActionButton;
