import { useEffect, useRef } from 'react';

/**
 * Sync a multi-step wizard's `step` state with the browser's history stack so
 * that clicking the browser Back button moves between steps instead of
 * exiting the wizard entirely.
 *
 * How it works
 * ────────────
 * - Going forward (`step` increases) — we push a new history entry with the
 *   step number embedded in `history.state.wizardStep`.
 * - Going backward via the in-app Back button (`step` decreases) — we call
 *   `window.history.back()` to keep browser history in sync. The popstate
 *   handler below catches the resulting event and ensures the step state
 *   matches what the browser thinks.
 * - Going backward via the browser Back button — popstate fires, we read
 *   `event.state.wizardStep` and call `setStep` so the UI follows.
 *
 * AppContext's popstate handler is wizard-aware: it ignores popstate events
 * whose `state.view` equals the currently-rendered view, deferring those to
 * us. So the two listeners coexist cleanly.
 *
 * Usage
 * ─────
 *   const [step, setStep] = useState(1);
 *   useWizardHistory({ viewName: 'onboarding', step, setStep });
 *
 * @param {object}   args
 * @param {string}   args.viewName  The AppContext view this wizard renders under
 *                                  (e.g. 'onboarding', 'parent-onboarding'). Used
 *                                  to scope popstate events to this wizard.
 * @param {number}   args.step      Current step (1-indexed).
 * @param {Function} args.setStep   Setter — receives a number.
 * @param {number}   [args.minStep] Lowest valid step (default 1).
 */
export function useWizardHistory({ viewName, step, setStep, minStep = 1 }) {
  // Tracks the latest step we've pushed to history. Lets us detect whether a
  // step change came from forward navigation (push), in-app back (call .back),
  // or popstate (already in sync).
  const lastPushedRef = useRef(step);

  // On step change, sync browser history.
  useEffect(() => {
    if (step > lastPushedRef.current) {
      // Forward — push a new history entry tied to this wizard step.
      window.history.pushState(
        { view: viewName, wizardStep: step },
        '',
        window.location.pathname,
      );
      lastPushedRef.current = step;
    } else if (step < lastPushedRef.current) {
      // In-app back — fire history.back() so the popstate handler below can
      // sync. We don't update lastPushedRef here; the popstate handler does.
      window.history.back();
    }
  }, [step, viewName]);

  // Listen for browser back/forward. Only react to events scoped to our view.
  useEffect(() => {
    const handlePop = (e) => {
      const stateView = e.state?.view;
      // If the popped state targets a different view, AppContext will switch
      // away from us — nothing to do here.
      if (stateView && stateView !== viewName) return;

      const ws = e.state?.wizardStep;
      const nextStep = typeof ws === 'number' ? ws : minStep;
      setStep(nextStep);
      lastPushedRef.current = nextStep;
    };
    window.addEventListener('popstate', handlePop);
    return () => window.removeEventListener('popstate', handlePop);
  }, [viewName, setStep, minStep]);
}
