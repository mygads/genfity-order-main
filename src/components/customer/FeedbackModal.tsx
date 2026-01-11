'use client';

import { useState } from 'react';
import { FaStar, FaTimes, FaPaperPlane, FaClock, FaUtensils, FaConciergeBell } from 'react-icons/fa';

interface FeedbackModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (feedback: FeedbackData) => Promise<void>;
    orderNumber: string;
    completionTimeMinutes?: number | null;
    language?: 'en' | 'id';
}

interface FeedbackData {
    overallRating: number;
    serviceRating?: number;
    foodRating?: number;
    comment?: string;
}

const labels = {
    en: {
        title: 'Order Completed!',
        completedIn: 'Your order was completed in',
        minutes: 'minutes',
        hours: 'hours',
        lessThanMinute: 'less than a minute',
        rateExperience: 'How was your experience?',
        overallRating: 'Overall Rating',
        serviceRating: 'Service Quality',
        foodRating: 'Food Quality',
        leaveComment: 'Leave a comment (optional)',
        commentPlaceholder: 'Tell us about your experience...',
        submit: 'Submit Feedback',
        submitting: 'Submitting...',
        thankYou: 'Thank you for your feedback!',
    },
    id: {
        title: 'Pesanan Selesai!',
        completedIn: 'Pesanan Anda selesai dalam',
        minutes: 'menit',
        hours: 'jam',
        lessThanMinute: 'kurang dari satu menit',
        rateExperience: 'Bagaimana pengalaman Anda?',
        overallRating: 'Rating Keseluruhan',
        serviceRating: 'Kualitas Layanan',
        foodRating: 'Kualitas Makanan',
        leaveComment: 'Tinggalkan komentar (opsional)',
        commentPlaceholder: 'Ceritakan pengalaman Anda...',
        submit: 'Kirim Feedback',
        submitting: 'Mengirim...',
        thankYou: 'Terima kasih atas feedback Anda!',
    },
};

function formatCompletionTime(minutes: number, lang: 'en' | 'id'): string {
    const t = labels[lang];
    if (minutes < 1) return t.lessThanMinute;
    if (minutes < 60) return `${minutes} ${t.minutes}`;
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    if (remainingMinutes === 0) return `${hours} ${t.hours}`;
    return `${hours} ${t.hours} ${remainingMinutes} ${t.minutes}`;
}

interface StarRatingProps {
    value: number;
    onChange: (rating: number) => void;
    label: string;
    icon?: React.ReactNode;
    required?: boolean;
}

function StarRating({ value, onChange, label, icon, required }: StarRatingProps) {
    const [hoverValue, setHoverValue] = useState(0);

    return (
        <div className="mb-4">
            <div className="flex items-center gap-2 mb-2">
                {icon && <span className="text-gray-500">{icon}</span>}
                <span className="text-sm font-medium text-gray-700">
                    {label}
                    {required && <span className="text-red-500 ml-1">*</span>}
                </span>
            </div>
            <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                    <button
                        key={star}
                        type="button"
                        onClick={() => onChange(star)}
                        onMouseEnter={() => setHoverValue(star)}
                        onMouseLeave={() => setHoverValue(0)}
                        className="p-1 transition-transform duration-150 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-orange-300 rounded"
                    >
                        <FaStar
                            className={`w-8 h-8 transition-colors duration-150 ${(hoverValue || value) >= star
                                    ? 'text-yellow-400'
                                    : 'text-gray-300'
                                }`}
                        />
                    </button>
                ))}
            </div>
        </div>
    );
}

