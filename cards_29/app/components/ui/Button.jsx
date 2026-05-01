'use client';

export function Button({
  children,
  className = '',
  variant = 'primary',
  size = 'md',
  disabled = false,
  loading = false,
  ...props
}) {
  const baseStyles = 'font-medium rounded-lg transition-all duration-200 font-sans focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed';

  const variants = {
    primary: 'bg-[var(--secondary)] text-[var(--primary)] hover:bg-opacity-90 focus:ring-[var(--secondary)]',
    secondary: 'bg-[var(--primary)] text-[var(--foreground)] border-2 border-[var(--secondary)] hover:bg-[var(--accent)] focus:ring-[var(--primary)]',
    danger: 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-500',
    ghost: 'bg-transparent text-[var(--secondary)] border-2 border-[var(--secondary)] hover:bg-[var(--accent)] focus:ring-[var(--secondary)]',
  };

  const sizes = {
    sm: 'px-3 py-1.5 text-sm',
    md: 'px-4 py-2.5 text-base',
    lg: 'px-6 py-3 text-lg',
  };

  return (
    <button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...props}
    >
      {loading ? (
        <span className="flex items-center gap-2">
          <span className="animate-spin">⏳</span>
          {children}
        </span>
      ) : (
        children
      )}
    </button>
  );
}
