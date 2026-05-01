'use client';

import { motion, AnimatePresence } from 'framer-motion';

export function Modal({
  isOpen,
  onClose,
  title = '',
  children,
  size = 'md',
  showClose = true,
}) {
  const sizes = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-40"
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className={`fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 ${sizes[size]} w-full mx-4`}
          >
            <div className="bg-[var(--card-bg)] rounded-2xl shadow-2xl border border-[var(--accent)]">
              {/* Header */}
              <div className="flex items-center justify-between p-6 border-b border-[var(--accent)]">
                <h2 className="text-xl font-bold text-[var(--foreground)]">
                  {title}
                </h2>
                {showClose && (
                  <button
                    onClick={onClose}
                    className="text-[var(--foreground)]/60 hover:text-[var(--foreground)] transition-colors"
                  >
                    ✕
                  </button>
                )}
              </div>

              {/* Content */}
              <div className="p-6">
                {children}
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
