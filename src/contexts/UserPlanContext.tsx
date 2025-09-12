'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { auth } from '@/lib/firebase';
import { UserProfile, ensureUserProfile } from '@/services/userService';
import { UserPlan, DEFAULT_PLAN, getPlanFeatures } from '@/config/plans';
import { canGenerateTest, UsageRecord } from '@/services/usageService';

interface UserPlanContextType {
  // User data
  userProfile: UserProfile | null;
  plan: UserPlan;
  planFeatures: ReturnType<typeof getPlanFeatures>;
  loading: boolean;
  error: string | null;
  
  // Usage data
  usage: UsageRecord | null;
  canCreateTest: boolean;
  testsRemaining: number;
  
  // Actions
  refreshProfile: () => Promise<void>;
  refreshUsage: () => Promise<void>;
}

const UserPlanContext = createContext<UserPlanContextType | undefined>(undefined);

export function UserPlanProvider({ children }: { children: React.ReactNode }) {
  const [user, authLoading] = useAuthState(auth);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [usage, setUsage] = useState<UsageRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Add timeout to prevent infinite loading
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (loading && !authLoading) {
        console.warn('UserPlanContext: Loading timeout reached, setting loading to false');
        setLoading(false);
      }
    }, 10000); // 10 second timeout

    return () => clearTimeout(timeout);
  }, [loading, authLoading]);

  const plan = userProfile?.plan || DEFAULT_PLAN;
  const planFeatures = getPlanFeatures(plan);

  // Load user profile
  const loadUserProfile = async () => {
    if (!user) {
      setUserProfile(null);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      console.log('Loading user profile for:', user.uid);
      const profile = await ensureUserProfile(
        user.uid,
        user.email || '',
        user.displayName || undefined
      );
      
      console.log('User profile loaded:', profile);
      setUserProfile(profile);
    } catch (err) {
      console.error('Error loading user profile:', err);
      setError('Failed to load user profile');
      // Set a default profile to prevent infinite loading
      setUserProfile({
        uid: user.uid,
        email: user.email || '',
        plan: 'free',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    } finally {
      setLoading(false);
    }
  };

  // Load usage data
  const loadUsage = async () => {
    if (!user || !userProfile) return;

    try {
      const usageCheck = await canGenerateTest(user.uid, userProfile.plan);
      setUsage(usageCheck.usage);
    } catch (err) {
      console.error('Error loading usage:', err);
    }
  };

  // Load profile on auth state change
  useEffect(() => {
    if (!authLoading) {
      loadUserProfile();
    }
  }, [user, authLoading]);

  // Load usage when profile is available
  useEffect(() => {
    if (userProfile) {
      loadUsage();
    }
  }, [userProfile]);

  // Set global user plan for OCR access
  useEffect(() => {
    if (typeof window !== 'undefined') {
      (window as any).__userPlan = plan;
    }
  }, [plan]);

  // Calculate derived values
  const canCreateTest = usage ? 
    (planFeatures.maxTestsPerMonth === Infinity || usage.testsGenerated < planFeatures.maxTestsPerMonth) : 
    (planFeatures.maxTestsPerMonth === Infinity || planFeatures.maxTestsPerMonth > 0); // Allow new users to create tests

  const testsRemaining = usage && planFeatures.maxTestsPerMonth !== Infinity ? 
    Math.max(0, planFeatures.maxTestsPerMonth - usage.testsGenerated) : 
    (planFeatures.maxTestsPerMonth === Infinity ? Infinity : planFeatures.maxTestsPerMonth); // Show full limit for new users

  const refreshProfile = async () => {
    await loadUserProfile();
  };

  const refreshUsage = async () => {
    await loadUsage();
  };

  const value: UserPlanContextType = {
    userProfile,
    plan,
    planFeatures,
    loading: loading || authLoading,
    error,
    usage,
    canCreateTest,
    testsRemaining: testsRemaining as number,
    refreshProfile,
    refreshUsage,
  };

  return (
    <UserPlanContext.Provider value={value}>
      {children}
    </UserPlanContext.Provider>
  );
}

export function useUserPlan(): UserPlanContextType {
  const context = useContext(UserPlanContext);
  if (context === undefined) {
    throw new Error('useUserPlan must be used within a UserPlanProvider');
  }
  return context;
}

// Convenience hooks
export function usePlanFeatures() {
  const { planFeatures } = useUserPlan();
  return planFeatures;
}

export function useCanAccessFeature(feature: keyof ReturnType<typeof getPlanFeatures>) {
  const { planFeatures } = useUserPlan();
  return Boolean(planFeatures[feature]);
}

export function useUsageStatus() {
  const { usage, canCreateTest, testsRemaining, plan, planFeatures } = useUserPlan();
  return {
    usage,
    canCreateTest,
    testsRemaining,
    limit: planFeatures.maxTestsPerMonth,
    isUnlimited: planFeatures.maxTestsPerMonth === Infinity,
    plan,
  };
}
