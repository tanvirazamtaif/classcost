import { useMemo } from 'react';
import { useApp } from '../contexts/AppContext';
import { PRICING, getPlanById, isProPlan } from '../constants/pricing';

/**
 * Hook to manage subscription state and feature access
 *
 * Usage:
 * const { plan, isPro, canAccess, limits } = useSubscription();
 *
 * if (!canAccess('exportPdf')) {
 *   showPaywall();
 * }
 */
export const useSubscription = () => {
  const { user } = useApp();

  // Get current plan from user data, default to free
  const planId = user?.subscription?.planId || 'student_free';
  const plan = getPlanById(planId) || PRICING.STUDENT_FREE;

  const isPro = useMemo(() => isProPlan(planId), [planId]);

  const limits = useMemo(() => plan.limits || {}, [plan]);

  /**
   * Check if user can access a specific feature
   * @param {string} feature - Feature key from plan.limits
   * @returns {boolean}
   */
  const canAccess = (feature) => {
    // If feature is a boolean, return it directly
    if (typeof limits[feature] === 'boolean') {
      return limits[feature];
    }
    // If feature is a number (like historyMonths), return true (caller handles limit)
    if (typeof limits[feature] === 'number') {
      return true;
    }
    // Default: allow access (feature not restricted)
    return true;
  };

  /**
   * Get the limit value for a feature
   * @param {string} feature - Feature key from plan.limits
   * @returns {number|boolean|undefined}
   */
  const getLimit = (feature) => {
    return limits[feature];
  };

  /**
   * Check if user's history access is limited
   * @param {number} monthsAgo - How many months ago the data is
   * @returns {boolean} - true if user can access, false if beyond limit
   */
  const canAccessHistory = (monthsAgo) => {
    const historyLimit = limits.historyMonths;
    if (historyLimit === Infinity) return true;
    return monthsAgo <= historyLimit;
  };

  /**
   * Get subscription status info
   */
  const subscriptionStatus = useMemo(() => ({
    planId,
    planName: plan.name,
    isPro,
    isExpired: user?.subscription?.expiresAt
      ? new Date(user.subscription.expiresAt) < new Date()
      : false,
    expiresAt: user?.subscription?.expiresAt || null,
    billingCycle: user?.subscription?.billingCycle || null, // 'monthly' | 'yearly'
  }), [planId, plan, isPro, user?.subscription]);

  return {
    plan,
    planId,
    isPro,
    limits,
    canAccess,
    getLimit,
    canAccessHistory,
    subscriptionStatus,
  };
};

export default useSubscription;
