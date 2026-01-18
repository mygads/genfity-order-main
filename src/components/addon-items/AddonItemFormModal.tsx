"use client";

import React from "react";
import AddonInputTypeSelector from "@/components/ui/AddonInputTypeSelector";
import { HelpTooltip } from "@/components/ui/Tooltip";
import { StatusToggle } from "@/components/common/StatusToggle";
import { useTranslation } from "@/lib/i18n/useTranslation";

interface AddonCategory {
  id: string;
  name: string;
  minSelection: number;
  maxSelection: number | null;
}

interface AddonItemFormData {
  addonCategoryId: string;
  name: string;
  description: string;
  price: string;
  inputType: "SELECT" | "QTY";
  trackStock: boolean;
  stockQty: string;
  lowStockThreshold: string;
  dailyStockTemplate: string;
  autoResetStock: boolean;
}

interface AddonItemFormModalProps {
  show: boolean;
  editingId: string | null;
  formData: AddonItemFormData;
  originalFormData?: AddonItemFormData | null;
  categories: AddonCategory[];
  submitting: boolean;
  currencySymbol?: string;
  onSubmit: (e: React.FormEvent) => void;
  onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
  onCancel: () => void;
}

export default function AddonItemFormModal({
  show,
  editingId,
  formData,
  originalFormData,
  categories,
  submitting,
  currencySymbol = "$",
  onSubmit,
  onChange,
  onCancel,
}: AddonItemFormModalProps) {
  const { t } = useTranslation();

  if (!show) return null;

  const triggerCheckboxChange = (name: keyof AddonItemFormData, checked: boolean) => {
    const event = {
      target: { name, type: "checkbox", checked },
    } as unknown as React.ChangeEvent<HTMLInputElement>;
    onChange(event);
  };

  // Check if form has changes (only for edit mode)
  const hasChanges = (): boolean => {
    if (!originalFormData) return true;
    return (
      formData.addonCategoryId !== originalFormData.addonCategoryId ||
      formData.name !== originalFormData.name ||
      formData.description !== originalFormData.description ||
      formData.price !== originalFormData.price ||
      formData.inputType !== originalFormData.inputType ||
      formData.trackStock !== originalFormData.trackStock ||
      formData.stockQty !== originalFormData.stockQty ||
      formData.lowStockThreshold !== originalFormData.lowStockThreshold ||
      formData.dailyStockTemplate !== originalFormData.dailyStockTemplate ||
      formData.autoResetStock !== originalFormData.autoResetStock
    );
  };

  const formChanged = hasChanges();

  return (
    <div
      data-tutorial="addon-item-modal"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      onMouseDown={(e) => {
        if (e.target !== e.currentTarget) return;
        if (submitting) return;
        if (formChanged) return;
        onCancel();
      }}
    >
      <div className="w-full max-w-2xl max-h-[90vh] flex flex-col rounded-2xl border border-gray-200 bg-white shadow-xl dark:border-gray-800 dark:bg-gray-900">
        {/* Fixed Header */}
        <div className="shrink-0 border-b border-gray-200 px-6 py-4 dark:border-gray-800">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-800 dark:text-white/90">
              {editingId ? t("admin.addonItems.editItem") : t("admin.addonItems.createNew")}
            </h3>
            <button
              onClick={onCancel}
              aria-label={t("common.close")}
              title={t("common.close")}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800 dark:hover:text-gray-300"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* Scrollable Content */}
        <form onSubmit={onSubmit} className="flex flex-col flex-1 min-h-0">
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div data-tutorial="addon-item-category" className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t("admin.addonItems.modal.categoryLabel")} <span className="text-error-500">*</span>
                </label>
                <select
                  name="addonCategoryId"
                  value={formData.addonCategoryId}
                  onChange={onChange}
                  required
                  className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
                >
                  <option value="">{t("admin.addonItems.modal.selectCategoryPlaceholder")}</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name} ({t("admin.addonItems.modal.categoryOptionMeta", { min: cat.minSelection, max: cat.maxSelection || "∞" })})
                    </option>
                  ))}
                </select>
              </div>

              <div data-tutorial="addon-item-name" className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t("admin.addonItems.modal.itemNameLabel")} <span className="text-error-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={onChange}
                  required
                  placeholder={t("admin.addonItems.modal.itemNamePlaceholder")}
                  className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
                />
              </div>

              <div className="md:col-span-2">
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t("admin.addonItems.modal.descriptionLabel")}
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={onChange}
                  rows={2}
                  placeholder={t("admin.addonItems.modal.descriptionPlaceholder")}
                  className="w-full rounded-lg border border-gray-200 bg-white px-4 py-3 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
                />
              </div>

              <div data-tutorial="addon-item-price">
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {t("admin.addonItems.modal.priceLabel")} <span className="text-error-500">*</span>
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium text-gray-500">
                    {currencySymbol}
                  </span>
                  <input
                    type="number"
                    name="price"
                    value={formData.price}
                    onChange={onChange}
                    required
                    min="0"
                    step="0.01"
                    placeholder="0"
                    className="h-11 w-full rounded-lg border border-gray-200 bg-white pl-12 pr-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
                  />
                </div>
                <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                  {t("admin.addonItems.modal.freeHint")}
                </p>
              </div>
            </div>

            {/* Input Type Selector */}
            <div>
              <AddonInputTypeSelector
                value={formData.inputType === "SELECT" ? "checkbox" : "quantity"}
                minSelection={(categories.find(c => c.id === formData.addonCategoryId)?.minSelection) || 0}
                maxSelection={(categories.find(c => c.id === formData.addonCategoryId)?.maxSelection) || null}
                onChange={(newType) => {
                  const apiType = newType === 'checkbox' ? 'SELECT' : 'QTY';
                  const event = {
                    target: { name: 'inputType', value: apiType }
                  } as React.ChangeEvent<HTMLSelectElement>;
                  onChange(event);
                }}
              />
            </div>

            {/* Stock Tracking Section */}
            <div data-tutorial="addon-item-stock" className="rounded-xl border border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900/50">
              <div className="flex items-start justify-between gap-4">
                <div className="flex-1">
                  <span className="text-sm font-medium text-gray-800 dark:text-white/90">
                    {t("admin.addonItems.modal.trackStockLabel")}
                  </span>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    {t("admin.addonItems.modal.trackStockHint")}
                  </p>
                </div>
                <StatusToggle
                  isActive={formData.trackStock}
                  onToggle={() => triggerCheckboxChange("trackStock", !formData.trackStock)}
                  activeLabel={t("common.on")}
                  inactiveLabel={t("common.off")}
                />
              </div>

              {formData.trackStock && (
                <div className="mt-4 space-y-4 border-t border-gray-200 pt-4 dark:border-gray-800">
                  <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                    <div>
                      <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                        {t("admin.addonItems.modal.currentStockLabel")}
                        <HelpTooltip content={t("admin.addonItems.modal.currentStockTooltip")} />
                      </label>
                      <input
                        type="number"
                        name="stockQty"
                        value={formData.stockQty}
                        onChange={onChange}
                        min="0"
                        placeholder="0"
                        className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
                      />
                    </div>
                    <div>
                      <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                        {t("admin.addonItems.modal.lowStockThresholdLabel")}
                        <HelpTooltip content={t("admin.addonItems.modal.lowStockThresholdTooltip")} />
                      </label>
                      <input
                        type="number"
                        name="lowStockThreshold"
                        value={formData.lowStockThreshold}
                        onChange={onChange}
                        min="0"
                        placeholder={t("admin.addonItems.modal.lowStockThresholdPlaceholder")}
                        className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
                      />
                    </div>
                    <div>
                      <label className="mb-2 flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                        {t("admin.addonItems.modal.dailyStockTemplateLabel")}
                        <HelpTooltip content={t("admin.addonItems.modal.dailyStockTemplateTooltip")} />
                      </label>
                      <input
                        type="number"
                        name="dailyStockTemplate"
                        value={formData.dailyStockTemplate}
                        onChange={onChange}
                        min="0"
                        placeholder={t("admin.addonItems.modal.dailyStockTemplatePlaceholder")}
                        className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
                      />
                    </div>
                  </div>

                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <span className="text-sm font-medium text-gray-800 dark:text-white/90">
                        {t("admin.addonItems.modal.autoResetStockLabel")}
                      </span>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {t("admin.addonItems.modal.autoResetStockHint")}
                      </p>
                    </div>
                    <StatusToggle
                      isActive={formData.autoResetStock}
                      onToggle={() => triggerCheckboxChange("autoResetStock", !formData.autoResetStock)}
                      disabled={!formData.dailyStockTemplate}
                      activeLabel={t("common.on")}
                      inactiveLabel={t("common.off")}
                    />
                  </div>
                  {formData.autoResetStock && formData.dailyStockTemplate && (
                    <div className="rounded-lg bg-brand-50 p-3 dark:bg-brand-900/20">
                      <p className="text-xs text-brand-700 dark:text-brand-400">
                        {t("admin.addonItems.modal.autoResetStockInfo", { qty: formData.dailyStockTemplate })}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Fixed Footer */}
          <div className="shrink-0 border-t border-gray-200 px-6 py-4 dark:border-gray-800">
            <div className="flex gap-3">
              <button
                type="button"
                onClick={onCancel}
                className="flex-1 h-11 rounded-xl border border-gray-300 bg-white text-sm font-medium text-gray-700 shadow-sm transition-all hover:bg-gray-50 hover:shadow-md dark:border-gray-600 dark:bg-gray-800 dark:text-gray-300 dark:hover:bg-gray-700"
              >
                {t("common.cancel")}
              </button>
              {editingId ? (
                formChanged ? (
                  <button
                    type="submit"
                    disabled={submitting}
                    data-tutorial="addon-item-save-btn"
                    className="flex-1 h-11 rounded-xl bg-brand-500 text-sm font-medium text-white shadow-lg shadow-brand-500/25 transition-all hover:bg-brand-600 hover:shadow-brand-500/30 focus:outline-none focus:ring-4 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                      {submitting ? t("common.saving") : t("admin.addonItems.updateItem")}
                  </button>
                ) : (
                  <span className="flex-1 h-11 flex items-center justify-center rounded-xl bg-gray-100 text-sm font-medium text-gray-500 dark:bg-gray-800 dark:text-gray-400">
                      {t("common.noChanges")}
                  </span>
                )
              ) : (
                <button
                  type="submit"
                  disabled={submitting}
                  data-tutorial="addon-item-save-btn"
                  className="flex-1 h-11 rounded-xl bg-brand-500 text-sm font-medium text-white shadow-lg shadow-brand-500/25 transition-all hover:bg-brand-600 hover:shadow-brand-500/30 focus:outline-none focus:ring-4 focus:ring-brand-500/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                    {submitting ? t("common.saving") : t("admin.addonItems.createItem")}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
