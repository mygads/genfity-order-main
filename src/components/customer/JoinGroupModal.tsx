'use client';

import { useState, useEffect, useRef } from 'react';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useGroupOrder } from '@/context/GroupOrderContext';
import { getCustomerAuth } from '@/lib/utils/localStorage';

interface JoinGroupModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    prefilledCode?: string; // Pre-filled code from QR/link
}

/**
 * Join Group Modal - Bottom Sheet Style
 * Orange theme matching existing app style
 */
export default function JoinGroupModal({
    isOpen,
    onClose,
    onSuccess,
    prefilledCode,
}: JoinGroupModalProps) {
    const { t } = useTranslation();
    const { joinSession, isLoading } = useGroupOrder();

    const [code, setCode] = useState(['', '', '', '']);
    const [name, setName] = useState('');
    const [step, setStep] = useState<'code' | 'name'>('code');
    const [error, setError] = useState('');
    const [isClosing, setIsClosing] = useState(false);

    const inputRefs = [
        useRef<HTMLInputElement>(null),
        useRef<HTMLInputElement>(null),
        useRef<HTMLInputElement>(null),
        useRef<HTMLInputElement>(null),
    ];

    // Pre-fill from logged in customer
    useEffect(() => {
        if (isOpen) {
            const auth = getCustomerAuth();
            if (auth?.customer?.name) {
                setName(auth.customer.name);
            }

            // If prefilledCode provided (from QR/link), auto-fill and skip to name step
            if (prefilledCode && prefilledCode.length === 4) {
                setCode(prefilledCode.toUpperCase().split(''));
                setStep('name');
            } else {
                setCode(['', '', '', '']);
                setStep('code');
            }
            setError('');

            // Focus first input after modal opens
            setTimeout(() => inputRefs[0].current?.focus(), 300);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, prefilledCode]);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            setIsClosing(false);
            setCode(['', '', '', '']);
            setStep('code');
            onClose();
        }, 250);
    };

    const handleCodeChange = (index: number, value: string) => {
        // Only allow alphanumeric
        const char = value.toUpperCase().replace(/[^A-Z0-9]/g, '');

        if (char.length > 1) {
            // Handle paste
            const chars = char.split('').slice(0, 4);
            const newCode = [...code];
            chars.forEach((c, i) => {
                if (index + i < 4) {
                    newCode[index + i] = c;
                }
            });
            setCode(newCode);
            // Focus last filled or next empty
            const nextIndex = Math.min(index + chars.length, 3);
            inputRefs[nextIndex].current?.focus();
        } else {
            const newCode = [...code];
            newCode[index] = char;
            setCode(newCode);

            // Auto-focus next input
            if (char && index < 3) {
                inputRefs[index + 1].current?.focus();
            }
        }
        setError('');
    };

    const handleKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Backspace' && !code[index] && index > 0) {
            inputRefs[index - 1].current?.focus();
        } else if (e.key === 'Enter') {
            handleNextStep();
        }
    };

    const handleNextStep = () => {
        const fullCode = code.join('');
        if (fullCode.length < 4) {
            setError(t('groupOrder.invalidCode') || 'Please enter complete code');
            return;
        }
        setStep('name');
        setError('');
    };

    const handleSubmit = async () => {
        setError('');

        if (!name.trim()) {
            setError(t('groupOrder.enterName') || 'Please enter your name');
            return;
        }

        const fullCode = code.join('');
        const auth = getCustomerAuth();
        const result = await joinSession(
            fullCode,
            name.trim(),
            auth?.customer?.id?.toString()
        );

        if (result.success) {
            handleClose();
            setTimeout(() => onSuccess(), 260);
        } else {
            setError(result.error || 'Failed to join group');
        }
    };

    if (!isOpen) return null;

    return (
        <>
            <div
                className={`fixed inset-0 bg-black/50 z-1000 transition-opacity duration-250 ${isClosing ? 'animate-fadeOut' : 'animate-fadeIn'}`}
                onClick={handleClose}
            />

            <div className={`fixed inset-x-0 bottom-0 z-1000 flex justify-center ${isClosing ? 'animate-slideDown' : 'animate-slideUp'}`}>
                <div className="w-full max-w-[500px] bg-white rounded-t-2xl shadow-2xl">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                        <div className="flex items-center gap-2">
                            {step === 'name' && (
                                <button
                                    onClick={() => setStep('code')}
                                    className="flex items-center justify-center w-8 h-8 rounded-full hover:bg-gray-100 transition-colors"
                                >
                                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                        <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
                                    </svg>
                                </button>
                            )}
                            <h2 className="text-lg font-semibold text-gray-900" style={{ margin: 0, lineHeight: 'normal' }}>
                                {t('groupOrder.joinSession') || 'Join Existing Group'}
                            </h2>
                            {step === 'name' && (
                                <span className="px-2 py-0.5 bg-gray-100 text-gray-600 text-xs font-mono rounded">
                                    {code.join('')}
                                </span>
                            )}
                        </div>
                        <button
                            onClick={handleClose}
                            className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-gray-100 transition-colors"
                        >
                            <svg width="18" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Content */}
                    <div className="px-4 py-4">
                        {step === 'code' ? (
                            <>
                                <label className="block text-sm font-semibold text-gray-900 mb-3">
                                    {t('groupOrder.enterCode') || 'Enter Group Code'}<span className="text-red-500">*</span>
                                </label>

                                {/* Code Input Grid */}
                                <div className="flex justify-center gap-3 mb-4">
                                    {code.map((char, index) => (
                                        <input
                                            key={index}
                                            ref={inputRefs[index]}
                                            type="text"
                                            maxLength={4}
                                            value={char}
                                            onChange={(e) => handleCodeChange(index, e.target.value)}
                                            onKeyDown={(e) => handleKeyDown(index, e)}
                                            className="w-14 h-14 text-center text-2xl font-bold uppercase bg-white border-2 border-gray-300 rounded-lg text-gray-900 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all"
                                        />
                                    ))}
                                </div>

                                {error && (
                                    <p className="mt-2 text-sm text-red-600 text-center" role="alert">
                                        {error}
                                    </p>
                                )}

                                <p className="text-xs text-gray-500 text-center mt-2">
                                    {t('groupOrder.codeHint') || 'Ask the host for the 4-character code'}
                                </p>
                            </>
                        ) : (
                            <>
                                {/* Name Input */}
                                <div className="mb-4">
                                    <label
                                        htmlFor="joinName"
                                        className="block text-sm font-semibold text-gray-900 mb-2"
                                    >
                                        {t('groupOrder.yourName') || 'Your Name'}<span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        id="joinName"
                                        type="text"
                                        maxLength={50}
                                        value={name}
                                        onChange={(e) => setName(e.target.value)}
                                        onKeyPress={(e) => e.key === 'Enter' && handleSubmit()}
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
                            </>
                        )}
                    </div>

                    {/* Footer Button */}
                    <div className="px-4 pb-4">
                        {step === 'code' ? (
                            <button
                                onClick={handleNextStep}
                                disabled={code.join('').length < 4}
                                className="w-full h-12 bg-orange-500 text-white font-medium rounded-md hover:bg-orange-600 transition-colors disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
                            >
                                {t('common.next') || 'Next'}
                            </button>
                        ) : (
                            <button
                                onClick={handleSubmit}
                                disabled={!name.trim() || isLoading}
                                className="w-full h-12 bg-orange-500 text-white font-medium rounded-md hover:bg-orange-600 transition-colors disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                            >
                                {isLoading ? (
                                    <>
                                        <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                                        </svg>
                                        <span>{t('common.loading') || 'Joining...'}</span>
                                    </>
                                ) : (
                                    t('groupOrder.joinGroup') || 'Join Group'
                                )}
                            </button>
                        )}
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
