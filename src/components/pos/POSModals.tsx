"use client";

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { FaTimes, FaUser, FaPhone, FaEnvelope, FaChair, FaStickyNote, FaTag, FaDollarSign, FaHashtag } from 'react-icons/fa';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useModalImplicitClose } from '@/hooks/useModalImplicitClose';
import { formatCurrency } from '@/lib/utils/format';

// ============================================
// BASE MODAL COMPONENT
// ============================================

interface BaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  disableImplicitClose?: boolean;
}

const BaseModal: React.FC<BaseModalProps> = ({
  isOpen,
  onClose,
  title,
  children,
  disableImplicitClose = false,
}) => {
  const { onBackdropMouseDown } = useModalImplicitClose({
    isOpen,
    onClose,
    disableImplicitClose,
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/50"
        onMouseDown={onBackdropMouseDown}
      />
      <div className="relative w-full max-w-md mx-4 bg-white dark:bg-gray-900 rounded-xl shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
            {title}
          </h2>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 flex items-center justify-center transition-colors"
          >
            <FaTimes className="w-4 h-4" />
          </button>
        </div>
        {children}
      </div>
    </div>
  );
};

// ============================================
// CUSTOMER INFO MODAL
// ============================================

export interface CustomerInfo {
  name?: string;
  phone?: string;
  email?: string;
}

interface CustomerInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (info: CustomerInfo) => void;
  initialValue?: CustomerInfo;
}

export const CustomerInfoModal: React.FC<CustomerInfoModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  initialValue = {},
}) => {
  const { t } = useTranslation();
  const [name, setName] = useState(initialValue.name || '');
  const [phone, setPhone] = useState(initialValue.phone || '');
  const [email, setEmail] = useState(initialValue.email || '');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setName(initialValue.name || '');
    setPhone(initialValue.phone || '');
    setEmail(initialValue.email || '');
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [initialValue, isOpen]);

  const isDirty = useMemo(() => {
    const initialName = initialValue.name || '';
    const initialPhone = initialValue.phone || '';
    const initialEmail = initialValue.email || '';
    return name !== initialName || phone !== initialPhone || email !== initialEmail;
  }, [email, initialValue, name, phone]);

  const handleConfirm = () => {
    onConfirm({ name: name.trim(), phone: phone.trim(), email: email.trim() });
    onClose();
  };

  const handleClear = () => {
    onConfirm({});
    onClose();
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={t('pos.customerInfo')}
      disableImplicitClose={isDirty}
    >
      <div className="p-4 space-y-4">
        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            <FaUser className="w-3.5 h-3.5 inline mr-2" />
            {t('pos.customerName')}
          </label>
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('pos.customerNamePlaceholder')}
            className="w-full px-3 py-2.5 rounded-lg bg-gray-100 dark:bg-gray-800 border-none text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-brand-300 dark:focus:ring-brand-600"
          />
        </div>

        {/* Phone */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            <FaPhone className="w-3.5 h-3.5 inline mr-2" />
            {t('pos.customerPhone')}
          </label>
          <input
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder={t('pos.customerPhonePlaceholder')}
            className="w-full px-3 py-2.5 rounded-lg bg-gray-100 dark:bg-gray-800 border-none text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600"
          />
        </div>

        {/* Email */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            <FaEnvelope className="w-3.5 h-3.5 inline mr-2" />
            {t('pos.customerEmail')}
          </label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder={t('pos.customerEmailPlaceholder')}
            className="w-full px-3 py-2.5 rounded-lg bg-gray-100 dark:bg-gray-800 border-none text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600"
          />
        </div>

        <p className="text-xs text-gray-500 dark:text-gray-400">
          {t('pos.customerInfoHint')}
        </p>
      </div>

      {/* Footer */}
      <div className="flex gap-2 p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        {(initialValue.name || initialValue.phone || initialValue.email) && (
          <button
            onClick={handleClear}
            className="py-2.5 px-4 rounded-lg text-sm font-medium bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
          >
            {t('pos.clearCustomer')}
          </button>
        )}
        <button
          onClick={handleConfirm}
          className="flex-1 py-2.5 px-4 rounded-lg text-sm font-medium bg-brand-500 text-white hover:bg-brand-600 transition-colors"
        >
          {t('common.confirm')}
        </button>
      </div>
    </BaseModal>
  );
};

// ============================================
// CUSTOM ITEM MODAL (POS)
// ============================================

export interface CustomItemDraft {
  name: string;
  price: number;
  quantity: number;
  notes?: string;
}

interface CustomItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (item: CustomItemDraft) => void;
  currency: string;
}

