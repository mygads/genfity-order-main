import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clearAdminAuth } from "@/lib/utils/adminAuth";

interface User {
  id: string;
  role: string;
  merchantId?: string;
  permissions?: string[];
  merchantRole?: string;
}

/**
 * Custom hook for authentication management
 * Provides methods to check auth status, get user info, and logout
 */
export function useAuth() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("accessToken");
    const userId = localStorage.getItem("userId");
    const userRole = localStorage.getItem("userRole");
    const merchantId = localStorage.getItem("merchantId");
    
    // Get permissions from localStorage
    const permissionsStr = localStorage.getItem("staffPermissions");
    let permissions: string[] | undefined;
    try {
      permissions = permissionsStr ? JSON.parse(permissionsStr) : undefined;
    } catch {
      permissions = undefined;
    }
    
    const merchantRole = localStorage.getItem("merchantRole") || undefined;

    if (token && userId && userRole) {
      setUser({ 
        id: userId, 
        role: userRole, 
        merchantId: merchantId || undefined,
        permissions,
        merchantRole,
      });
    }

    setLoading(false);
  }, []);

  const logout = () => {
    clearAdminAuth();
    setUser(null);
    router.push("/admin/login");
  };

  const requireAuth = (redirectTo = "/admin/login") => {
    if (!loading && !user) {
      router.push(redirectTo);
    }
  };

  const requireRole = (allowedRoles: string[]) => {
    if (!loading && user && !allowedRoles.includes(user.role)) {
      router.push("/admin");
    }
  };

  /**
   * Check if user has a specific permission
   * Owners always have all permissions
   */
  const hasPermission = (permission: string): boolean => {
    if (!user) return false;
    if (user.role === 'MERCHANT_OWNER' || user.merchantRole === 'OWNER') return true;
    return user.permissions?.includes(permission) ?? false;
  };

  /**
   * Check if user has any of the specified permissions
   */
  const hasAnyPermission = (permissions: string[]): boolean => {
    if (!user) return false;
    if (user.role === 'MERCHANT_OWNER' || user.merchantRole === 'OWNER') return true;
    return permissions.some(p => user.permissions?.includes(p) ?? false);
  };

  return {
    user,
    loading,
    logout,
    requireAuth,
    requireRole,
    hasPermission,
    hasAnyPermission,
    isAuthenticated: !!user,
    isOwner: user?.role === 'MERCHANT_OWNER' || user?.merchantRole === 'OWNER',
  };
}
