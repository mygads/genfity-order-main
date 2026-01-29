'use client';

import Link from 'next/link';
import clsx from 'clsx';

type InvalidLinkCardProps = {
  title: string;
  message: string;
  actionHref: string;
  actionLabel: string;
  className?: string;
  buttonClassName?: string;
};

export default function InvalidLinkCard({
  title,
  message,
  actionHref,
  actionLabel,
  className,
  buttonClassName,
}: InvalidLinkCardProps) {
  return (
    <div
      className={clsx(
        'bg-white dark:bg-gray-800 rounded-2xl shadow-2xl shadow-gray-200/50 dark:shadow-none p-8 max-w-md w-full text-center',
        className
      )}
    >
      <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-full flex items-center justify-center mx-auto mb-6">
        <svg className="w-8 h-8 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
        </svg>
      </div>
      <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">{title}</h2>
      <p className="text-gray-500 dark:text-gray-400 text-sm mb-6">{message}</p>
      <Link
        href={actionHref}
        className={clsx(
          'inline-flex items-center justify-center px-6 py-3 bg-[#173C82] hover:bg-[#122c60] text-white font-semibold rounded-lg transition-all',
          buttonClassName
        )}
      >
        {actionLabel}
      </Link>
    </div>
  );
}
