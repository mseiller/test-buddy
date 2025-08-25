export type UserPlan = "free" | "student" | "pro";

export interface PlanFeatures {
  maxTestsPerMonth: number;
  retakesAllowed: boolean;
  folders: boolean;
  aiFeedback: boolean;
  metrics: false | "basic" | "advanced";
  model: string;
  name: string;
  price: string;
  description: string;
}

export const PLAN_FEATURES: Record<UserPlan, PlanFeatures> = {
  free: {
    maxTestsPerMonth: 3,
    retakesAllowed: false,
    folders: false,
    aiFeedback: false,
    metrics: false,
    model: "qwen/qwen3-235b-a22b:free",
    name: "Freemium",
    price: "Free",
    description: "Perfect for trying out Test Buddy"
  },
  student: {
    maxTestsPerMonth: 20,
    retakesAllowed: true,
    folders: false,
    aiFeedback: false,
    metrics: "basic",
    model: "qwen/qwen3-235b-a22b:free",
    name: "Student",
    price: "$5/month",
    description: "Great for students with regular testing needs"
  },
  pro: {
    maxTestsPerMonth: Infinity,
    retakesAllowed: true,
    folders: true,
    aiFeedback: true,
    metrics: "advanced",
    model: "openai/gpt-4o-mini",
    name: "Pro",
    price: "$15/month",
    description: "Full access to all Test Buddy features"
  }
};

export const DEFAULT_PLAN: UserPlan = "free";

// Helper functions
export function getPlanFeatures(plan: UserPlan): PlanFeatures {
  return PLAN_FEATURES[plan];
}

export function canUseFeature(plan: UserPlan, feature: keyof PlanFeatures): boolean {
  const features = getPlanFeatures(plan);
  return Boolean(features[feature]);
}

export function getUpgradeMessage(currentPlan: UserPlan, requiredFeature: string): string {
  switch (currentPlan) {
    case "free":
      return `Upgrade to Student ($5/mo) or Pro ($15/mo) to unlock ${requiredFeature}`;
    case "student":
      return `Upgrade to Pro ($15/mo) to unlock ${requiredFeature}`;
    default:
      return "";
  }
}
