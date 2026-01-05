"use client";

import React, { useState, useEffect, useCallback, createContext, useContext } from "react";
import { useRouter } from "next/navigation";
import { ThemeProvider } from "@/context/ThemeContext";
import InfluencerSidebar from "@/layout/InfluencerSidebar";

interface InfluencerData {
  id: string;
  name: string;
  email: string;
  referralCode: string;
  isApproved: boolean;
  profilePictureUrl?: string;
}

interface InfluencerContextType {
  influencer: InfluencerData | null;
  isLoading: boolean;
  isSidebarOpen: boolean;
  setIsSidebarOpen: (open: boolean) => void;
  refreshInfluencer: () => Promise<void>;
}

const InfluencerContext = createContext<InfluencerContextType | null>(null);

export function useInfluencer() {
  const context = useContext(InfluencerContext);
  if (!context) {
    throw new Error("useInfluencer must be used within InfluencerProvider");
  }
  return context;
}

function InfluencerLayoutContent({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const [influencer, setInfluencer] = useState<InfluencerData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const fetchInfluencer = useCallback(async () => {
    const token = localStorage.getItem('influencerAccessToken');
    if (!token) {
      router.push('/influencer/login');
      return;
    }

    try {
      const response = await fetch('/api/influencer/auth/me', {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (response.status === 401) {
        localStorage.removeItem('influencerAccessToken');
        localStorage.removeItem('influencerRefreshToken');
        localStorage.removeItem('influencerData');
        router.push('/influencer/login');
        return;
      }

      const result = await response.json();
      if (response.ok && result.success) {
        setInfluencer(result.data);
      }
    } catch {
      // Network error - stay on page but show cached data if available
      const cached = localStorage.getItem('influencerData');
      if (cached) {
        try {
          setInfluencer(JSON.parse(cached));
        } catch {
          // Ignore parse errors
        }
      }
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchInfluencer();
  }, [fetchInfluencer]);

  // Close sidebar on route change for mobile
  useEffect(() => {
    setIsSidebarOpen(false);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-orange-500 mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <InfluencerContext.Provider
      value={{
        influencer,
        isLoading,
        isSidebarOpen,
        setIsSidebarOpen,
        refreshInfluencer: fetchInfluencer,
      }}
    >
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <InfluencerSidebar
          isOpen={isSidebarOpen}
          onClose={() => setIsSidebarOpen(false)}
          influencer={influencer}
        />
        <div className="lg:pl-[280px] min-h-screen">
          {children}
        </div>
      </div>
    </InfluencerContext.Provider>
  );
}

export default function InfluencerLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ThemeProvider>
      <InfluencerLayoutContent>{children}</InfluencerLayoutContent>
    </ThemeProvider>
  );
}
