'use client';

import { Suspense } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import {
  FaArrowLeft,
  FaBell,
  FaCalendarAlt,
  FaCheckCircle,
  FaCreditCard,
  FaHistory,
  FaListAlt,
  FaMapMarkedAlt,
  FaQuestionCircle,
  FaReceipt,
  FaShoppingBag,
  FaTicketAlt,
  FaUtensils,
  FaUsers,
  FaUserCircle
} from 'react-icons/fa';
import LoadingState, { LOADING_MESSAGES } from '@/components/common/LoadingState';
import PoweredByFooter from '@/components/common/PoweredByFooter';
import { useTranslation } from '@/lib/i18n/useTranslation';
import { customerProfileUrl } from '@/lib/utils/customerRoutes';

function HelpCenterContent() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const { t } = useTranslation();

  const merchantCode = params.merchantCode as string;
  const mode = searchParams.get('mode') || 'dinein';

  const decodeRef = (value: string) => {
    try {
      return decodeURIComponent(value);
    } catch {
      return null;
    }
  };

  const isSafeInternalPath = (value: string) => {
    return value.startsWith('/') && !value.startsWith('//') && !value.includes('\0');
  };

  const rawRef = searchParams.get('ref');
  const decodedRef = rawRef ? decodeRef(rawRef) : null;
  const safeRef = decodedRef && isSafeInternalPath(decodedRef) ? decodedRef : null;
  const fallbackRef = customerProfileUrl(merchantCode, { mode });

  const handleBack = () => {
    router.push(safeRef ?? fallbackRef);
  };

  const tutorialCards = [
    {
      key: 'browse',
      title: t('customer.helpCenter.cards.browse.title'),
      description: t('customer.helpCenter.cards.browse.desc'),
      image: '/images/help/gambar1.png',
      alt: t('customer.helpCenter.cards.browse.alt')
    },
    {
      key: 'customize',
      title: t('customer.helpCenter.cards.customize.title'),
      description: t('customer.helpCenter.cards.customize.desc'),
      image: '/images/help/gambar2.png',
      alt: t('customer.helpCenter.cards.customize.alt')
    },
    {
      key: 'checkout',
      title: t('customer.helpCenter.cards.checkout.title'),
      description: t('customer.helpCenter.cards.checkout.desc'),
      image: '/images/help/gambar3.png',
      alt: t('customer.helpCenter.cards.checkout.alt')
    },
    {
      key: 'track',
      title: t('customer.helpCenter.cards.track.title'),
      description: t('customer.helpCenter.cards.track.desc'),
      image: '/images/help/gambar4.png',
      alt: t('customer.helpCenter.cards.track.alt')
    },
    {
      key: 'voucher',
      title: t('customer.helpCenter.cards.voucher.title'),
      description: t('customer.helpCenter.cards.voucher.desc'),
      image: '/images/help/gambar5.png',
      alt: t('customer.helpCenter.cards.voucher.alt')
    },
    {
      key: 'reservation',
      title: t('customer.helpCenter.cards.reservation.title'),
      description: t('customer.helpCenter.cards.reservation.desc'),
      image: '/images/help/gambar6.png',
      alt: t('customer.helpCenter.cards.reservation.alt')
    },
    {
      key: 'groupOrder',
      title: t('customer.helpCenter.cards.groupOrder.title'),
      description: t('customer.helpCenter.cards.groupOrder.desc'),
      image: '/images/help/gambar7.png',
      alt: t('customer.helpCenter.cards.groupOrder.alt')
    },
    {
      key: 'history',
      title: t('customer.helpCenter.cards.history.title'),
      description: t('customer.helpCenter.cards.history.desc'),
      image: '/images/help/gambar8.png',
      alt: t('customer.helpCenter.cards.history.alt')
    }
  ];

  const faqItems = [
    {
      question: t('customer.helpCenter.faq.q1'),
      answer: t('customer.helpCenter.faq.a1')
    },
    {
      question: t('customer.helpCenter.faq.q2'),
      answer: t('customer.helpCenter.faq.a2')
    },
    {
      question: t('customer.helpCenter.faq.q3'),
      answer: t('customer.helpCenter.faq.a3')
    },
    {
      question: t('customer.helpCenter.faq.q4'),
      answer: t('customer.helpCenter.faq.a4')
    },
    {
      question: t('customer.helpCenter.faq.q5'),
      answer: t('customer.helpCenter.faq.a5')
    },
    {
      question: t('customer.helpCenter.faq.q6'),
      answer: t('customer.helpCenter.faq.a6')
    },
    {
      question: t('customer.helpCenter.faq.q7'),
      answer: t('customer.helpCenter.faq.a7')
    },
    {
      question: t('customer.helpCenter.faq.q8'),
      answer: t('customer.helpCenter.faq.a8')
    },
    {
      question: t('customer.helpCenter.faq.q9'),
      answer: t('customer.helpCenter.faq.a9')
    },
    {
      question: t('customer.helpCenter.faq.q10'),
      answer: t('customer.helpCenter.faq.a10')
    }
  ];

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="sticky top-0 z-10 bg-white border-b border-gray-300 shadow-md">
        <div className="flex items-center px-4 py-3">
          <button
            onClick={handleBack}
            className="w-10 h-10 flex items-center justify-center -ml-2"
            aria-label={t('common.back')}
          >
            <FaArrowLeft className="w-5 h-5 text-gray-700" />
          </button>
          <h1 className="flex-1 text-center font-semibold text-gray-900 text-base pr-10">
            {t('customer.helpCenter.title')}
          </h1>
        </div>
      </header>

      <div className="flex-1 px-4 py-6 space-y-8">
        <section className="space-y-3">
          <div className="flex items-center gap-2 text-orange-500">
            <FaQuestionCircle className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wide">
              {t('customer.helpCenter.subtitle')}
            </span>
          </div>
          <h2 className="text-xl font-bold text-gray-900">
            {t('customer.helpCenter.heading')}
          </h2>
          <p className="text-sm text-gray-600">
            {t('customer.helpCenter.description')}
          </p>
        </section>

        <section className="space-y-3">
          <h3 className="text-sm font-semibold text-gray-900">
            {t('customer.helpCenter.tocTitle')}
          </h3>
          <div className="grid grid-cols-2 gap-2 text-sm text-orange-500">
            <a href="#getting-started" className="rounded-lg border border-orange-100 px-3 py-2 hover:bg-orange-50">
              {t('customer.helpCenter.toc.gettingStarted')}
            </a>
            <a href="#order-modes" className="rounded-lg border border-orange-100 px-3 py-2 hover:bg-orange-50">
              {t('customer.helpCenter.toc.orderModes')}
            </a>
            <a href="#browse-menu" className="rounded-lg border border-orange-100 px-3 py-2 hover:bg-orange-50">
              {t('customer.helpCenter.toc.browseMenu')}
            </a>
            <a href="#customize-order" className="rounded-lg border border-orange-100 px-3 py-2 hover:bg-orange-50">
              {t('customer.helpCenter.toc.customizeOrder')}
            </a>
            <a href="#vouchers" className="rounded-lg border border-orange-100 px-3 py-2 hover:bg-orange-50">
              {t('customer.helpCenter.toc.vouchers')}
            </a>
            <a href="#checkout-payment" className="rounded-lg border border-orange-100 px-3 py-2 hover:bg-orange-50">
              {t('customer.helpCenter.toc.checkoutPayment')}
            </a>
            <a href="#schedule-reservations" className="rounded-lg border border-orange-100 px-3 py-2 hover:bg-orange-50">
              {t('customer.helpCenter.toc.scheduleReservations')}
            </a>
            <a href="#group-order" className="rounded-lg border border-orange-100 px-3 py-2 hover:bg-orange-50">
              {t('customer.helpCenter.toc.groupOrder')}
            </a>
            <a href="#track-order" className="rounded-lg border border-orange-100 px-3 py-2 hover:bg-orange-50">
              {t('customer.helpCenter.toc.trackOrder')}
            </a>
            <a href="#receipts-history" className="rounded-lg border border-orange-100 px-3 py-2 hover:bg-orange-50">
              {t('customer.helpCenter.toc.receiptsHistory')}
            </a>
            <a href="#profile-account" className="rounded-lg border border-orange-100 px-3 py-2 hover:bg-orange-50">
              {t('customer.helpCenter.toc.profileAccount')}
            </a>
            <a href="#notifications-language" className="rounded-lg border border-orange-100 px-3 py-2 hover:bg-orange-50">
              {t('customer.helpCenter.toc.notificationsLanguage')}
            </a>
            <a href="#troubleshooting" className="rounded-lg border border-orange-100 px-3 py-2 hover:bg-orange-50">
              {t('customer.helpCenter.toc.troubleshooting')}
            </a>
            <a href="#faq" className="rounded-lg border border-orange-100 px-3 py-2 hover:bg-orange-50">
              {t('customer.helpCenter.toc.faq')}
            </a>
            <a href="#support" className="rounded-lg border border-orange-100 px-3 py-2 hover:bg-orange-50">
              {t('customer.helpCenter.toc.support')}
            </a>
          </div>
        </section>

        <section id="getting-started" className="space-y-4">
          <div className="flex items-center gap-2">
            <FaCheckCircle className="w-5 h-5 text-orange-500" />
            <h3 className="text-base font-semibold text-gray-900">
              {t('customer.helpCenter.gettingStarted.title')}
            </h3>
          </div>
          <p className="text-sm text-gray-600">
            {t('customer.helpCenter.gettingStarted.body')}
          </p>
          <ol className="space-y-2 text-sm text-gray-700 list-decimal list-inside">
            <li>{t('customer.helpCenter.gettingStarted.step1')}</li>
            <li>{t('customer.helpCenter.gettingStarted.step2')}</li>
            <li>{t('customer.helpCenter.gettingStarted.step3')}</li>
          </ol>
        </section>

        <section className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 space-y-2">
          <h4 className="font-semibold text-gray-900">
            {t('customer.helpCenter.tips.title')}
          </h4>
          <ul className="list-disc list-inside space-y-1 text-gray-600">
            <li>{t('customer.helpCenter.tips.item1')}</li>
            <li>{t('customer.helpCenter.tips.item2')}</li>
            <li>{t('customer.helpCenter.tips.item3')}</li>
          </ul>
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          {tutorialCards.map((card) => (
            <div key={card.key} className="rounded-xl border border-gray-200 bg-white shadow-sm overflow-hidden">
              <img
                src={card.image}
                alt={card.alt}
                className="w-full h-44 object-cover"
              />
              <div className="p-4 space-y-2">
                <h4 className="text-sm font-semibold text-gray-900">{card.title}</h4>
                <p className="text-sm text-gray-600">{card.description}</p>
              </div>
            </div>
          ))}
        </section>

        <section id="order-modes" className="space-y-3">
          <div className="flex items-center gap-2">
            <FaUtensils className="w-5 h-5 text-orange-500" />
            <h3 className="text-base font-semibold text-gray-900">
              {t('customer.helpCenter.orderModes.title')}
            </h3>
          </div>
          <p className="text-sm text-gray-600">
            {t('customer.helpCenter.orderModes.desc')}
          </p>
          <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
            <li>{t('customer.helpCenter.orderModes.item1')}</li>
            <li>{t('customer.helpCenter.orderModes.item2')}</li>
            <li>{t('customer.helpCenter.orderModes.item3')}</li>
          </ul>
          <div className="rounded-lg border border-orange-100 bg-orange-50 px-4 py-3 text-sm text-orange-700">
            {t('customer.helpCenter.orderModes.tableHint')}
          </div>
        </section>

        <section id="browse-menu" className="space-y-3">
          <div className="flex items-center gap-2">
            <FaListAlt className="w-5 h-5 text-orange-500" />
            <h3 className="text-base font-semibold text-gray-900">
              {t('customer.helpCenter.browse.title')}
            </h3>
          </div>
          <p className="text-sm text-gray-600">
            {t('customer.helpCenter.browse.desc')}
          </p>
        </section>

        <section id="customize-order" className="space-y-3">
          <div className="flex items-center gap-2">
            <FaShoppingBag className="w-5 h-5 text-orange-500" />
            <h3 className="text-base font-semibold text-gray-900">
              {t('customer.helpCenter.customize.title')}
            </h3>
          </div>
          <p className="text-sm text-gray-600">
            {t('customer.helpCenter.customize.desc')}
          </p>
          <div className="rounded-lg border border-orange-100 bg-orange-50 px-4 py-3 text-sm text-orange-700">
            {t('customer.helpCenter.customize.tip')}
          </div>
        </section>

        <section id="vouchers" className="space-y-3">
          <div className="flex items-center gap-2">
            <FaTicketAlt className="w-5 h-5 text-orange-500" />
            <h3 className="text-base font-semibold text-gray-900">
              {t('customer.helpCenter.vouchers.title')}
            </h3>
          </div>
          <p className="text-sm text-gray-600">
            {t('customer.helpCenter.vouchers.desc')}
          </p>
          <ol className="list-decimal list-inside text-sm text-gray-600 space-y-1">
            <li>{t('customer.helpCenter.vouchers.step1')}</li>
            <li>{t('customer.helpCenter.vouchers.step2')}</li>
            <li>{t('customer.helpCenter.vouchers.step3')}</li>
          </ol>
        </section>

        <section id="checkout-payment" className="space-y-3">
          <div className="flex items-center gap-2">
            <FaCreditCard className="w-5 h-5 text-orange-500" />
            <h3 className="text-base font-semibold text-gray-900">
              {t('customer.helpCenter.checkout.title')}
            </h3>
          </div>
          <p className="text-sm text-gray-600">
            {t('customer.helpCenter.checkout.desc')}
          </p>
          <p className="text-sm text-gray-600">
            {t('customer.helpCenter.checkout.hint')}
          </p>
        </section>

        <section id="schedule-reservations" className="space-y-3">
          <div className="flex items-center gap-2">
            <FaCalendarAlt className="w-5 h-5 text-orange-500" />
            <h3 className="text-base font-semibold text-gray-900">
              {t('customer.helpCenter.schedule.title')}
            </h3>
          </div>
          <p className="text-sm text-gray-600">
            {t('customer.helpCenter.schedule.desc')}
          </p>
          <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
            <li>{t('customer.helpCenter.schedule.item1')}</li>
            <li>{t('customer.helpCenter.schedule.item2')}</li>
            <li>{t('customer.helpCenter.schedule.item3')}</li>
          </ul>
        </section>

        <section id="group-order" className="space-y-3">
          <div className="flex items-center gap-2">
            <FaUsers className="w-5 h-5 text-orange-500" />
            <h3 className="text-base font-semibold text-gray-900">
              {t('customer.helpCenter.groupOrder.title')}
            </h3>
          </div>
          <p className="text-sm text-gray-600">
            {t('customer.helpCenter.groupOrder.desc')}
          </p>
          <ol className="list-decimal list-inside text-sm text-gray-600 space-y-1">
            <li>{t('customer.helpCenter.groupOrder.step1')}</li>
            <li>{t('customer.helpCenter.groupOrder.step2')}</li>
            <li>{t('customer.helpCenter.groupOrder.step3')}</li>
          </ol>
        </section>

        <section id="track-order" className="space-y-3">
          <div className="flex items-center gap-2">
            <FaMapMarkedAlt className="w-5 h-5 text-orange-500" />
            <h3 className="text-base font-semibold text-gray-900">
              {t('customer.helpCenter.track.title')}
            </h3>
          </div>
          <p className="text-sm text-gray-600">
            {t('customer.helpCenter.track.desc')}
          </p>
          <p className="text-sm text-gray-600">
            {t('customer.helpCenter.track.hint')}
          </p>
        </section>

        <section id="receipts-history" className="space-y-3">
          <div className="flex items-center gap-2">
            <FaReceipt className="w-5 h-5 text-orange-500" />
            <h3 className="text-base font-semibold text-gray-900">
              {t('customer.helpCenter.receipts.title')}
            </h3>
          </div>
          <p className="text-sm text-gray-600">
            {t('customer.helpCenter.receipts.desc')}
          </p>
          <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
            <li>{t('customer.helpCenter.receipts.item1')}</li>
            <li>{t('customer.helpCenter.receipts.item2')}</li>
            <li>{t('customer.helpCenter.receipts.item3')}</li>
          </ul>
        </section>

        <section id="profile-account" className="space-y-3">
          <div className="flex items-center gap-2">
            <FaUserCircle className="w-5 h-5 text-orange-500" />
            <h3 className="text-base font-semibold text-gray-900">
              {t('customer.helpCenter.profile.title')}
            </h3>
          </div>
          <p className="text-sm text-gray-600">
            {t('customer.helpCenter.profile.desc')}
          </p>
          <p className="text-sm text-gray-600">
            {t('customer.helpCenter.profile.hint')}
          </p>
        </section>

        <section id="notifications-language" className="space-y-3">
          <div className="flex items-center gap-2">
            <FaBell className="w-5 h-5 text-orange-500" />
            <h3 className="text-base font-semibold text-gray-900">
              {t('customer.helpCenter.notifications.title')}
            </h3>
          </div>
          <p className="text-sm text-gray-600">
            {t('customer.helpCenter.notifications.desc')}
          </p>
          <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
            <li>{t('customer.helpCenter.notifications.item1')}</li>
            <li>{t('customer.helpCenter.notifications.item2')}</li>
            <li>{t('customer.helpCenter.notifications.item3')}</li>
          </ul>
        </section>

        <section id="troubleshooting" className="space-y-3">
          <div className="flex items-center gap-2">
            <FaHistory className="w-5 h-5 text-orange-500" />
            <h3 className="text-base font-semibold text-gray-900">
              {t('customer.helpCenter.troubleshooting.title')}
            </h3>
          </div>
          <p className="text-sm text-gray-600">
            {t('customer.helpCenter.troubleshooting.desc')}
          </p>
          <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
            <li>{t('customer.helpCenter.troubleshooting.item1')}</li>
            <li>{t('customer.helpCenter.troubleshooting.item2')}</li>
            <li>{t('customer.helpCenter.troubleshooting.item3')}</li>
          </ul>
        </section>

        <section id="faq" className="space-y-4">
          <h3 className="text-base font-semibold text-gray-900">
            {t('customer.helpCenter.faq.title')}
          </h3>
          <div className="space-y-3">
            {faqItems.map((item, index) => (
              <div key={`${item.question}-${index}`} className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
                <p className="text-sm font-semibold text-gray-900">{item.question}</p>
                <p className="text-sm text-gray-600 mt-2">{item.answer}</p>
              </div>
            ))}
          </div>
        </section>

        <section id="support" className="rounded-xl border border-gray-200 bg-gray-50 p-4 text-sm text-gray-700 space-y-3">
          <h4 className="font-semibold text-gray-900">
            {t('customer.helpCenter.support.title')}
          </h4>
          <p className="text-gray-600">
            {t('customer.helpCenter.support.desc')}
          </p>
          <div className="flex flex-wrap gap-2 text-sm font-medium">
            <a
              href="mailto:support@genfity.com"
              className="rounded-lg border border-orange-200 bg-white px-3 py-2 text-orange-600 hover:bg-orange-50"
            >
              support@genfity.com
            </a>
            <a
              href="mailto:genfity@gmail.com"
              className="rounded-lg border border-orange-200 bg-white px-3 py-2 text-orange-600 hover:bg-orange-50"
            >
              genfity@gmail.com
            </a>
          </div>
          <p className="text-gray-600">
            {t('customer.helpCenter.support.responseTime')}
          </p>
        </section>
      </div>

      <div className="py-4 border-t border-gray-200">
        <PoweredByFooter />
      </div>
    </div>
  );
}

export default function HelpCenterPage() {
  return (
    <Suspense fallback={<LoadingState type="page" message={LOADING_MESSAGES.LOADING} />}>
      <HelpCenterContent />
    </Suspense>
  );
}
