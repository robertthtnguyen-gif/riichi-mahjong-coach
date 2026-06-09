'use client';

import { ReactNode } from 'react';

interface BottomSheetProps {
  open: boolean;
  title: string;
  description?: string;
  onClose: () => void;
  children: ReactNode;
}

export function BottomSheet({
  open,
  title,
  description,
  onClose,
  children,
}: BottomSheetProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-40 flex items-end justify-center bg-gray-950/70 backdrop-blur-sm">
      <button
        type="button"
        aria-label="Close sheet"
        onClick={onClose}
        className="absolute inset-0"
      />
      <div className="relative z-10 flex max-h-[82vh] w-full max-w-xl flex-col rounded-t-[1.75rem] border border-gray-700 bg-gray-900 shadow-2xl">
        <div className="sticky top-0 z-10 rounded-t-[1.75rem] border-b border-gray-800 bg-gray-900/95 px-4 py-3 backdrop-blur">
          <div className="mx-auto mb-3 h-1.5 w-12 rounded-full bg-gray-700" />
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <h3 className="text-sm font-semibold uppercase tracking-[0.18em] text-white">
                {title}
              </h3>
              {description ? <p className="text-sm text-gray-400">{description}</p> : null}
            </div>
            <button
              type="button"
              onClick={onClose}
              className="rounded-full border border-gray-700 bg-gray-800 px-3 py-1 text-xs font-semibold text-gray-300"
            >
              Close
            </button>
          </div>
        </div>
        <div className="overflow-y-auto px-4 pb-6 pt-4">{children}</div>
      </div>
    </div>
  );
}
