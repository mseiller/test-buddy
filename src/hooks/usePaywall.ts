import { useState } from 'react';

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
      triggerFeature: triggerFeature || '',
    });
  };

  const hidePaywall = () => {
    setPaywallState({
      isOpen: false,
      triggerFeature: '',
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
