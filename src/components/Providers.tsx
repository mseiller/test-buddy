'use client';

import { UserPlanProvider } from '@/contexts/UserPlanContext';
import { useEffect, useState } from 'react';

export function Providers({ children }: { children: React.ReactNode }) {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading Test Buddy...</p>
        </div>
      </div>
    );
  }

  return (
    <UserPlanProvider>
      {children}
    </UserPlanProvider>
  );
}