export default function FeedbackModal({
    isOpen,
    onClose,
    onSubmit,
    orderNumber,
    completionTimeMinutes,
    language = 'en',
}: FeedbackModalProps) {
    const t = labels[language];

    const [overallRating, setOverallRating] = useState(0);
    const [serviceRating, setServiceRating] = useState(0);
    const [foodRating, setFoodRating] = useState(0);
    const [comment, setComment] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSubmitted, setIsSubmitted] = useState(false);

    const handleSubmit = async () => {
        if (overallRating === 0) return;

        setIsSubmitting(true);
        try {
            await onSubmit({
                overallRating,
                serviceRating: serviceRating > 0 ? serviceRating : undefined,
                foodRating: foodRating > 0 ? foodRating : undefined,
                comment: comment.trim() || undefined,
            });
            setIsSubmitted(true);
            // Auto close after showing thank you
            setTimeout(() => {
                onClose();
            }, 2000);
        } catch (error) {
            console.error('Failed to submit feedback:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fadeIn"
            onClick={(e) => e.target === e.currentTarget && onClose()}
        >
            <div className="relative w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-slideUp">
                {/* Close button */}
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 p-2 text-gray-400 hover:text-gray-600 transition-colors z-10"
                    aria-label="Close"
                >
                    <FaTimes className="w-5 h-5" />
                </button>

                {isSubmitted ? (
                    /* Thank You State */
                    <div className="p-8 text-center animate-fadeIn">
                        <div className="w-16 h-16 mx-auto mb-4 bg-green-100 rounded-full flex items-center justify-center">
                            <FaStar className="w-8 h-8 text-green-500 animate-pulse" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 mb-2">{t.thankYou}</h2>
                    </div>
                ) : (
                    <>
                        {/* Header with completion time */}
                        <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-6 py-5 text-white">
                            <h2 className="text-xl font-bold mb-1">{t.title}</h2>
                            {completionTimeMinutes !== null && completionTimeMinutes !== undefined && (
                                <div className="flex items-center gap-2 text-orange-100 text-sm">
                                    <FaClock className="w-4 h-4" />
                                    <span>
                                        {t.completedIn} {formatCompletionTime(completionTimeMinutes, language)}
                                    </span>
                                </div>
                            )}
                            <p className="text-xs text-orange-200 mt-1">Order #{orderNumber}</p>
                        </div>

                        {/* Rating Form */}
                        <div className="p-6">
                            <p className="text-sm text-gray-600 mb-5">{t.rateExperience}</p>

                            {/* Overall Rating (Required) */}
                            <StarRating
                                value={overallRating}
                                onChange={setOverallRating}
                                label={t.overallRating}
                                icon={<FaStar className="w-4 h-4" />}
                                required
                            />

                            {/* Service Rating (Optional) */}
                            <StarRating
                                value={serviceRating}
                                onChange={setServiceRating}
                                label={t.serviceRating}
                                icon={<FaConciergeBell className="w-4 h-4" />}
                            />

                            {/* Food Rating (Optional) */}
                            <StarRating
                                value={foodRating}
                                onChange={setFoodRating}
                                label={t.foodRating}
                                icon={<FaUtensils className="w-4 h-4" />}
                            />

                            {/* Comment */}
                            <div className="mb-5">
                                <label className="block text-sm font-medium text-gray-700 mb-2">
                                    {t.leaveComment}
                                </label>
                                <textarea
                                    value={comment}
                                    onChange={(e) => setComment(e.target.value)}
                                    placeholder={t.commentPlaceholder}
                                    rows={3}
                                    className="w-full px-4 py-3 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-orange-300 focus:border-transparent resize-none transition-shadow"
                                />
                            </div>

                            {/* Submit Button */}
                            <button
                                onClick={handleSubmit}
                                disabled={overallRating === 0 || isSubmitting}
                                className={`w-full py-3 px-4 rounded-xl font-semibold text-white transition-all duration-200 flex items-center justify-center gap-2 ${overallRating === 0 || isSubmitting
                                        ? 'bg-gray-300 cursor-not-allowed'
                                        : 'bg-orange-500 hover:bg-orange-600 active:scale-[0.98] shadow-lg shadow-orange-500/30'
                                    }`}
                            >
                                {isSubmitting ? (
                                    <>
                                        <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                                        <span>{t.submitting}</span>
                                    </>
                                ) : (
                                    <>
                                        <FaPaperPlane className="w-4 h-4" />
                                        <span>{t.submit}</span>
                                    </>
                                )}
                            </button>
                        </div>
                    </>
                )}
            </div>

            {/* CSS Animations */}
            <style jsx global>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(20px) scale(0.95); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        .animate-fadeIn {
          animation: fadeIn 0.2s ease-out forwards;
        }
        .animate-slideUp {
          animation: slideUp 0.3s ease-out forwards;
        }
      `}</style>
        </div>
    );
}
