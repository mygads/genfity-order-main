"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import ComponentCard from "@/components/common/ComponentCard";
import PageBreadCrumb from "@/components/common/PageBreadCrumb";

interface MenuItem {
  id: string;
  name: string;
  description: string | null;
  price: string;
  categoryId: string;
  categoryName: string;
  isAvailable: boolean;
  createdAt: string;
}

interface Category {
  id: string;
  name: string;
}

interface MenuFormData {
  name: string;
  description: string;
  price: number;
  categoryId: string;
}

export default function MerchantMenuPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState<MenuFormData>({
    name: "",
    description: "",
    price: 0,
    categoryId: "",
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.push("/signin");
        return;
      }

      const [menuResponse, categoriesResponse] = await Promise.all([
        fetch("/api/merchant/menu", {
          headers: { Authorization: `Bearer ${token}` },
        }),
        fetch("/api/merchant/categories", {
          headers: { Authorization: `Bearer ${token}` },
        }),
      ]);

      if (!menuResponse.ok || !categoriesResponse.ok) {
        throw new Error("Failed to fetch data");
      }

      const menuData = await menuResponse.json();
      const categoriesData = await categoriesResponse.json();

      setMenuItems(menuData.data || []);
      setCategories(categoriesData.data || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === "number") {
      setFormData(prev => ({
        ...prev,
        [name]: parseFloat(value) || 0
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.push("/signin");
        return;
      }

      const url = editingId 
        ? `/api/merchant/menu/${editingId}`
        : "/api/merchant/menu";
      
      const method = editingId ? "PUT" : "POST";

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || `Failed to ${editingId ? 'update' : 'create'} menu item`);
      }

      setSuccess(`Menu item ${editingId ? 'updated' : 'created'} successfully!`);
      setShowForm(false);
      setEditingId(null);
      setFormData({ name: "", description: "", price: 0, categoryId: "" });
      
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEdit = (item: MenuItem) => {
    setEditingId(item.id);
    setFormData({
      name: item.name,
      description: item.description || "",
      price: parseFloat(item.price),
      categoryId: item.categoryId,
    });
    setShowForm(true);
    setError(null);
    setSuccess(null);
  };

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this menu item?")) {
      return;
    }

    try {
      const token = localStorage.getItem("accessToken");
      if (!token) {
        router.push("/signin");
        return;
      }

      const response = await fetch(`/api/merchant/menu/${id}`, {
        method: "DELETE",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.message || "Failed to delete menu item");
      }

      setSuccess("Menu item deleted successfully!");
      fetchData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred");
    }
  };

  const handleCancel = () => {
    setShowForm(false);
    setEditingId(null);
    setFormData({ name: "", description: "", price: 0, categoryId: "" });
    setError(null);
    setSuccess(null);
  };

  if (loading) {
    return (
      <>
        <PageBreadCrumb pageTitle="Menu Items" />
        <div className="mt-6 py-10 text-center">
          <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-primary border-r-transparent"></div>
          <p className="mt-2 text-sm text-body-color">Loading menu...</p>
        </div>
      </>
    );
  }

  return (
    <>
      <PageBreadCrumb pageTitle="Menu Items" />

      <div className="mt-6 space-y-6">
        {error && (
          <div className="rounded-lg bg-red-50 p-4 dark:bg-red-900/20">
            <p className="text-sm text-red-600 dark:text-red-400">{error}</p>
          </div>
        )}

        {success && (
          <div className="rounded-lg bg-green-50 p-4 dark:bg-green-900/20">
            <p className="text-sm text-green-600 dark:text-green-400">{success}</p>
          </div>
        )}

        {showForm && (
          <ComponentCard title={editingId ? "Edit Menu Item" : "Create New Menu Item"}>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label className="mb-2.5 block font-medium text-black dark:text-white">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  name="categoryId"
                  value={formData.categoryId}
                  onChange={handleChange}
                  required
                  className="w-full rounded border border-stroke bg-gray px-4.5 py-3 text-black focus:border-primary focus-visible:outline-none dark:border-strokedark dark:bg-meta-4 dark:text-white"
                >
                  <option value="">Select a category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="mb-2.5 block font-medium text-black dark:text-white">
                  Item Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  required
                  className="w-full rounded border border-stroke bg-gray px-4.5 py-3 text-black focus:border-primary focus-visible:outline-none dark:border-strokedark dark:bg-meta-4 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-2.5 block font-medium text-black dark:text-white">
                  Description
                </label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleChange}
                  rows={3}
                  className="w-full rounded border border-stroke bg-gray px-4.5 py-3 text-black focus:border-primary focus-visible:outline-none dark:border-strokedark dark:bg-meta-4 dark:text-white"
                />
              </div>

              <div>
                <label className="mb-2.5 block font-medium text-black dark:text-white">
                  Price <span className="text-red-500">*</span>
                </label>
                <input
                  type="number"
                  name="price"
                  value={formData.price}
                  onChange={handleChange}
                  required
                  min="0"
                  step="0.01"
                  className="w-full rounded border border-stroke bg-gray px-4.5 py-3 text-black focus:border-primary focus-visible:outline-none dark:border-strokedark dark:bg-meta-4 dark:text-white"
                />
              </div>

              <div className="flex items-center justify-end gap-4 border-t border-stroke pt-6 dark:border-strokedark">
                <button
                  type="button"
                  onClick={handleCancel}
                  className="rounded border border-stroke px-6 py-2.5 font-medium hover:bg-gray-2 dark:border-strokedark dark:hover:bg-meta-4"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="rounded bg-primary px-6 py-2.5 font-medium text-white hover:bg-opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  {submitting ? "Saving..." : editingId ? "Update Item" : "Create Item"}
                </button>
              </div>
            </form>
          </ComponentCard>
        )}

        <ComponentCard title="Menu Items List">
          <div className="mb-4 flex justify-end">
            {!showForm && (
              <button
                onClick={() => setShowForm(true)}
                className="rounded bg-primary px-4 py-2 text-sm font-medium text-white hover:bg-opacity-90"
              >
                + Add Menu Item
              </button>
            )}
          </div>
          
          {menuItems.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm text-body-color">No menu items found</p>
              {!showForm && (
                <button
                  onClick={() => setShowForm(true)}
                  className="mt-4 rounded bg-primary px-6 py-2.5 font-medium text-white hover:bg-opacity-90"
                >
                  Create First Menu Item
                </button>
              )}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead>
                  <tr className="bg-gray-2 text-left dark:bg-meta-4">
                    <th className="px-4 py-4 font-medium text-black dark:text-white">Name</th>
                    <th className="px-4 py-4 font-medium text-black dark:text-white">Category</th>
                    <th className="px-4 py-4 font-medium text-black dark:text-white">Price</th>
                    <th className="px-4 py-4 font-medium text-black dark:text-white">Status</th>
                    <th className="px-4 py-4 font-medium text-black dark:text-white">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {menuItems.map((item) => (
                    <tr key={item.id} className="border-b border-stroke dark:border-strokedark">
                      <td className="px-4 py-4">
                        <div>
                          <p className="font-medium">{item.name}</p>
                          {item.description && (
                            <p className="text-sm text-body-color">{item.description}</p>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4">{item.categoryName}</td>
                      <td className="px-4 py-4">Rp {parseFloat(item.price).toLocaleString('id-ID')}</td>
                      <td className="px-4 py-4">
                        <span className={`inline-flex rounded-full px-3 py-1 text-sm font-medium ${
                          item.isAvailable 
                            ? 'bg-success/10 text-success' 
                            : 'bg-meta-1/10 text-meta-1'
                        }`}>
                          {item.isAvailable ? 'Available' : 'Unavailable'}
                        </span>
                      </td>
                      <td className="px-4 py-4">
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleEdit(item)}
                            className="text-primary hover:text-primary/80"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(item.id)}
                            className="text-meta-1 hover:text-meta-1/80"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </ComponentCard>
      </div>
    </>
  );
}
