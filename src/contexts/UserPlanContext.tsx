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
  
  // Check if we're in bypass mode (no real Firebase user but we want to test)
  const isBypassMode = typeof window !== 'undefined' && window.location.search.includes('bypass=true');
  
  // Debug logging
  if (isBypassMode) {
    console.log('BYPASS MODE DETECTED in UserPlanContext');
  }
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [usage, setUsage] = useState<UsageRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Bypass check for testing - give Pro features to bypass user
  const isBypassUser = user?.uid === 'bypass-user-123' || isBypassMode;
  const plan = isBypassUser ? 'pro' : (userProfile?.plan || DEFAULT_PLAN);
  const planFeatures = getPlanFeatures(plan);

  // Load user profile
  const loadUserProfile = async () => {
    if (!user && !isBypassMode) {
      setUserProfile(null);
      setLoading(false);
      return;
    }

    // For bypass mode, create mock profile
    if (isBypassMode) {
      setUserProfile({
        userId: 'bypass-user-123',
        email: 'bypass@test.com',
        displayName: 'Bypass User (Pro)',
        plan: 'pro',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      setLoading(false);
      return;
    }

    // For bypass user, create mock profile
    if (user?.uid === 'bypass-user-123') {
      setUserProfile({
        userId: user.uid,
        email: user.email || '',
        displayName: user.displayName || '',
        plan: 'pro',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const profile = await ensureUserProfile(
        user.uid,
        user.email || '',
        user.displayName || undefined
      );
      
      setUserProfile(profile);
    } catch (err) {
      console.error('Error loading user profile:', err);
      setError('Failed to load user profile');
    } finally {
      setLoading(false);
    }
  };

  // Load usage data
  const loadUsage = async () => {
    if (!user && !isBypassMode) return;

    // For bypass mode, create mock usage data
    if (isBypassMode) {
      setUsage({
        testsGenerated: 5,
        lastReset: new Date().toISOString(),
        userId: 'bypass-user-123'
      });
      return;
    }

    // For bypass user, create mock usage data
    if (user?.uid === 'bypass-user-123') {
      setUsage({
        testsGenerated: 5,
        lastReset: new Date().toISOString(),
        userId: user.uid
      });
      return;
    }

    if (!userProfile) return;

    try {
      const usageCheck = await canGenerateTest(user.uid, userProfile.plan);
      setUsage(usageCheck.usage);
    } catch (err) {
      console.error('Error loading usage:', err);
    }
  };

  // Load profile on auth state change or bypass mode
  useEffect(() => {
    if (isBypassMode || !authLoading) {
      loadUserProfile();
    }
  }, [user, authLoading, isBypassMode]);

  // Handle bypass mode loading state
  useEffect(() => {
    if (isBypassMode && !loading) {
      setLoading(false);
    }
  }, [isBypassMode, loading]);

  // Load usage when profile is available
  useEffect(() => {
    if (userProfile || isBypassMode) {
      loadUsage();
    }
  }, [userProfile, isBypassMode]);

  // Calculate derived values
  const canCreateTest = usage ? 
    (planFeatures.maxTestsPerMonth === Infinity || usage.testsGenerated < planFeatures.maxTestsPerMonth) : 
    (isBypassMode ? true : false);

  const testsRemaining = usage && planFeatures.maxTestsPerMonth !== Infinity ? 
    Math.max(0, planFeatures.maxTestsPerMonth - usage.testsGenerated) : 
    (isBypassMode ? Infinity : 0);

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
    loading: isBypassMode ? loading : (loading || authLoading),
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
