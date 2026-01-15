"use client";

import React from 'react';
import { FaCopy } from 'react-icons/fa';
import ConfirmDialog from '@/components/modals/ConfirmDialog';

interface DuplicateMenuButtonProps {
  menuId: string;
  menuName: string;
  onSuccess?: (duplicatedMenu: unknown) => void;
  onError?: (error: string) => void;
  className?: string;
  variant?: 'icon' | 'button' | 'dropdown-item';
}

export default function DuplicateMenuButton({
  menuId,
  menuName,
  onSuccess,
  onError,
  className = '',
  variant = 'icon',
}: DuplicateMenuButtonProps) {
  const [isDuplicating, setIsDuplicating] = React.useState(false);
  const [confirmOpen, setConfirmOpen] = React.useState(false);

  const handleDuplicate = () => {
    setConfirmOpen(true);
  };

  const performDuplicate = async () => {
    setIsDuplicating(true);

    setConfirmOpen(false);

    try {
      const token = localStorage.getItem('accessToken');
      if (!token) {
        throw new Error('Not authenticated');
      }

      const response = await fetch(`/api/merchant/menu/${menuId}/duplicate`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to duplicate menu');
      }

      if (onSuccess) {
        onSuccess(data.data);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'An error occurred';
      if (onError) {
        onError(errorMessage);
      }
    } finally {
      setIsDuplicating(false);
    }
  };

  if (variant === 'icon') {
    return (
      <>
        <button
          onClick={handleDuplicate}
          disabled={isDuplicating}
          className={`inline-flex h-9 w-9 items-center justify-center rounded-lg border border-purple-200 bg-purple-50 text-purple-600 hover:bg-purple-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-purple-900/50 dark:bg-purple-900/20 dark:text-purple-400 dark:hover:bg-purple-900/30 ${className}`}
          title="Duplicate menu item"
        >
          {isDuplicating ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-purple-600 border-t-transparent dark:border-purple-400" />
          ) : (
            <FaCopy className="h-4 w-4" />
          )}
        </button>
        <ConfirmDialog
          isOpen={confirmOpen}
          title="Duplicate menu"
          message={`Duplicate "${menuName}"? A copy will be created as inactive.`}
          confirmText={isDuplicating ? 'Duplicating...' : 'Duplicate'}
          cancelText="Cancel"
          variant="info"
          onCancel={() => setConfirmOpen(false)}
          onConfirm={performDuplicate}
        />
      </>
    );
  }

  if (variant === 'dropdown-item') {
    return (
      <>
        <button
          onClick={handleDuplicate}
          disabled={isDuplicating}
          className={`flex w-full items-center gap-3 px-4 py-2 text-sm text-purple-600 hover:bg-purple-50 disabled:cursor-not-allowed disabled:opacity-50 dark:text-purple-400 dark:hover:bg-purple-900/20 ${className}`}
        >
          {isDuplicating ? (
            <div className="h-4 w-4 animate-spin rounded-full border-2 border-purple-600 border-t-transparent dark:border-purple-400" />
          ) : (
            <FaCopy className="h-4 w-4" />
          )}
          <span>{isDuplicating ? 'Duplicating...' : 'Duplicate'}</span>
        </button>
        <ConfirmDialog
          isOpen={confirmOpen}
          title="Duplicate menu"
          message={`Duplicate "${menuName}"? A copy will be created as inactive.`}
          confirmText={isDuplicating ? 'Duplicating...' : 'Duplicate'}
          cancelText="Cancel"
          variant="info"
          onCancel={() => setConfirmOpen(false)}
          onConfirm={performDuplicate}
        />
      </>
    );
  }

  // variant === 'button'
  return (
    <>
      <button
        onClick={handleDuplicate}
        disabled={isDuplicating}
        className={`inline-flex items-center gap-2 rounded-lg border border-purple-200 bg-purple-50 px-4 py-2 text-sm font-medium text-purple-700 hover:bg-purple-100 disabled:cursor-not-allowed disabled:opacity-50 dark:border-purple-900/50 dark:bg-purple-900/20 dark:text-purple-300 dark:hover:bg-purple-900/30 ${className}`}
      >
        {isDuplicating ? (
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-purple-600 border-t-transparent dark:border-purple-400" />
        ) : (
          <FaCopy className="h-4 w-4" />
        )}
        <span>{isDuplicating ? 'Duplicating...' : 'Duplicate Menu'}</span>
      </button>
      <ConfirmDialog
        isOpen={confirmOpen}
        title="Duplicate menu"
        message={`Duplicate "${menuName}"? A copy will be created as inactive.`}
        confirmText={isDuplicating ? 'Duplicating...' : 'Duplicate'}
        cancelText="Cancel"
        variant="info"
        onCancel={() => setConfirmOpen(false)}
        onConfirm={performDuplicate}
      />
    </>
  );
}
