'use client';

import { useRouter } from 'next/navigation';

interface User {
  userId: string;
  email: string;
  role: string;
  merchantId?: string;
}

interface DashboardHeaderProps {
  user: User;
}

/**
 * Dashboard Header Component
 * 
 * Displays:
 * - Current page indicator
 * - User info (email, role)
 * - Logout button
 */
export default function DashboardHeader({ user }: DashboardHeaderProps) {
  const router = useRouter();

  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      router.push('/admin/login');
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <header className="flex h-16 items-center justify-between border-b border-gray-200 bg-white px-6 shadow-sm">
      <div>
        <h1 className="text-xl font-bold text-gray-900">Dashboard</h1>
      </div>

      <div className="flex items-center gap-4">
        {/* User Info */}
        <div className="text-right">
          <p className="text-sm font-semibold text-gray-900">{user.email}</p>
          <p className="text-xs text-gray-500">{user.role.replace('_', ' ')}</p>
        </div>

        {/* User Avatar */}
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-brand-100 text-brand-600">
          <span className="text-xl">👤</span>
        </div>

        {/* Logout Button */}
        <button
          onClick={handleLogout}
          className="rounded-lg bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 transition hover:bg-gray-200"
        >
          Logout
        </button>
      </div>
    </header>
  );
}
