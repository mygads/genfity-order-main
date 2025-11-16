"use client";

import React from "react";

interface AddonCategory {
  id: string;
  name: string;
}

interface AddonItemsFiltersProps {
  searchQuery: string;
  filterCategory: string;
  filterInputType: string;
  filterStatus: string;
  categories: AddonCategory[];
  onSearchChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onInputTypeChange: (value: string) => void;
  onStatusChange: (value: string) => void;
}

export default function AddonItemsFilters({
  searchQuery,
  filterCategory,
  filterInputType,
  filterStatus,
  categories,
  onSearchChange,
  onCategoryChange,
  onInputTypeChange,
  onStatusChange,
}: AddonItemsFiltersProps) {
  return (
    <div className="mb-5 grid grid-cols-1 gap-4 md:grid-cols-4">
      <div>
        <input
          type="text"
          placeholder="Search addon items..."
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 placeholder:text-gray-400 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90 dark:placeholder:text-white/30"
        />
      </div>
      <div>
        <select
          value={filterCategory}
          onChange={(e) => onCategoryChange(e.target.value)}
          className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
        >
          <option value="all">All Categories</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>{cat.name}</option>
          ))}
        </select>
      </div>
      <div>
        <select
          value={filterInputType}
          onChange={(e) => onInputTypeChange(e.target.value)}
          className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
        >
          <option value="all">All Input Types</option>
          <option value="SELECT">SELECT Only</option>
          <option value="QTY">QTY Only</option>
        </select>
      </div>
      <div>
        <select
          value={filterStatus}
          onChange={(e) => onStatusChange(e.target.value)}
          className="h-11 w-full rounded-lg border border-gray-200 bg-white px-4 text-sm text-gray-800 focus:border-brand-300 focus:outline-none focus:ring-3 focus:ring-brand-500/10 dark:border-gray-800 dark:bg-gray-900 dark:text-white/90"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
      </div>
    </div>
  );
}
