import { useState, useEffect } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { EDU, PROMOTION_CONFIG, shouldNudgeToday } from '../constants/education';
import { todayStr } from '../utils/helpers';

export const usePromotion = (profile, setUser) => {
  const [promoState, setPromoState] = useLocalStorage("ut_v3_promo", {});
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    if (!profile?.educationLevel) return;
    const cfg = PROMOTION_CONFIG[profile.educationLevel];
    if (!cfg) return;

    const t = setTimeout(() => {
      if (shouldNudgeToday(profile, promoState[profile.educationLevel])) {
        setShowBanner(true);
      }
    }, 2000);
    return () => clearTimeout(t);
  }, [profile?.educationLevel, profile?.classYear]);

  const mod = EDU[profile?.educationLevel];
  const levels = mod?.levels || [];
  const curIdx = levels.indexOf(profile?.classYear);
  const nextLevel = curIdx >= 0 && curIdx < levels.length - 1 ? levels[curIdx + 1] : null;
  const cfg = PROMOTION_CONFIG[profile?.educationLevel] || {};

  const handlePromote = () => {
    setUser((p) => ({
      ...p,
      profile: {
        ...p.profile,
        classYear: nextLevel,
        lastPromotedDate: todayStr(),
        promotionHistory: [
          ...(p.profile?.promotionHistory || []),
          { from: profile.classYear, to: nextLevel, date: todayStr() },
        ],
      },
    }));
    setPromoState((p) => ({
      ...p,
      [profile.educationLevel]: { lastAnsweredYear: new Date().getFullYear() },
    }));
    setShowBanner(false);
  };

  const handleFailed = () => {
    setUser((p) => ({
      ...p,
      profile: {
        ...p.profile,
        promotionHistory: [
          ...(p.profile?.promotionHistory || []),
          { from: profile.classYear, to: profile.classYear, date: todayStr(), result: "held_back" },
        ],
      },
    }));
    setPromoState((p) => ({
      ...p,
      [profile.educationLevel]: { lastAnsweredYear: new Date().getFullYear() },
    }));
    setShowBanner(false);
  };

  const handleSnooze = () => {
    const snoozedUntil = new Date(Date.now() + (cfg.snoozeDays || 30) * 86400000).toISOString();
    setPromoState((p) => ({
      ...p,
      [profile.educationLevel]: { ...p[profile.educationLevel], snoozedUntil },
    }));
    setShowBanner(false);
  };

  return { showBanner, nextLevel, cfg, handlePromote, handleFailed, handleSnooze };
};
