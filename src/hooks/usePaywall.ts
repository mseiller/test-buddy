import { useState } from 'react';
import { UserPlan } from '@/config/plans';

interface PaywallState {
  isOpen: boolean;
  triggerFeature?: string;
}

export function usePaywall() {
  const [paywallState, setPaywallState] = useState<PaywallState>({
    isOpen: false,
  });

  const showPaywall = (triggerFeature?: string) => {
    setPaywallState({
      isOpen: true,
      triggerFeature,
    });
  };

  const hidePaywall = () => {
    setPaywallState({
      isOpen: false,
      triggerFeature: undefined,
    });
  };

  const showUpgradePrompt = (feature: string) => {
    showPaywall(feature);
  };

  return {
    isPaywallOpen: paywallState.isOpen,
    triggerFeature: paywallState.triggerFeature,
    showPaywall,
    hidePaywall,
    showUpgradePrompt,
  };
}
