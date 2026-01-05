'use client';

import { useState } from 'react';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { useGroupOrder } from '@/context/GroupOrderContext';
import { HiUserGroup, HiPlus, HiUserPlus, HiChevronRight, HiXMark } from 'react-icons/hi2';

interface GroupOrderChoiceModalProps {
    isOpen: boolean;
    onClose: () => void;
    onCreateGroup: () => void;
    onJoinGroup: () => void;
    onViewGroup: () => void;
}

/**
 * Group Order Choice Modal - Bottom Sheet Style
 * 
 * Uses react-icons throughout for consistent, professional look.
 */
export default function GroupOrderChoiceModal({
    isOpen,
    onClose,
    onCreateGroup,
    onJoinGroup,
    onViewGroup,
}: GroupOrderChoiceModalProps) {
    const { t } = useTranslation();
    const { isInGroupOrder, session } = useGroupOrder();
    const [isClosing, setIsClosing] = useState(false);

    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            setIsClosing(false);
            onClose();
        }, 250);
    };

    const handleCreate = () => {
        handleClose();
        setTimeout(() => onCreateGroup(), 260);
    };

    const handleJoin = () => {
        handleClose();
        setTimeout(() => onJoinGroup(), 260);
    };

    const handleViewGroup = () => {
        handleClose();
        setTimeout(() => onViewGroup(), 260);
    };

    if (!isOpen) return null;

    // If already in a group, show view option (same styling as create/join)
    if (isInGroupOrder && session) {
        return (
            <>
                <div
                    className={`fixed inset-0 bg-black/50 z-[100] transition-opacity duration-250 ${isClosing ? 'animate-fadeOut' : 'animate-fadeIn'}`}
                    onClick={handleClose}
                />
                <div className={`fixed inset-x-0 bottom-0 z-[100] flex justify-center ${isClosing ? 'animate-slideDown' : 'animate-slideUp'}`}>
                    <div className="w-full max-w-[500px] bg-white rounded-t-2xl shadow-2xl">
                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                            <h2 className="text-lg font-semibold text-gray-900" style={{ margin: 0, lineHeight: 'normal' }}>
                                {t('groupOrder.title') || 'Group Order'}
                            </h2>
                            <button
                                onClick={handleClose}
                                className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-gray-100 transition-colors"
                            >
                                <HiXMark className="w-5 h-5 text-gray-500" />
                            </button>
                        </div>

                        <div className="px-4 pb-4 pt-4 space-y-3">
                            {/* Active Session Card - Same styling as create/join */}
                            <button
                                onClick={handleViewGroup}
                                className="w-full flex items-center gap-4 p-4 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors"
                            >
                                <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center">
                                    <HiUserGroup className="w-6 h-6 text-white" />
                                </div>
                                <div className="flex-1 text-left">
                                    <p className="font-semibold text-gray-900">
                                        {t('groupOrder.activeSession') || 'Active Group Order'}
                                    </p>
                                    <p className="text-sm text-gray-500">
                                        Code: <span className="font-mono font-bold text-orange-600">{session.sessionCode}</span>
                                    </p>
                                </div>
                                <HiChevronRight className="w-5 h-5 text-gray-400" />
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

    return (
        <>
            <div
                className={`fixed inset-0 bg-black/50 z-[100] transition-opacity duration-250 ${isClosing ? 'animate-fadeOut' : 'animate-fadeIn'}`}
                onClick={handleClose}
            />

            <div className={`fixed inset-x-0 bottom-0 z-[100] flex justify-center ${isClosing ? 'animate-slideDown' : 'animate-slideUp'}`}>
                <div className="w-full max-w-[500px] bg-white rounded-t-2xl shadow-2xl">
                    {/* Header */}
                    <div className="flex items-center justify-between px-4 py-3 border-b border-gray-200">
                        <h2 className="text-lg font-semibold text-gray-900" style={{ margin: 0, lineHeight: 'normal' }}>
                            {t('groupOrder.title') || 'Group Order'}
                        </h2>
                        <button
                            onClick={handleClose}
                            className="flex items-center justify-center w-9 h-9 rounded-full hover:bg-gray-100 transition-colors"
                        >
                            <HiXMark className="w-5 h-5 text-gray-500" />
                        </button>
                    </div>

                    {/* Description */}
                    <div className="px-4 pt-4 pb-2">
                        <p className="text-sm text-gray-600">
                            {t('groupOrder.subtitle') || 'Order together with friends and split the bill'}
                        </p>
                    </div>

                    {/* Options */}
                    <div className="px-4 pb-4 space-y-3">
                        {/* Create Group */}
                        <button
                            onClick={handleCreate}
                            className="w-full flex items-center gap-4 p-4 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors"
                        >
                            <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center">
                                <HiPlus className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex-1 text-left">
                                <p className="font-semibold text-gray-900">
                                    {t('groupOrder.createSession') || 'Create New Group'}
                                </p>
                                <p className="text-sm text-gray-500">
                                    {t('groupOrder.createDescription') || 'Start a group and share the code'}
                                </p>
                            </div>
                            <HiChevronRight className="w-5 h-5 text-gray-400" />
                        </button>

                        {/* Join Group */}
                        <button
                            onClick={handleJoin}
                            className="w-full flex items-center gap-4 p-4 bg-gray-50 border border-gray-200 rounded-xl hover:bg-gray-100 transition-colors"
                        >
                            <div className="w-12 h-12 bg-orange-500 rounded-full flex items-center justify-center">
                                <HiUserPlus className="w-6 h-6 text-white" />
                            </div>
                            <div className="flex-1 text-left">
                                <p className="font-semibold text-gray-900">
                                    {t('groupOrder.joinSession') || 'Join Existing Group'}
                                </p>
                                <p className="text-sm text-gray-500">
                                    {t('groupOrder.joinDescription') || 'Enter a code to join'}
                                </p>
                            </div>
                            <HiChevronRight className="w-5 h-5 text-gray-400" />
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
