/**
 * Offline Order Conflict Resolution Modal
 *
 * Used when syncing pending offline orders and menu/addon data changed while offline.
 * Allows the user to:
 * - Remove missing/inactive items
 * - Remove missing addons
 * - Accept updated server prices
 */

'use client';

import React, { useMemo, useState } from 'react';
import {
  FaTimes,
  FaExclamationTriangle,
  FaTrash,
  FaTag,
  FaPuzzlePiece,
  FaCheck,
} from 'react-icons/fa';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { formatCurrency } from '@/lib/utils/format';
import type {
  OfflineOrderSyncConflict,
  OfflineOrderConflictResolution,
  OfflineOrderConflictResolutionAction,
} from '@/hooks/useOfflineSync';

interface OfflineOrderConflictResolutionModalProps {
  isOpen: boolean;
  onClose: () => void;
  conflicts: OfflineOrderSyncConflict[];
  onApply: (resolutions: OfflineOrderConflictResolution[]) => void;
  currency: string;
}

type Choice = OfflineOrderConflictResolutionAction['action'];

export const OfflineOrderConflictResolutionModal: React.FC<OfflineOrderConflictResolutionModalProps> = ({
  isOpen,
  onClose,
  conflicts,
  onApply,
  currency,
}) => {
  const { t, locale } = useTranslation();

  const initialChoices = useMemo(() => {
    const map = new Map<string, Choice>();
    for (const order of conflicts) {
      for (const c of order.conflicts) {
        const key = `${order.orderId}::${c.kind}::${c.menuId}::${c.addonItemId || ''}`;
        if (c.kind === 'PRICE_CHANGED') {
          map.set(key, 'USE_SERVER_PRICE');
        } else if (c.kind === 'ADDON_MISSING') {
          map.set(key, 'REMOVE_ADDON');
        } else {
          map.set(key, 'REMOVE_ITEM');
        }
      }
    }
    return map;
  }, [conflicts]);

  const [choices, setChoices] = useState<Map<string, Choice>>(initialChoices);

  const totalConflicts = conflicts.reduce((sum, o) => sum + o.conflicts.length, 0);

  const formatMoney = (amount: number): string => formatCurrency(amount, currency, locale);

  const setChoice = (key: string, choice: Choice) => {
    setChoices(prev => {
      const next = new Map(prev);
      next.set(key, choice);
      return next;
    });
  };

  const buildResolutions = (): OfflineOrderConflictResolution[] => {
    return conflicts.map(order => {
      const actions: OfflineOrderConflictResolutionAction[] = [];

      for (const c of order.conflicts) {
        const key = `${order.orderId}::${c.kind}::${c.menuId}::${c.addonItemId || ''}`;
        const choice = choices.get(key);

        if (c.kind === 'PRICE_CHANGED') {
          if (choice === 'REMOVE_ITEM') {
            actions.push({ action: 'REMOVE_ITEM', menuId: c.menuId });
          } else {
            actions.push({
              action: 'USE_SERVER_PRICE',
              menuId: c.menuId,
              serverPrice: c.serverPrice ?? c.localPrice ?? 0,
            });
          }
          continue;
        }

        if (c.kind === 'ADDON_MISSING') {
          if (choice === 'REMOVE_ITEM') {
            actions.push({ action: 'REMOVE_ITEM', menuId: c.menuId });
          } else if (choice === 'REMOVE_ADDON' && c.addonItemId) {
            actions.push({ action: 'REMOVE_ADDON', menuId: c.menuId, addonItemId: c.addonItemId });
          } else if (c.addonItemId) {
            // Default safe fallback
            actions.push({ action: 'REMOVE_ADDON', menuId: c.menuId, addonItemId: c.addonItemId });
          }
          continue;
        }

        // MENU_MISSING / MENU_INACTIVE
        actions.push({ action: 'REMOVE_ITEM', menuId: c.menuId });
      }

      // Deduplicate actions (same menuId remove item etc.)
      const seen = new Set<string>();
      const deduped: OfflineOrderConflictResolutionAction[] = [];
      for (const a of actions) {
        const k = a.action === 'REMOVE_ADDON'
          ? `${a.action}:${a.menuId}:${a.addonItemId}`
          : `${a.action}:${a.menuId}`;
        if (seen.has(k)) continue;
        seen.add(k);
        deduped.push(a);
      }

      return { orderId: order.orderId, actions: deduped };
    });
  };

  const handleApply = () => {
    onApply(buildResolutions());
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={onClose} />

      <div className="relative w-full max-w-3xl mx-4 max-h-[85vh] bg-white dark:bg-gray-900 rounded-xl shadow-2xl flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-warning-50 dark:bg-warning-900/20">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-warning-100 dark:bg-warning-900/30 flex items-center justify-center">
              <FaExclamationTriangle className="w-5 h-5 text-warning-600 dark:text-warning-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                {t('pos.conflicts.title') || 'Offline Order Conflicts'}
              </h2>
              <p className="text-xs text-gray-600 dark:text-gray-400">
                {t('pos.conflicts.description', { count: totalConflicts }) || `${totalConflicts} conflicts found • choose how to fix before syncing`}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 flex items-center justify-center transition-colors"
          >
            <FaTimes className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {conflicts.map(order => (
            <div key={order.orderId} className="rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="px-4 py-2 bg-gray-50 dark:bg-gray-800/50 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                <div className="text-sm font-medium text-gray-900 dark:text-white">
                  {(t('pos.conflicts.pendingOrder') || 'Pending Order')}{' '}
                  • {new Date(order.createdAt).toLocaleString(locale === 'id' ? 'id-ID' : 'en-AU')}
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
                  {order.orderType === 'DINE_IN'
                    ? (t('pos.dineIn') || 'Dine In')
                    : (t('pos.takeaway') || 'Takeaway')}
                </div>
              </div>

              <div className="divide-y divide-gray-100 dark:divide-gray-800">
                {order.conflicts.map(c => {
                  const key = `${order.orderId}::${c.kind}::${c.menuId}::${c.addonItemId || ''}`;
                  const choice = choices.get(key);

                  const badge = c.kind === 'PRICE_CHANGED'
                    ? {
                        icon: <FaTag className="w-3 h-3" />,
                        text: t('pos.conflicts.priceChanged') || 'Price changed',
                        cls: 'bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-300',
                      }
                    : c.kind === 'ADDON_MISSING'
                      ? {
                          icon: <FaPuzzlePiece className="w-3 h-3" />,
                          text: t('pos.conflicts.addonMissing') || 'Addon missing',
                          cls: 'bg-warning-100 text-warning-700 dark:bg-warning-900/30 dark:text-warning-300',
                        }
                      : {
                          icon: <FaTrash className="w-3 h-3" />,
                          text: t('pos.conflicts.itemUnavailable') || 'Item unavailable',
                          cls: 'bg-error-100 text-error-700 dark:bg-error-900/30 dark:text-error-300',
                        };

                  return (
                    <div key={key} className="p-4">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium ${badge.cls}`}>
                              {badge.icon}
                              {badge.text}
                            </span>
                          </div>
                          <p className="font-medium text-gray-900 dark:text-white truncate">
                            {c.menuName}{c.addonName ? ` • ${c.addonName}` : ''}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                            {c.message}
                          </p>
                          {c.kind === 'PRICE_CHANGED' && (
                            <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                              {t('pos.conflicts.local') || 'Local'}: {formatMoney(c.localPrice ?? 0)} • {t('pos.conflicts.server') || 'Server'}: {formatMoney(c.serverPrice ?? 0)}
                            </p>
                          )}
                        </div>

                        {/* Actions */}
                        <div className="shrink-0 flex flex-col gap-2">
                          {c.kind === 'PRICE_CHANGED' && (
                            <button
                              onClick={() => setChoice(key, 'USE_SERVER_PRICE')}
                              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                                choice === 'USE_SERVER_PRICE'
                                  ? 'bg-brand-500 text-white'
                                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                              }`}
                            >
                              {t('pos.conflicts.acceptServerPrice') || 'Accept server price'}
                            </button>
                          )}

                          {c.kind === 'ADDON_MISSING' && (
                            <button
                              onClick={() => setChoice(key, 'REMOVE_ADDON')}
                              className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                                choice === 'REMOVE_ADDON'
                                  ? 'bg-warning-500 text-white'
                                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                              }`}
                            >
                              {t('pos.conflicts.removeAddon') || 'Remove addon'}
                            </button>
                          )}

                          <button
                            onClick={() => setChoice(key, 'REMOVE_ITEM')}
                            className={`px-3 py-2 rounded-lg text-xs font-medium transition-colors ${
                              choice === 'REMOVE_ITEM'
                                ? 'bg-error-500 text-white'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                            }`}
                          >
                            {t('pos.conflicts.removeItem') || 'Remove item'}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 flex items-center justify-between">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
          >
            {t('pos.conflicts.close') || t('common.close') || 'Close'}
          </button>
          <button
            onClick={handleApply}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium bg-brand-500 hover:bg-brand-600 text-white transition-colors"
          >
            <FaCheck className="w-4 h-4" />
            {t('pos.conflicts.applyFixes') || 'Apply fixes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default OfflineOrderConflictResolutionModal;
