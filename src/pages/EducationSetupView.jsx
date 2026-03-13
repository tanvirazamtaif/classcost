import React, { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { SetupProgress, SetupHint } from '../components/feature/SetupGuide';

const TOTAL_STEPS = 4;

const LANG = {
  en: {
    step1Title: 'Where do you study? 📚',
    step1Sub: '',
    step1Hint: 'This helps us show the right fee structure for you.',
    school: 'School', schoolSub: 'Class 1 - 10',
    college: 'College', collegeSub: 'HSC / Diploma',
    university: 'University', universitySub: "Bachelor's / Master's / PhD",
    coaching: 'Coaching Only', coachingSub: 'Admission prep / Skill courses',
    step2Title: 'What type of institution? 🏛️',
    step2Sub: '',
    govt: 'Government', govtSub: 'Low fees, competitive admission',
    private: 'Private', privateSub: 'Higher fees, flexible admission',
    instLabel: 'Institution Name - Optional',
    instPlaceholder: 'e.g., North South University',
    step3Title: 'Are you from another district? 🚌',
    step3Sub: '',
    step3Hint: 'This helps us track transport & accommodation costs.',
    localTitle: "No, I'm local", localSub: 'I live with family, no rent',
    outsideTitle: 'Yes, another district', outsideSub: 'I came from another district',
    districtLabel: 'Home District',
    selectDistrict: 'Select district',
    stayLabel: 'Where do you stay?',
    step4Title: 'Add previous costs? 📊',
    step4Sub: '',
    step4Hint: 'This gives you a complete picture of your total education cost.',
    freshTitle: 'No, start fresh', freshSub: 'Start fresh from today',
    histTitle: 'Yes, add previous costs', histSub: 'Add estimated previous costs',
    periodLabel: 'Which period?',
    selectPeriod: 'Select period',
    thisYear: 'Earlier months this year',
    lastYear: 'Last Year',
    allPrev: 'All Previous',
    totalLabel: 'Estimated Total',
    approxNote: "Doesn't need to be exact, you can edit later.",
    back: '← Back',
    next: 'Next →',
    finish: '✓ Finish Setup',
    skip: "Skip for now, I'll set up later",
  },
  bn: {
    step1Title: 'আপনি কোথায় পড়েন? 📚',
    step1Sub: 'Where do you study?',
    step1Hint: 'এটি বেছে নিলে আমরা আপনার জন্য সঠিক ফি স্ট্রাকচার দেখাব।',
    school: 'স্কুল (School)', schoolSub: 'Class 1 - 10',
    college: 'কলেজ (College)', collegeSub: 'HSC / Diploma',
    university: 'বিশ্ববিদ্যালয় (University)', universitySub: "Bachelor's / Master's / PhD",
    coaching: 'শুধু কোচিং (Coaching Only)', coachingSub: 'Admission prep / Skill courses',
    step2Title: 'কোন ধরনের প্রতিষ্ঠান? 🏛️',
    step2Sub: 'What type of institution?',
    govt: 'সরকারি (Government)', govtSub: 'Low fees, competitive admission',
    private: 'বেসরকারি (Private)', privateSub: 'Higher fees, flexible admission',
    instLabel: 'প্রতিষ্ঠানের নাম (Institution Name) - Optional',
    instPlaceholder: 'e.g., North South University',
    step3Title: 'আপনি কি অন্য জেলা থেকে এসেছেন? 🚌',
    step3Sub: 'Are you from another district?',
    step3Hint: 'এটি জানলে আমরা বাস ভাড়া ও থাকার খরচ ট্র্যাক করতে পারব।',
    localTitle: "না, আমি লোকাল", localSub: 'I live with family, no rent',
    outsideTitle: 'হ্যাঁ, অন্য জেলা থেকে', outsideSub: 'I came from another district',
    districtLabel: 'কোন জেলা থেকে? (Home District)',
    selectDistrict: 'Select district',
    stayLabel: 'কোথায় থাকেন? (Where do you stay?)',
    step4Title: 'আগের খরচ যোগ করবেন? 📊',
    step4Sub: 'Add your previous education costs?',
    step4Hint: 'এটি করলে আপনার সম্পূর্ণ শিক্ষা খরচের হিসাব দেখতে পাবেন।',
    freshTitle: 'না, শূন্য থেকে শুরু', freshSub: 'Start fresh from today',
    histTitle: 'হ্যাঁ, আগের খরচ যোগ করব', histSub: 'Add estimated previous costs',
    periodLabel: 'কোন সময়ের খরচ? (Which period?)',
    selectPeriod: 'Select period',
    thisYear: 'এই বছরের আগের মাসগুলো',
    lastYear: 'গত বছর (Last Year)',
    allPrev: 'পুরো আগের সময় (All Previous)',
    totalLabel: 'আনুমানিক মোট খরচ (Estimated Total)',
    approxNote: 'সঠিক না হলেও চলবে, পরে এডিট করতে পারবেন।',
    back: '← পিছনে',
    next: 'পরবর্তী →',
    finish: '✓ সেটআপ শেষ',
    skip: 'এখন দরকার নেই, পরে করব',
  },
};

export const EducationSetupView = () => {
  const { user, setUser, navigate, theme } = useApp();
  const d = theme === 'dark';

  const [step, setStep] = useState(1);
  const [lang, setLang] = useState('bn');
  const t = LANG[lang];
  const [data, setData] = useState({
    stage: '',
    institutionType: '',
    institutionName: '',
    isFromOutside: null,
    homeDistrict: '',
    accommodation: '',
    hasHistoricalData: null,
    historicalAmount: '',
    historicalPeriod: '',
  });

  useEffect(() => { document.title = 'Setup Education — ClassCost'; }, []);

  const handleNext = () => {
    if (step < TOTAL_STEPS) {
      setStep(step + 1);
    } else {
      handleFinish();
    }
  };

  const handleBack = () => { if (step > 1) setStep(step - 1); };

  const handleFinish = () => {
    const educationProfile = {
      stage: data.stage,
      institutionType: data.institutionType,
      institutionName: data.institutionName,
      isFromOutside: data.isFromOutside,
      homeDistrict: data.homeDistrict,
      accommodation: data.accommodation,
      setupComplete: true,
      historicalData: data.hasHistoricalData
        ? { amount: Number(data.historicalAmount) || 0, period: data.historicalPeriod }
        : null,
    };
    setUser(prev => ({ ...prev, educationProfile }));
    navigate(data.hasHistoricalData ? 'historical-data' : 'dashboard');
  };

  const canProceed = () => {
    switch (step) {
      case 1: return !!data.stage;
      case 2: return !!data.institutionType;
      case 3: return data.isFromOutside !== null;
      case 4: return data.hasHistoricalData !== null;
      default: return true;
    }
  };

  const OptionButton = ({ selected, onClick, icon, title, subtitle }) => (
    <button
      onClick={onClick}
      className={`w-full text-left p-4 rounded-2xl border-2 transition-all mb-3 ${
        selected
          ? 'border-indigo-500 bg-indigo-500/20'
          : d
            ? 'border-slate-700 bg-slate-800/50 hover:border-slate-600'
            : 'border-slate-200 bg-white hover:border-slate-300'
      }`}
    >
      <div className="flex items-center gap-4">
        <span className="text-3xl">{icon}</span>
        <div>
          <p className={`font-semibold ${d ? 'text-white' : 'text-slate-900'}`}>{title}</p>
          {subtitle && <p className={`text-sm ${d ? 'text-slate-400' : 'text-slate-500'}`}>{subtitle}</p>}
        </div>
        {selected && <span className="ml-auto text-indigo-500 text-xl">✓</span>}
      </div>
    </button>
  );

  const inputClass = `w-full rounded-xl py-3 px-4 text-base outline-none transition border ${
    d ? 'bg-slate-800 border-slate-700 text-white placeholder-slate-500 focus:border-indigo-500'
      : 'bg-white border-slate-200 text-slate-900 placeholder-slate-400 focus:border-indigo-500'
  }`;

  const subPanelClass = `mt-4 p-4 rounded-xl ${d ? 'bg-slate-800/50 border border-slate-700' : 'bg-slate-50 border border-slate-200'}`;

  return (
    <div className={`min-h-screen ${d ? 'bg-slate-950' : 'bg-slate-50'}`}>
      {/* Header */}
      <div className={`sticky top-0 z-10 px-4 py-4 backdrop-blur-xl ${d ? 'bg-slate-950/90' : 'bg-white/90'}`}>
        <div className="max-w-md mx-auto">
          <div className="flex items-center justify-between mb-3">
            <SetupProgress steps={Array(TOTAL_STEPS)} currentStep={step - 1} />
            <button
              onClick={() => setLang(l => l === 'bn' ? 'en' : 'bn')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition shrink-0 ml-3 ${
                d ? 'bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700'
                  : 'bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 shadow-sm'
              }`}
            >
              <span>{lang === 'bn' ? '🇬🇧' : '🇧🇩'}</span>
              <span>{lang === 'bn' ? 'EN' : 'বাংলা'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-md mx-auto px-4 py-6">

        {/* STEP 1: Education Stage */}
        {step === 1 && (
          <div>
            <h1 className={`text-2xl font-bold mb-2 ${d ? 'text-white' : 'text-slate-900'}`}>
              {t.step1Title}
            </h1>
            {t.step1Sub && <p className={`mb-6 ${d ? 'text-slate-400' : 'text-slate-600'}`}>{t.step1Sub}</p>}

            <SetupHint>{t.step1Hint}</SetupHint>

            <OptionButton selected={data.stage === 'school'} onClick={() => setData({ ...data, stage: 'school' })}
              icon="🏫" title={t.school} subtitle={t.schoolSub} />
            <OptionButton selected={data.stage === 'college'} onClick={() => setData({ ...data, stage: 'college' })}
              icon="📖" title={t.college} subtitle={t.collegeSub} />
            <OptionButton selected={data.stage === 'university'} onClick={() => setData({ ...data, stage: 'university' })}
              icon="🎓" title={t.university} subtitle={t.universitySub} />
            <OptionButton selected={data.stage === 'coaching'} onClick={() => setData({ ...data, stage: 'coaching' })}
              icon="📝" title={t.coaching} subtitle={t.coachingSub} />
          </div>
        )}

        {/* STEP 2: Institution Type */}
        {step === 2 && (
          <div>
            <h1 className={`text-2xl font-bold mb-2 ${d ? 'text-white' : 'text-slate-900'}`}>
              {t.step2Title}
            </h1>
            {t.step2Sub && <p className={`mb-6 ${d ? 'text-slate-400' : 'text-slate-600'}`}>{t.step2Sub}</p>}

            <OptionButton selected={data.institutionType === 'government'} onClick={() => setData({ ...data, institutionType: 'government' })}
              icon="🏛️" title={t.govt} subtitle={t.govtSub} />
            <OptionButton selected={data.institutionType === 'private'} onClick={() => setData({ ...data, institutionType: 'private' })}
              icon="🏢" title={t.private} subtitle={t.privateSub} />

            <div className="mt-6">
              <label className={`block text-sm font-medium mb-2 ${d ? 'text-slate-300' : 'text-slate-700'}`}>
                {t.instLabel}
              </label>
              <input type="text" placeholder={t.instPlaceholder} value={data.institutionName}
                onChange={e => setData({ ...data, institutionName: e.target.value })} className={inputClass} />
            </div>
          </div>
        )}

        {/* STEP 3: Location */}
        {step === 3 && (
          <div>
            <h1 className={`text-2xl font-bold mb-2 ${d ? 'text-white' : 'text-slate-900'}`}>
              {t.step3Title}
            </h1>
            {t.step3Sub && <p className={`mb-6 ${d ? 'text-slate-400' : 'text-slate-600'}`}>{t.step3Sub}</p>}

            <SetupHint>{t.step3Hint}</SetupHint>

            <OptionButton selected={data.isFromOutside === false}
              onClick={() => setData({ ...data, isFromOutside: false, accommodation: 'family' })}
              icon="🏠" title={t.localTitle} subtitle={t.localSub} />
            <OptionButton selected={data.isFromOutside === true}
              onClick={() => setData({ ...data, isFromOutside: true })}
              icon="🚌" title={t.outsideTitle} subtitle={t.outsideSub} />

            {data.isFromOutside === true && (
              <div className={subPanelClass}>
                <label className={`block text-sm font-medium mb-2 ${d ? 'text-slate-300' : 'text-slate-700'}`}>
                  {t.districtLabel}
                </label>
                <select value={data.homeDistrict} onChange={e => setData({ ...data, homeDistrict: e.target.value })}
                  className={`${inputClass} mb-4`}>
                  <option value="">{t.selectDistrict}</option>
                  <option value="chittagong">চট্টগ্রাম (Chittagong)</option>
                  <option value="sylhet">সিলেট (Sylhet)</option>
                  <option value="rajshahi">রাজশাহী (Rajshahi)</option>
                  <option value="khulna">খুলনা (Khulna)</option>
                  <option value="barishal">বরিশাল (Barishal)</option>
                  <option value="rangpur">রংপুর (Rangpur)</option>
                  <option value="mymensingh">ময়মনসিংহ (Mymensingh)</option>
                  <option value="comilla">কুমিল্লা (Comilla)</option>
                  <option value="other">অন্যান্য (Other)</option>
                </select>

                <label className={`block text-sm font-medium mb-2 ${d ? 'text-slate-300' : 'text-slate-700'}`}>
                  {t.stayLabel}
                </label>
                <div className="space-y-2">
                  <OptionButton selected={data.accommodation === 'univ_hostel'}
                    onClick={() => setData({ ...data, accommodation: 'univ_hostel' })}
                    icon="🏨" title="University Hostel/Hall" />
                  <OptionButton selected={data.accommodation === 'mess'}
                    onClick={() => setData({ ...data, accommodation: 'mess' })}
                    icon="🏠" title="Private Mess/Hostel" />
                  <OptionButton selected={data.accommodation === 'rent'}
                    onClick={() => setData({ ...data, accommodation: 'rent' })}
                    icon="🏢" title="Rented Room/Flat" />
                  <OptionButton selected={data.accommodation === 'relative'}
                    onClick={() => setData({ ...data, accommodation: 'relative' })}
                    icon="👨‍👩‍👧" title="Relative's House" />
                </div>
              </div>
            )}
          </div>
        )}

        {/* STEP 4: Historical Data */}
        {step === 4 && (
          <div>
            <h1 className={`text-2xl font-bold mb-2 ${d ? 'text-white' : 'text-slate-900'}`}>
              {t.step4Title}
            </h1>
            {t.step4Sub && <p className={`mb-6 ${d ? 'text-slate-400' : 'text-slate-600'}`}>{t.step4Sub}</p>}

            <SetupHint>{t.step4Hint}</SetupHint>

            <OptionButton selected={data.hasHistoricalData === false}
              onClick={() => setData({ ...data, hasHistoricalData: false })}
              icon="🆕" title={t.freshTitle} subtitle={t.freshSub} />
            <OptionButton selected={data.hasHistoricalData === true}
              onClick={() => setData({ ...data, hasHistoricalData: true })}
              icon="📈" title={t.histTitle} subtitle={t.histSub} />

            {data.hasHistoricalData === true && (
              <div className={subPanelClass}>
                <label className={`block text-sm font-medium mb-2 ${d ? 'text-slate-300' : 'text-slate-700'}`}>
                  {t.periodLabel}
                </label>
                <select value={data.historicalPeriod} onChange={e => setData({ ...data, historicalPeriod: e.target.value })}
                  className={`${inputClass} mb-4`}>
                  <option value="">{t.selectPeriod}</option>
                  <option value="this_year">{t.thisYear}</option>
                  <option value="last_year">{t.lastYear}</option>
                  <option value="all_previous">{t.allPrev}</option>
                </select>

                <label className={`block text-sm font-medium mb-2 ${d ? 'text-slate-300' : 'text-slate-700'}`}>
                  {t.totalLabel}
                </label>
                <div className="relative">
                  <span className={`absolute left-4 top-1/2 -translate-y-1/2 ${d ? 'text-slate-400' : 'text-slate-500'}`}>৳</span>
                  <input type="number" placeholder="50000" value={data.historicalAmount}
                    onChange={e => setData({ ...data, historicalAmount: e.target.value })}
                    className={`${inputClass} pl-10`} inputMode="numeric" />
                </div>
                <p className={`text-xs mt-2 ${d ? 'text-slate-500' : 'text-slate-400'}`}>
                  {t.approxNote}
                </p>
              </div>
            )}
          </div>
        )}

        {/* Navigation Buttons */}
        <div className="flex gap-3 mt-8">
          {step > 1 && (
            <button onClick={handleBack}
              className={`flex-1 py-3 rounded-xl font-semibold transition ${
                d ? 'bg-slate-800 text-slate-300 hover:bg-slate-700' : 'bg-slate-200 text-slate-700 hover:bg-slate-300'
              }`}>
              {t.back}
            </button>
          )}
          <button onClick={handleNext} disabled={!canProceed()}
            className={`flex-1 py-3 rounded-xl font-semibold transition ${
              canProceed()
                ? 'bg-indigo-600 text-white hover:bg-indigo-500 active:scale-[0.98]'
                : d ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}>
            {step === TOTAL_STEPS ? t.finish : t.next}
          </button>
        </div>

        <button onClick={() => navigate('dashboard')}
          className={`w-full mt-4 py-2 text-sm ${d ? 'text-slate-500 hover:text-slate-400' : 'text-slate-400 hover:text-slate-500'}`}>
          {t.skip}
        </button>
      </div>
    </div>
  );
};

export default EducationSetupView;