export const CustomItemModal: React.FC<CustomItemModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  currency,
}) => {
  const { t, locale } = useTranslation();
  const [name, setName] = useState('');
  const [priceText, setPriceText] = useState('');
  const [quantityText, setQuantityText] = useState('1');
  const [notes, setNotes] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setName('');
    setPriceText('');
    setQuantityText('1');
    setNotes('');
    setTimeout(() => inputRef.current?.focus(), 100);
  }, [isOpen]);

  const parsedPrice = useMemo(() => {
    const n = Number(priceText);
    return Number.isFinite(n) ? n : NaN;
  }, [priceText]);

  const parsedQty = useMemo(() => {
    const n = Number(quantityText);
    return Number.isFinite(n) ? n : NaN;
  }, [quantityText]);

  const isValid = useMemo(() => {
    const trimmedName = name.trim();
    if (!trimmedName) return false;
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) return false;
    if (!Number.isFinite(parsedQty) || parsedQty <= 0) return false;
    return true;
  }, [name, parsedPrice, parsedQty]);

  const isDirty = useMemo(() => {
    return Boolean(name.trim() || priceText.trim() || notes.trim() || (quantityText.trim() && quantityText.trim() !== '1'));
  }, [name, notes, priceText, quantityText]);

  const handleConfirm = () => {
    if (!isValid) return;
    onConfirm({
      name: name.trim(),
      price: Number(parsedPrice),
      quantity: Math.max(1, Math.floor(Number(parsedQty))),
      notes: notes.trim() || undefined,
    });
    onClose();
  };

  const formattedPreview = Number.isFinite(parsedPrice)
    ? formatCurrency(parsedPrice, currency, locale)
    : t('pos.customItemPricePlaceholder');

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={t('pos.customItemTitle')}
      disableImplicitClose={isDirty}
    >
      <div className="p-4 space-y-4">

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            <FaTag className="w-3.5 h-3.5 inline mr-2" />
            {t('pos.customItemName')}
          </label>
          <input
            ref={inputRef}
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={t('pos.customItemNamePlaceholder')}
            className="w-full px-3 py-2.5 rounded-lg bg-gray-100 dark:bg-gray-800 border-none text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-brand-300 dark:focus:ring-brand-600"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              <FaDollarSign className="w-3.5 h-3.5 inline mr-2" />
              {t('pos.customItemPrice')}
            </label>
            <input
              type="number"
              inputMode="decimal"
              step="0.01"
              min={0}
              value={priceText}
              onChange={(e) => setPriceText(e.target.value)}
              placeholder={t('pos.customItemPricePlaceholder')}
              className="w-full px-3 py-2.5 rounded-lg bg-gray-100 dark:bg-gray-800 border-none text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600"
            />
            <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">{formattedPreview}</p>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              <FaHashtag className="w-3.5 h-3.5 inline mr-2" />
              {t('pos.quantity')}
            </label>
            <input
              type="number"
              inputMode="numeric"
              step="1"
              min={1}
              value={quantityText}
              onChange={(e) => setQuantityText(e.target.value)}
              className="w-full px-3 py-2.5 rounded-lg bg-gray-100 dark:bg-gray-800 border-none text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            <FaStickyNote className="w-3.5 h-3.5 inline mr-2" />
            {t('pos.note')}
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder={t('pos.itemNotes')}
            rows={3}
            className="w-full px-3 py-2.5 rounded-lg bg-gray-100 dark:bg-gray-800 border-none text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600 resize-none"
          />
        </div>
      </div>

      <div className="flex gap-2 p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        <button
          onClick={onClose}
          className="py-2.5 px-4 rounded-lg text-sm font-medium bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
        >
          {t('common.cancel')}
        </button>
        <button
          onClick={handleConfirm}
          disabled={!isValid}
          className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-medium transition-colors ${
            isValid
              ? 'bg-brand-500 text-white hover:bg-brand-600'
              : 'bg-gray-200 text-gray-500 dark:bg-gray-800 dark:text-gray-500 cursor-not-allowed'
          }`}
        >
          {t('pos.customItemAdd')}
        </button>
      </div>
    </BaseModal>
  );
};

// ============================================
// TABLE NUMBER MODAL
// ============================================

interface TableNumberModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (tableNumber: string) => void;
  initialValue?: string;
  totalTables?: number | null;
}

export const TableNumberModal: React.FC<TableNumberModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  initialValue = '',
  totalTables,
}) => {
  const { t } = useTranslation();
  const [tableNumber, setTableNumber] = useState(initialValue);
  const [showRequiredError, setShowRequiredError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const isDirty = useMemo(
    () => tableNumber.trim() !== (initialValue || '').trim(),
    [initialValue, tableNumber]
  );

  useEffect(() => {
    if (isOpen) {
      setTableNumber(initialValue);
      setShowRequiredError(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [isOpen, initialValue]);

  const handleConfirm = () => {
    const trimmed = tableNumber.trim();
    if (!trimmed) {
      setShowRequiredError(true);
      return;
    }
    onConfirm(trimmed);
    onClose();
  };

  const handleClear = () => {
    onConfirm('');
    onClose();
  };

  // Quick select buttons for numbered tables
  const quickSelectTables = totalTables && totalTables > 0
    ? Array.from({ length: Math.min(totalTables, 20) }, (_, i) => String(i + 1))
    : [];

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={t('pos.tableNumber')}
      disableImplicitClose={isDirty}
    >
      <div className="p-4 space-y-4">
        {/* Input */}
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
            <FaChair className="w-3.5 h-3.5 inline mr-2" />
            {t('pos.tableNumberLabel')}
          </label>
          <input
            ref={inputRef}
            type="text"
            value={tableNumber}
            onChange={(e) => {
              const nextValue = e.target.value;
              setTableNumber(nextValue);
              if (showRequiredError && nextValue.trim()) setShowRequiredError(false);
            }}
            placeholder={t('pos.tableNumberPlaceholder')}
            className="w-full px-3 py-2.5 rounded-lg bg-gray-100 dark:bg-gray-800 border-none text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600"
          />

          {showRequiredError ? (
            <p className="mt-2 text-xs text-error-600 dark:text-error-400">
              {t('pos.tableNumberRequired')}
            </p>
          ) : null}
        </div>

        {/* Quick Select */}
        {quickSelectTables.length > 0 && (
          <div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
              {t('pos.quickSelect')}
            </p>
            <div className="flex flex-wrap gap-2">
              {quickSelectTables.map((num) => (
                <button
                  key={num}
                  onClick={() => {
                    setTableNumber(num);
                    if (showRequiredError) setShowRequiredError(false);
                  }}
                  className={`w-10 h-10 rounded-lg text-sm font-medium transition-colors ${
                    tableNumber === num
                      ? 'bg-brand-500 text-white'
                      : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700'
                  }`}
                >
                  {num}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="flex gap-2 p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        {initialValue && (
          <button
            onClick={handleClear}
            className="py-2.5 px-4 rounded-lg text-sm font-medium bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
          >
            {t('pos.clearTable')}
          </button>
        )}
        <button
          onClick={handleConfirm}
          disabled={!tableNumber.trim()}
          className="flex-1 py-2.5 px-4 rounded-lg text-sm font-medium bg-brand-500 text-white hover:bg-brand-600 transition-colors"
        >
          {t('common.confirm')}
        </button>
      </div>
    </BaseModal>
  );
};

// ============================================
// ORDER NOTES MODAL
// ============================================

interface OrderNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (notes: string) => void;
  initialValue?: string;
}

export const OrderNotesModal: React.FC<OrderNotesModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  initialValue = '',
}) => {
  const { t } = useTranslation();
  const [notes, setNotes] = useState(initialValue);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isDirty = useMemo(
    () => notes.trim() !== (initialValue || '').trim(),
    [initialValue, notes]
  );

  useEffect(() => {
    if (isOpen) {
      setNotes(initialValue);
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [isOpen, initialValue]);

  const handleConfirm = () => {
    onConfirm(notes.trim());
    onClose();
  };

  const handleClear = () => {
    onConfirm('');
    onClose();
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={t('pos.orderNotes')}
      disableImplicitClose={isDirty}
    >
      <div className="p-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
          <FaStickyNote className="w-3.5 h-3.5 inline mr-2" />
          {t('pos.orderNotesLabel')}
        </label>
        <textarea
          ref={textareaRef}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t('pos.orderNotesPlaceholder')}
          className="w-full px-3 py-2.5 rounded-lg bg-gray-100 dark:bg-gray-800 border-none text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 resize-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600"
          rows={4}
        />
      </div>

      {/* Footer */}
      <div className="flex gap-2 p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        {initialValue && (
          <button
            onClick={handleClear}
            className="py-2.5 px-4 rounded-lg text-sm font-medium bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
          >
            {t('pos.clearNotes')}
          </button>
        )}
        <button
          onClick={handleConfirm}
          className="flex-1 py-2.5 px-4 rounded-lg text-sm font-medium bg-brand-500 text-white hover:bg-brand-600 transition-colors"
        >
          {t('common.confirm')}
        </button>
      </div>
    </BaseModal>
  );
};

// ============================================
// ITEM NOTES MODAL
// ============================================

interface ItemNotesModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: (notes: string) => void;
  initialValue?: string;
  itemName: string;
}

export const ItemNotesModal: React.FC<ItemNotesModalProps> = ({
  isOpen,
  onClose,
  onConfirm,
  initialValue = '',
  itemName,
}) => {
  const { t } = useTranslation();
  const [notes, setNotes] = useState(initialValue);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const isDirty = useMemo(
    () => notes.trim() !== (initialValue || '').trim(),
    [initialValue, notes]
  );

  useEffect(() => {
    if (isOpen) {
      setNotes(initialValue);
      setTimeout(() => textareaRef.current?.focus(), 100);
    }
  }, [isOpen, initialValue]);

  const handleConfirm = () => {
    onConfirm(notes.trim());
    onClose();
  };

  const handleClear = () => {
    onConfirm('');
    onClose();
  };

  return (
    <BaseModal
      isOpen={isOpen}
      onClose={onClose}
      title={t('pos.itemNotes')}
      disableImplicitClose={isDirty}
    >
      <div className="p-4">
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-3">
          {t('pos.notesFor')}: <span className="font-medium text-gray-900 dark:text-white">{itemName}</span>
        </p>
        <textarea
          ref={textareaRef}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={t('pos.itemNotesPlaceholder')}
          className="w-full px-3 py-2.5 rounded-lg bg-gray-100 dark:bg-gray-800 border-none text-sm text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 resize-none focus:ring-2 focus:ring-gray-300 dark:focus:ring-gray-600"
          rows={3}
        />
      </div>

      {/* Footer */}
      <div className="flex gap-2 p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
        {initialValue && (
          <button
            onClick={handleClear}
            className="py-2.5 px-4 rounded-lg text-sm font-medium bg-red-100 dark:bg-red-900/30 text-red-600 dark:text-red-400 hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
          >
            {t('pos.clearNotes')}
          </button>
        )}
        <button
          onClick={handleConfirm}
          className="flex-1 py-2.5 px-4 rounded-lg text-sm font-medium bg-brand-500 text-white hover:bg-brand-600 transition-colors"
        >
          {t('common.confirm')}
        </button>
      </div>
    </BaseModal>
  );
};

// ============================================
// ORDER SUCCESS MODAL
// ============================================

interface OrderSuccessModalProps {
  isOpen: boolean;
  onClose: () => void;
  orderNumber: string;
  total: string;
  onNewOrder: () => void;
  onViewOrder: () => void;
  onPrintReceipt?: () => void;
  onMakePayment?: () => void;
  canMakePayment?: boolean;
}

export const OrderSuccessModal: React.FC<OrderSuccessModalProps> = ({
  isOpen,
  onClose,
  orderNumber,
  total,
  onNewOrder,
  onViewOrder,
  onPrintReceipt,
  onMakePayment,
  canMakePayment = false,
}) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />
      <div className="relative w-full max-w-sm mx-4 bg-white dark:bg-gray-900 rounded-xl shadow-2xl overflow-hidden text-center">
        {/* Content */}
        <div className="p-6">
          {/* Success Icon */}
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-green-600 dark:text-green-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>

          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            {t('pos.orderCreated')}
          </h2>
          
          <div className="bg-gray-100 dark:bg-gray-800 rounded-lg p-4 mb-4">
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {t('pos.orderNumberLabel')}
            </p>
            <p className="text-2xl font-bold text-gray-900 dark:text-white">
              {orderNumber}
            </p>
          </div>

          <p className="text-lg font-semibold text-gray-900 dark:text-white">
            {t('pos.total')}: {total}
          </p>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50 space-y-2">
          {(onPrintReceipt || canMakePayment) && (
            <div className="flex gap-2">
              {onPrintReceipt && (
                <button
                  onClick={onPrintReceipt}
                  className="flex-1 py-2.5 px-4 rounded-lg text-sm font-medium bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                >
                  {t('pos.printReceipt') || 'Print Receipt'}
                </button>
              )}
              {canMakePayment && onMakePayment && (
                <button
                  onClick={onMakePayment}
                  className="flex-1 py-2.5 px-4 rounded-lg text-sm font-medium bg-brand-500 text-white hover:bg-brand-600 transition-colors"
                >
                  {t('pos.makePayment') || 'Make Payment'}
                </button>
              )}
            </div>
          )}

          <div className="flex gap-2">
            <button
              onClick={onViewOrder}
              className="flex-1 py-2.5 px-4 rounded-lg text-sm font-medium bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
            >
              {t('pos.viewOrder')}
            </button>
            <button
              onClick={onNewOrder}
              className="flex-1 py-2.5 px-4 rounded-lg text-sm font-medium bg-brand-500 text-white hover:bg-brand-600 transition-colors"
            >
              {t('pos.newOrder')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
