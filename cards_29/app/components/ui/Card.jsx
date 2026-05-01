'use client';

export function Card({
  children,
  className = '',
  hover = false,
  ...props
}) {
  return (
    <div
      className={`
        bg-[var(--card-bg)] rounded-xl p-6
        border border-[var(--accent)]
        transition-all duration-300
        ${hover ? 'hover:shadow-lg hover:border-[var(--secondary)]' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  );
}
