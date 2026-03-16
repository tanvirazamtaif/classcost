import { useApp } from '../contexts/AppContext';

export function useOnboarding() {
  const { user, setUser } = useApp();

  const isComplete = user?.onboardingComplete || user?.profileComplete || false;
  const currentStep = user?.onboardingStep || 0;

  const completeStep = (step) => {
    setUser(prev => ({
      ...prev,
      onboardingStep: step + 1,
    }));
  };

  const finishOnboarding = () => {
    setUser(prev => ({
      ...prev,
      onboardingComplete: true,
      profileComplete: true,
    }));
  };

  const shouldShowOnboarding = !isComplete && !user?.onboardingSkipped;

  return {
    isComplete,
    currentStep,
    completeStep,
    finishOnboarding,
    shouldShowOnboarding,
  };
}
