import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { clearAdminAuth } from "@/lib/utils/adminAuth";

interface User {
  id: string;
  role: string;
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

    if (token && userId && userRole) {
      setUser({ id: userId, role: userRole });
    }

    setLoading(false);
  }, []);

  const logout = () => {
    clearAdminAuth();
    setUser(null);
    router.push("/admin/login");
  };

  const requireAuth = (redirectTo = "/login") => {
    if (!loading && !user) {
      router.push(redirectTo);
    }
  };

  const requireRole = (allowedRoles: string[]) => {
    if (!loading && user && !allowedRoles.includes(user.role)) {
      router.push("/admin");
    }
  };

  return {
    user,
    loading,
    logout,
    requireAuth,
    requireRole,
    isAuthenticated: !!user,
  };
}
