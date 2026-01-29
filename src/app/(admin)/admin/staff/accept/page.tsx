import Link from 'next/link';
import prisma from '@/lib/db/client';

export const dynamic = 'force-dynamic';

type Props = {
  searchParams?: {
    token?: string;
  };
};

export default async function StaffAcceptInvitePage({ searchParams }: Props) {
  const token = (searchParams?.token ?? '').trim();

  if (!token) {
    return (
      <div className="mx-auto flex min-h-[calc(100vh-120px)] max-w-xl items-center justify-center p-6">
        <div className="w-full rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Invalid invitation link</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">Missing invitation token. Please use the invitation link from your email.</p>
          <div className="mt-6 flex gap-3">
            <Link href="/admin/login" className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">Go to login</Link>
          </div>
        </div>
      </div>
    );
  }

  const merchantUser = await prisma.merchantUser.findFirst({
    where: {
      inviteToken: token,
      invitationStatus: 'WAITING',
      isActive: true,
    },
    include: {
      merchant: { select: { name: true, code: true } },
      user: { select: { name: true, email: true } },
    },
  });

  if (!merchantUser) {
    return (
      <div className="mx-auto flex min-h-[calc(100vh-120px)] max-w-xl items-center justify-center p-6">
        <div className="w-full rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Invitation not found</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">This invitation link is invalid or has already been used.</p>
          <div className="mt-6 flex gap-3">
            <Link href="/admin/login" className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">Go to login</Link>
          </div>
        </div>
      </div>
    );
  }

  if (merchantUser.inviteTokenExpiresAt && merchantUser.inviteTokenExpiresAt < new Date()) {
    return (
      <div className="mx-auto flex min-h-[calc(100vh-120px)] max-w-xl items-center justify-center p-6">
        <div className="w-full rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900">
          <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Invitation expired</h1>
          <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">This invitation link has expired. Please contact the store owner to resend an invitation.</p>
          <div className="mt-6 flex gap-3">
            <Link href="/admin/login" className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">Go to login</Link>
          </div>
        </div>
      </div>
    );
  }

  await prisma.merchantUser.update({
    where: { id: merchantUser.id },
    data: {
      invitationStatus: 'ACCEPTED',
      acceptedAt: new Date(),
      inviteToken: null,
      inviteTokenExpiresAt: null,
    },
  });

  return (
    <div className="mx-auto flex min-h-[calc(100vh-120px)] max-w-xl items-center justify-center p-6">
      <div className="w-full rounded-2xl border border-gray-200 bg-white p-8 shadow-sm dark:border-gray-800 dark:bg-gray-900">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Invitation accepted</h1>
        <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
          {merchantUser.user?.name ? `${merchantUser.user.name}, ` : ''}you now have staff access for <span className="font-medium text-gray-900 dark:text-white">{merchantUser.merchant.name}</span> ({merchantUser.merchant.code}).
        </p>
        <div className="mt-6 flex gap-3">
          <Link href="/admin/login" className="rounded-lg bg-brand-500 px-4 py-2 text-sm font-medium text-white hover:bg-brand-600">Go to admin login</Link>
        </div>
      </div>
    </div>
  );
}
