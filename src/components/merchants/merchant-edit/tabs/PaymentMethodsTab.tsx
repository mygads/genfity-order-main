import React, { useEffect, useMemo, useRef, useState } from 'react';
import Cropper from 'react-easy-crop';

import SettingsCard from '@/components/merchants/merchant-edit/ui/SettingsCard';
import Switch from '@/components/ui/Switch';
import Button from '@/components/ui/Button';
import { tOr } from '@/lib/i18n/useTranslation';
import type { TranslationKeys } from '@/lib/i18n';
import type { MerchantPaymentAccount, MerchantPaymentSettings } from '@/lib/types/paymentSettings';
import { getCroppedImageBlob, type PixelCropArea } from '@/lib/utils/imageCrop';
import { fetchMerchantApi } from '@/lib/utils/orderApiClient';

export interface PaymentMethodsTabProps {
  t: (key: TranslationKeys | string, params?: Record<string, string | number>) => string;
  country: string;
  currency: string;
  authToken: string;
  settings: MerchantPaymentSettings;
  accounts: MerchantPaymentAccount[];
  onSettingsChange: (next: MerchantPaymentSettings) => void;
  onAccountsChange: (next: MerchantPaymentAccount[]) => void;
  showSuccess: (title: string, message: string) => void;
  showError: (title: string, message: string) => void;
}

const MAX_QRIS_SIZE_MB = 5;
const QRIS_OUTPUT_SIZE = 900;

