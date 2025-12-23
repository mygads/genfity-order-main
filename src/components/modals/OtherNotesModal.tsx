'use client';

import { useState, useEffect, useRef } from 'react';

interface OtherNotesModalProps {
    isOpen: boolean;
    onClose: () => void;
    onAdd: (notes: string) => void;
    initialNotes?: string;
}

/**
 * Other Notes Modal - ESB Bottom Sheet Style
 * 
 * Modal for adding/editing customer notes for the entire order
 */
export default function OtherNotesModal({
    isOpen,
    onClose,
    onAdd,
    initialNotes = '',
}: OtherNotesModalProps) {
    const [isClosing, setIsClosing] = useState(false);
    const [notes, setNotes] = useState(initialNotes);
    const [isFocused, setIsFocused] = useState(false);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    // Update notes when initialNotes changes
    useEffect(() => {
        setNotes(initialNotes);
    }, [initialNotes]);

    // Auto-focus textarea when modal opens
    useEffect(() => {
        if (isOpen && textareaRef.current) {
            setTimeout(() => {
                textareaRef.current?.focus();
            }, 300);
        }
    }, [isOpen]);

    // Handle smooth close
    const handleClose = () => {
        setIsClosing(true);
        setTimeout(() => {
            setIsClosing(false);
            onClose();
        }, 300);
    };

    const handleAdd = () => {
        onAdd(notes);
        handleClose();
    };

    if (!isOpen) return null;

    return (
        <>
            <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        @keyframes slideUp {
          from { transform: translateY(100%); }
          to { transform: translateY(0); }
        }
        @keyframes slideDown {
          from { transform: translateY(0); }
          to { transform: translateY(100%); }
        }
        .animate-fade-in { animation: fadeIn 0.3s ease-out; }
        .animate-fade-out { animation: fadeOut 0.3s ease-in forwards; }
        .animate-slide-up { animation: slideUp 0.3s ease-out; }
        .animate-slide-down { animation: slideDown 0.3s ease-in forwards; }
      `}</style>

            {/* Overlay */}
            <div
                className={`fixed inset-0 bg-black/50 z-[300] ${isClosing ? 'animate-fade-out' : 'animate-fade-in'}`}
                onClick={handleClose}
            />

            {/* Bottom Sheet Modal - ESB Style */}
            <div
                className={`fixed bottom-0 left-0 right-0 z-[301] ${isClosing ? 'animate-slide-down' : 'animate-slide-up'}`}
                style={{
                    maxWidth: '500px',
                    margin: '0 auto',
                    fontFamily: 'Inter, sans-serif'
                }}
            >
                <div
                    style={{
                        backgroundColor: 'white',
                        borderTopLeftRadius: '24px',
                        borderTopRightRadius: '24px',
                        padding: '24px 16px',
                        boxShadow: '0 -4px 20px rgba(0,0,0,0.15)'
                    }}
                    onClick={(e) => e.stopPropagation()}
                >
                    {/* Header with Title and Close Button */}
                    <div className="flex items-center justify-between mb-4">
                        <h3
                            style={{
                                fontSize: '18px',
                                fontWeight: 600,
                                color: '#1A1A1A',
                                lineHeight: '24px'
                            }}
                        >
                            Other Notes
                        </h3>
                        <button
                            onClick={handleClose}
                            className="w-8 h-8 flex items-center justify-center"
                            aria-label="Close"
                        >
                            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#1A1A1A" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M18 6L6 18M6 6l12 12" />
                            </svg>
                        </button>
                    </div>

                    {/* Textarea */}
                    <textarea
                        ref={textareaRef}
                        value={notes}
                        onChange={(e) => setNotes(e.target.value)}
                        onFocus={() => setIsFocused(true)}
                        onBlur={() => setIsFocused(false)}
                        placeholder="Customer Notes"
                        style={{
                            width: '100%',
                            minHeight: '120px',
                            padding: '16px',
                            border: isFocused ? '1px solid #F05A28' : '1px solid #D0D5DD',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontFamily: 'Inter, sans-serif',
                            resize: 'none',
                            outline: 'none',
                            marginBottom: '16px',
                            transition: 'border-color 0.2s ease'
                        }}
                    />

                    {/* Add Button */}
                    <button
                        onClick={handleAdd}
                        style={{
                            width: '100%',
                            height: '48px',
                            backgroundColor: '#F05A28',
                            border: 'none',
                            borderRadius: '8px',
                            color: 'white',
                            fontSize: '14px',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        Add
                    </button>
                </div>
            </div>
        </>
    );
}
