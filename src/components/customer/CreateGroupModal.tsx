'use client';

import { useState, useEffect } from 'react';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useGroupOrder } from '@/context/GroupOrderContext';
import { getCustomerAuth } from '@/lib/utils/localStorage';
import { HiXMark } from 'react-icons/hi2';

interface CreateGroupModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: (sessionCode: string) => void;
    onNeedTableNumber?: () => void; // Callback when table number is required
    merchantCode: string;
    orderType: 'DINE_IN' | 'TAKEAWAY' | 'DELIVERY';
    tableNumber?: string;
}

/**
 * Create Group Modal - Bottom Sheet Style
 * Mode badge in header, table number validation
 */
export default function CreateGroupModal({
    isOpen,
    onClose,
    onSuccess,
    onNeedTableNumber,
    merchantCode,
    orderType,
    tableNumber,
}: CreateGroupModalProps) {
    const { t } = useTranslation();
    const { createSession, isLoading } = useGroupOrder();

    const [hostName, setHostName] = useState('');
    const [error, setError] = useState('');
    const [isClosing, setIsClosing] = useState(false);

    // Pre-fill from logged in customer
    useEffect(() => {
        if (isOpen) {
            const auth = getCustomerAuth();
            if (auth?.customer?.name) {
                setHostName(auth.customer.name);
            }
            setError('');

            // Check if table number is needed for dine-in
            if (orderType === 'DINE_IN' && !tableNumber && onNeedTableNumber) {
                // Close this modal and open table number modal
                onClose();
                onNeedTableNumber();
            }
        }
    }, [isOpen, orderType, tableNumber, onNeedTableNumber, onClose]);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            setIsClosing(false);
            onClose();
        }, 250);
    };

    const handleSubmit = async () => {
        setError('');

        if (!hostName.trim()) {
            setError(t('groupOrder.enterName') || 'Please enter your name');
            return;
        }

        const auth = getCustomerAuth();
        const result = await createSession(
            merchantCode,
            orderType,
            tableNumber,
            hostName.trim(),
            auth?.customer?.id?.toString()
        );

        if (result.success && result.sessionCode) {
            handleClose();
            setTimeout(() => onSuccess(result.sessionCode!), 260);
        } else {
            setError(result.error || 'Failed to create group');
        }
    };

    const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') {
            handleSubmit();
        }
    };

    if (!isOpen) return null;

    // Get mode display text
    const modeText = orderType === 'DINE_IN'
        ? (tableNumber ? `Table ${tableNumber}` : 'Dine In')
        : orderType === 'DELIVERY'
            ? 'Delivery'
            : 'Takeaway';

    return (
        <>
            <div
                className={`fixed inset-0 bg-black/50 z-1000 transition-opacity duration-250 ${isClosing ? 'animate-fadeOut' : 'animate-fadeIn'}`}
                onClick={handleClose}
            />

            <div className={`fixed inset-x-0 bottom-0 z-1000 flex justify-center ${isClosing ? 'animate-slideDown' : 'animate-slideUp'}`}>
                <div className="w-full max-w-125 bg-white rounded-t-2xl shadow-2xl">
                    {/* Header with mode badge on right */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-900" style={{ margin: 0, lineHeight: 'normal' }}>
                            {t('groupOrder.createSession') || 'Create New Group'}
                        </h2>
                        <div className="flex items-center gap-2">
                            {/* Mode badge - small text, no bg */}
                            <span className="text-sm text-gray-500">
                                {modeText}
                            </span>
                            <button
                                onClick={handleClose}
                                className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-gray-100 transition-colors"
                            >
                                <HiXMark className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="px-4 py-4">
                        {/* Name Input */}
                        <div className="mb-4">
                            <label
                                htmlFor="hostName"
                                className="block text-sm font-semibold text-gray-900 mb-2"
                            >
                                {t('groupOrder.yourName') || 'Your Name'}<span className="text-red-500">*</span>
                            </label>
                            <input
                                id="hostName"
                                type="text"
                                maxLength={50}
                                value={hostName}
                                onChange={(e) => setHostName(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder={t('groupOrder.enterName') || 'Enter your name'}
                                autoFocus
                                disabled={isLoading}
                                className="w-full h-12 px-4 text-left bg-white border border-gray-300 rounded-md text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-1 focus:ring-orange-500 focus:border-orange-500 transition-all disabled:bg-gray-100"
                            />
                            {error && (
                                <p className="mt-2 text-sm text-red-600" role="alert">
                                    {error}
                                </p>
                            )}
                        </div>

                        <p className="text-xs text-gray-500 mb-4">
                            {t('groupOrder.createHint') || 'After creating, share the code with your friends to join.'}
                        </p>
                    </div>

                    {/* Footer Button */}
                    <div className="px-4 pb-4">
                        <button
                            onClick={handleSubmit}
                            disabled={!hostName.trim() || isLoading}
                            className="w-full h-12 bg-orange-500 text-white font-medium rounded-md hover:bg-orange-600 transition-colors disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                        >
                            {isLoading ? (
                                <>
                                    <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                    </svg>
                                    <span>{t('common.loading') || 'Creating...'}</span>
                                </>
                            ) : (
                                t('groupOrder.createGroup') || 'Create Group'
                            )}
                        </button>
                    </div>
                </div>
            </div>

            <style jsx>{`
                @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
                @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
                @keyframes slideUp { from { transform: translateY(100%); } to { transform: translateY(0); } }
                @keyframes slideDown { from { transform: translateY(0); } to { transform: translateY(100%); } }
                .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
                .animate-fadeOut { animation: fadeOut 0.25s ease-in forwards; }
                .animate-slideUp { animation: slideUp 0.3s ease-out; }
                .animate-slideDown { animation: slideDown 0.25s ease-in forwards; }
            `}</style>
        </>
    );
}
