'use client';

import { UserPlanProvider } from '@/contexts/UserPlanContext';

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <UserPlanProvider>
      {children}
    </UserPlanProvider>
  );
}