export default function PaymentMethodsTab({
  t,
  country,
  currency,
  authToken,
  settings,
  accounts,
  onSettingsChange,
  onAccountsChange,
  showSuccess,
  showError,
}: PaymentMethodsTabProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [qrisPreviewUrl, setQrisPreviewUrl] = useState<string | null>(null);
  const [qrisCropOpen, setQrisCropOpen] = useState(false);
  const [qrisCrop, setQrisCrop] = useState({ x: 0, y: 0 });
  const [qrisZoom, setQrisZoom] = useState(1);
  const [qrisCropArea, setQrisCropArea] = useState<PixelCropArea | null>(null);
  const [qrisUploading, setQrisUploading] = useState(false);

  const isQrisEligible = useMemo(() => {
    return String(country || '').toLowerCase() === 'indonesia' && String(currency || '').toUpperCase() === 'IDR';
  }, [country, currency]);

  const hasOnlinePayment = Boolean(settings.manualTransferEnabled || (settings.qrisEnabled && isQrisEligible));

  const normalizedPayAtCashierEnabled = hasOnlinePayment ? Boolean(settings.payAtCashierEnabled) : true;

  const handleSettingsChange = (partial: Partial<MerchantPaymentSettings>) => {
    const next = { ...settings, ...partial };
    onSettingsChange(next);
  };

  useEffect(() => {
    if (hasOnlinePayment) return;
    if (settings.payAtCashierEnabled === false) {
      onSettingsChange({ ...settings, payAtCashierEnabled: true });
    }
  }, [hasOnlinePayment, onSettingsChange, settings]);

  useEffect(() => {
    if (isQrisEligible) return;
    if (settings.qrisEnabled) {
      onSettingsChange({ ...settings, qrisEnabled: false });
    }
  }, [isQrisEligible, onSettingsChange, settings]);

  const handleAccountChange = <K extends keyof MerchantPaymentAccount>(
    index: number,
    key: K,
    value: MerchantPaymentAccount[K]
  ) => {
    const next = accounts.map((account, idx) => (idx === index ? { ...account, [key]: value } : account));
    onAccountsChange(next);
  };

  const handleAddAccount = () => {
    const next: MerchantPaymentAccount = {
      type: 'BANK',
      providerName: '',
      accountName: '',
      accountNumber: '',
      bsb: '',
      country: country || null,
      currency: currency || null,
      isActive: true,
      sortOrder: accounts.length,
    };
    onAccountsChange([...accounts, next]);
  };

  const handleRemoveAccount = (index: number) => {
    const next = accounts.filter((_, idx) => idx !== index).map((account, idx) => ({
      ...account,
      sortOrder: idx,
    }));
    onAccountsChange(next);
  };

  const resetQrisCropState = () => {
    if (qrisPreviewUrl) {
      URL.revokeObjectURL(qrisPreviewUrl);
    }
    setQrisPreviewUrl(null);
    setQrisCropOpen(false);
    setQrisCrop({ x: 0, y: 0 });
    setQrisZoom(1);
    setQrisCropArea(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleQrisFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showError(tOr(t, 'common.error', 'Error'), tOr(t, 'admin.merchantEdit.paymentMethods.qrisInvalidFile', 'Please upload an image file.'));
      resetQrisCropState();
      return;
    }

    if (file.size > MAX_QRIS_SIZE_MB * 1024 * 1024) {
      showError(
        tOr(t, 'common.error', 'Error'),
        tOr(t, 'admin.merchantEdit.paymentMethods.qrisFileTooLarge', `File size must be under ${MAX_QRIS_SIZE_MB}MB.`)
      );
      resetQrisCropState();
      return;
    }

    const previewUrl = URL.createObjectURL(file);
    setQrisPreviewUrl(previewUrl);
    setQrisCropOpen(true);
  };

  const handleConfirmQrisUpload = async () => {
    if (!qrisPreviewUrl || !qrisCropArea) return;
    if (!authToken) {
      showError(tOr(t, 'common.error', 'Error'), tOr(t, 'auth.error.loginFailed', 'Login required.'));
      return;
    }

    setQrisUploading(true);
    try {
      const croppedBlob = await getCroppedImageBlob({
        imageSrc: qrisPreviewUrl,
        crop: qrisCropArea,
        outputSize: QRIS_OUTPUT_SIZE,
        mimeType: 'image/jpeg',
        quality: 0.9,
      });

      const formData = new FormData();
      formData.append('file', croppedBlob, 'qris.jpg');

      const response = await fetchMerchantApi('/api/merchant/upload/qris', {
        method: 'POST',
        token: authToken,
        body: formData,
      });

      const payload = await response.json();
      if (!response.ok || !payload?.success) {
        throw new Error(payload?.message || 'Failed to upload QRIS image');
      }

      const imageUrl = payload?.data?.url as string | undefined;
      const imageMeta = payload?.data?.meta ?? null;

      if (!imageUrl) {
        throw new Error('Upload response missing URL');
      }

      handleSettingsChange({
        qrisImageUrl: imageUrl,
        qrisImageMeta: imageMeta,
        qrisImageUploadedAt: new Date().toISOString(),
      });

      showSuccess(
        tOr(t, 'common.success', 'Success'),
        tOr(t, 'admin.merchantEdit.paymentMethods.qrisUploadSuccess', 'QRIS image uploaded successfully.')
      );
      resetQrisCropState();
    } catch (error) {
      showError(
        tOr(t, 'common.error', 'Error'),
        error instanceof Error ? error.message : 'Failed to upload QRIS image'
      );
    } finally {
      setQrisUploading(false);
    }
  };

  const handleRemoveQris = () => {
    handleSettingsChange({
      qrisImageUrl: null,
      qrisImageMeta: null,
      qrisImageUploadedAt: null,
    });
  };

  return (
    <div className="space-y-6">
      <SettingsCard
        title={tOr(t, 'admin.merchantEdit.paymentMethods.sectionTitle', 'Payment methods')}
        description={tOr(
          t,
          'admin.merchantEdit.paymentMethods.sectionDesc',
          'Choose how customers can pay in-store or online.'
        )}
      >
        <div className="space-y-4">
          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/40">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {tOr(t, 'admin.merchantEdit.paymentMethods.payAtCashierTitle', 'Pay at cashier')}
                </p>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  {hasOnlinePayment
                    ? tOr(
                        t,
                        'admin.merchantEdit.paymentMethods.payAtCashierDescOptional',
                        'Enable if customers can still pay when they arrive.'
                      )
                    : tOr(
                        t,
                        'admin.merchantEdit.paymentMethods.payAtCashierDescRequired',
                        'This stays on when no online method is enabled.'
                      )}
                </p>
              </div>
              <Switch
                checked={normalizedPayAtCashierEnabled}
                disabled={!hasOnlinePayment}
                onCheckedChange={(checked) => handleSettingsChange({ payAtCashierEnabled: checked })}
                aria-label={tOr(t, 'admin.merchantEdit.paymentMethods.payAtCashierTitle', 'Pay at cashier')}
              />
            </div>
          </div>

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/40">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {tOr(t, 'admin.merchantEdit.paymentMethods.manualTransferTitle', 'Manual transfer')}
                </p>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  {tOr(
                    t,
                    'admin.merchantEdit.paymentMethods.manualTransferDesc',
                    'Let customers transfer to your bank or e-wallet, then confirm payment manually.'
                  )}
                </p>
              </div>
              <Switch
                checked={Boolean(settings.manualTransferEnabled)}
                onCheckedChange={(checked) => handleSettingsChange({ manualTransferEnabled: checked })}
                aria-label={tOr(t, 'admin.merchantEdit.paymentMethods.manualTransferTitle', 'Manual transfer')}
              />
            </div>
          </div>

          {isQrisEligible ? (
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/40">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-900 dark:text-white">
                    {tOr(t, 'admin.merchantEdit.paymentMethods.qrisTitle', 'QRIS')}
                  </p>
                  <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                    {tOr(
                      t,
                      'admin.merchantEdit.paymentMethods.qrisDesc',
                      'Show your QRIS code so customers can pay with any QRIS-enabled app.'
                    )}
                  </p>
                </div>
                <Switch
                  checked={Boolean(settings.qrisEnabled)}
                  onCheckedChange={(checked) => handleSettingsChange({ qrisEnabled: checked })}
                  aria-label={tOr(t, 'admin.merchantEdit.paymentMethods.qrisTitle', 'QRIS')}
                />
              </div>
            </div>
          ) : null}

          <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/40">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  {tOr(t, 'admin.merchantEdit.paymentMethods.proofTitle', 'Require payment proof')}
                </p>
                <p className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">
                  {tOr(
                    t,
                    'admin.merchantEdit.paymentMethods.proofDesc',
                    'Ask customers to upload a transfer receipt when paying online.'
                  )}
                </p>
              </div>
              <Switch
                checked={Boolean(settings.requirePaymentProof)}
                onCheckedChange={(checked) => handleSettingsChange({ requirePaymentProof: checked })}
                disabled={!hasOnlinePayment}
                aria-label={tOr(t, 'admin.merchantEdit.paymentMethods.proofTitle', 'Require payment proof')}
              />
            </div>
          </div>
        </div>
      </SettingsCard>

      <SettingsCard
        title={tOr(t, 'admin.merchantEdit.paymentMethods.accountsTitle', 'Bank & e-wallet accounts')}
        description={tOr(
          t,
          'admin.merchantEdit.paymentMethods.accountsDesc',
          'Add the accounts customers should transfer to for manual payments.'
        )}
        rightSlot={
          <Button
            type="button"
            variant="secondary"
            onClick={handleAddAccount}
            disabled={!settings.manualTransferEnabled}
          >
            {tOr(t, 'admin.merchantEdit.paymentMethods.addAccount', 'Add account')}
          </Button>
        }
      >
        <div className="space-y-4">
          {accounts.length === 0 ? (
            <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-6 text-center text-sm text-gray-500 dark:border-gray-800 dark:bg-gray-900/40 dark:text-gray-400">
              {tOr(t, 'admin.merchantEdit.paymentMethods.accountsEmpty', 'No accounts added yet.')}
            </div>
          ) : null}

          {accounts.map((account, index) => (
            <div
              key={account.id ? String(account.id) : `account-${index}`}
              className="rounded-lg border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-950"
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-gray-900 dark:text-white">
                    {tOr(t, 'admin.merchantEdit.paymentMethods.accountLabel', 'Account')} #{index + 1}
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {tOr(t, 'admin.merchantEdit.paymentMethods.accountHint', 'Shown to customers during checkout.')}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Switch
                    checked={account.isActive}
                    onCheckedChange={(checked) => handleAccountChange(index, 'isActive', checked)}
                    aria-label={tOr(t, 'common.active', 'Active')}
                    disabled={!settings.manualTransferEnabled}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleRemoveAccount(index)}
                    className="text-xs"
                  >
                    {tOr(t, 'common.remove', 'Remove')}
                  </Button>
                </div>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                    {tOr(t, 'admin.merchantEdit.paymentMethods.accountType', 'Type')}
                  </label>
                  <select
                    value={account.type}
                    onChange={(event) => handleAccountChange(index, 'type', event.target.value as MerchantPaymentAccount['type'])}
                    disabled={!settings.manualTransferEnabled}
                    className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                  >
                    <option value="BANK">{tOr(t, 'admin.merchantEdit.paymentMethods.accountTypeBank', 'Bank')}</option>
                    <option value="EWALLET">{tOr(t, 'admin.merchantEdit.paymentMethods.accountTypeWallet', 'E-Wallet')}</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                    {tOr(t, 'admin.merchantEdit.paymentMethods.providerName', 'Provider name')}
                  </label>
                  <input
                    type="text"
                    value={account.providerName}
                    onChange={(event) => handleAccountChange(index, 'providerName', event.target.value)}
                    disabled={!settings.manualTransferEnabled}
                    placeholder={tOr(t, 'admin.merchantEdit.paymentMethods.providerPlaceholder', 'e.g. BCA, Mandiri, GoPay')}
                    className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                    {tOr(t, 'admin.merchantEdit.paymentMethods.accountName', 'Account name')}
                  </label>
                  <input
                    type="text"
                    value={account.accountName}
                    onChange={(event) => handleAccountChange(index, 'accountName', event.target.value)}
                    disabled={!settings.manualTransferEnabled}
                    className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                    {tOr(t, 'admin.merchantEdit.paymentMethods.accountNumber', 'Account number')}
                  </label>
                  <input
                    type="text"
                    value={account.accountNumber}
                    onChange={(event) => handleAccountChange(index, 'accountNumber', event.target.value)}
                    disabled={!settings.manualTransferEnabled}
                    className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="mb-1 block text-xs font-medium text-gray-700 dark:text-gray-300">
                    {tOr(t, 'admin.merchantEdit.paymentMethods.bsb', 'BSB (optional)')}
                  </label>
                  <input
                    type="text"
                    value={account.bsb || ''}
                    onChange={(event) => handleAccountChange(index, 'bsb', event.target.value)}
                    disabled={!settings.manualTransferEnabled}
                    placeholder={tOr(t, 'admin.merchantEdit.paymentMethods.bsbPlaceholder', 'e.g. 123-456')}
                    className="h-10 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm focus:border-brand-500 focus:outline-none focus:ring-2 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:bg-gray-100 dark:border-gray-800 dark:bg-gray-900 dark:text-white"
                  />
                </div>
              </div>
            </div>
          ))}
        </div>
      </SettingsCard>

      {isQrisEligible ? (
        <SettingsCard
          title={tOr(t, 'admin.merchantEdit.paymentMethods.qrisCardTitle', 'QRIS image')}
          description={tOr(t, 'admin.merchantEdit.paymentMethods.qrisCardDesc', 'Upload your QRIS QR code (1:1 square).')}
        >
          <div className="space-y-3">
            {settings.qrisImageUrl ? (
              <div className="flex flex-wrap items-center gap-4">
                <img
                  src={settings.qrisImageUrl}
                  alt="QRIS"
                  className="h-40 w-40 rounded-lg border border-gray-200 object-cover dark:border-gray-800"
                />
                <div className="space-y-2">
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {tOr(t, 'admin.merchantEdit.paymentMethods.qrisImageHint', 'Customers will scan this QRIS code during checkout.')}
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={!settings.qrisEnabled}
                    >
                      {tOr(t, 'admin.merchantEdit.paymentMethods.qrisChange', 'Change QRIS image')}
                    </Button>
                    <Button type="button" variant="outline" onClick={handleRemoveQris}>
                      {tOr(t, 'common.remove', 'Remove')}
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-lg border border-dashed border-gray-200 bg-gray-50 p-6 text-center dark:border-gray-800 dark:bg-gray-900/40">
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {tOr(t, 'admin.merchantEdit.paymentMethods.qrisEmpty', 'No QRIS image uploaded yet.')}
                </p>
                <Button
                  type="button"
                  variant="secondary"
                  className="mt-3"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={!settings.qrisEnabled}
                >
                  {tOr(t, 'admin.merchantEdit.paymentMethods.qrisUpload', 'Upload QRIS image')}
                </Button>
              </div>
            )}

            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleQrisFileSelect}
              className="hidden"
            />

            <p className="text-xs text-gray-500 dark:text-gray-400">
              {tOr(
                t,
                'admin.merchantEdit.paymentMethods.qrisFormats',
                `All image formats supported. Max ${MAX_QRIS_SIZE_MB}MB. Square crop will be applied.`
              )}
            </p>
          </div>
        </SettingsCard>
      ) : null}

      {qrisCropOpen && qrisPreviewUrl ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
          <div className="w-full max-w-3xl rounded-2xl bg-white p-6 shadow-xl dark:bg-gray-900">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                  {tOr(t, 'admin.merchantEdit.paymentMethods.qrisCropTitle', 'Crop QRIS image')}
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  {tOr(t, 'admin.merchantEdit.paymentMethods.qrisCropDesc', 'Adjust the square crop area before uploading.')}
                </p>
              </div>
              <Button type="button" variant="outline" onClick={resetQrisCropState}>
                {tOr(t, 'common.cancel', 'Cancel')}
              </Button>
            </div>

            <div className="relative h-72 w-full overflow-hidden rounded-xl bg-gray-900">
              <Cropper
                image={qrisPreviewUrl}
                crop={qrisCrop}
                zoom={qrisZoom}
                aspect={1}
                onCropChange={setQrisCrop}
                onZoomChange={setQrisZoom}
                onCropComplete={(_, croppedAreaPixels) => setQrisCropArea(croppedAreaPixels)}
              />
            </div>

            <div className="mt-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <label className="text-xs text-gray-500 dark:text-gray-400">{tOr(t, 'admin.merchantEdit.paymentMethods.qrisZoom', 'Zoom')}</label>
                <input
                  type="range"
                  min={1}
                  max={3}
                  step={0.05}
                  value={qrisZoom}
                  onChange={(event) => setQrisZoom(Number(event.target.value))}
                  className="w-48"
                />
              </div>
              <Button type="button" variant="primary" onClick={handleConfirmQrisUpload} isLoading={qrisUploading}>
                {qrisUploading
                  ? tOr(t, 'admin.merchantEdit.paymentMethods.qrisUploading', 'Uploading...')
                  : tOr(t, 'admin.merchantEdit.paymentMethods.qrisConfirm', 'Save QRIS')}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
