import React, { useState, useEffect } from 'react';
import { useApp } from '../contexts/AppContext';
import { SetupProgress, SetupHint } from '../components/feature/SetupGuide';

const TOTAL_STEPS = 4;

export const EducationSetupView = () => {
  const { user, setUser, navigate, theme } = useApp();
  const d = theme === 'dark';

  const [step, setStep] = useState(1);
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
          <SetupProgress steps={Array(TOTAL_STEPS)} currentStep={step - 1} />
        </div>
      </div>

      {/* Content */}
      <div className="max-w-md mx-auto px-4 py-6">

        {/* STEP 1: Education Stage */}
        {step === 1 && (
          <div>
            <h1 className={`text-2xl font-bold mb-2 ${d ? 'text-white' : 'text-slate-900'}`}>
              আপনি কোথায় পড়েন? 📚
            </h1>
            <p className={`mb-6 ${d ? 'text-slate-400' : 'text-slate-600'}`}>Where do you study?</p>

            <SetupHint>এটি বেছে নিলে আমরা আপনার জন্য সঠিক ফি স্ট্রাকচার দেখাব।</SetupHint>

            <OptionButton selected={data.stage === 'school'} onClick={() => setData({ ...data, stage: 'school' })}
              icon="🏫" title="স্কুল (School)" subtitle="Class 1 - 10" />
            <OptionButton selected={data.stage === 'college'} onClick={() => setData({ ...data, stage: 'college' })}
              icon="📖" title="কলেজ (College)" subtitle="HSC / Diploma" />
            <OptionButton selected={data.stage === 'university'} onClick={() => setData({ ...data, stage: 'university' })}
              icon="🎓" title="বিশ্ববিদ্যালয় (University)" subtitle="Bachelor's / Master's / PhD" />
            <OptionButton selected={data.stage === 'coaching'} onClick={() => setData({ ...data, stage: 'coaching' })}
              icon="📝" title="শুধু কোচিং (Coaching Only)" subtitle="Admission prep / Skill courses" />
          </div>
        )}

        {/* STEP 2: Institution Type */}
        {step === 2 && (
          <div>
            <h1 className={`text-2xl font-bold mb-2 ${d ? 'text-white' : 'text-slate-900'}`}>
              কোন ধরনের প্রতিষ্ঠান? 🏛️
            </h1>
            <p className={`mb-6 ${d ? 'text-slate-400' : 'text-slate-600'}`}>What type of institution?</p>

            <OptionButton selected={data.institutionType === 'government'} onClick={() => setData({ ...data, institutionType: 'government' })}
              icon="🏛️" title="সরকারি (Government)" subtitle="Low fees, competitive admission" />
            <OptionButton selected={data.institutionType === 'private'} onClick={() => setData({ ...data, institutionType: 'private' })}
              icon="🏢" title="বেসরকারি (Private)" subtitle="Higher fees, flexible admission" />

            <div className="mt-6">
              <label className={`block text-sm font-medium mb-2 ${d ? 'text-slate-300' : 'text-slate-700'}`}>
                প্রতিষ্ঠানের নাম (Institution Name) - Optional
              </label>
              <input type="text" placeholder="e.g., North South University" value={data.institutionName}
                onChange={e => setData({ ...data, institutionName: e.target.value })} className={inputClass} />
            </div>
          </div>
        )}

        {/* STEP 3: Location */}
        {step === 3 && (
          <div>
            <h1 className={`text-2xl font-bold mb-2 ${d ? 'text-white' : 'text-slate-900'}`}>
              আপনি কি অন্য জেলা থেকে এসেছেন? 🚌
            </h1>
            <p className={`mb-6 ${d ? 'text-slate-400' : 'text-slate-600'}`}>Are you from another district?</p>

            <SetupHint>এটি জানলে আমরা বাস ভাড়া ও থাকার খরচ ট্র্যাক করতে পারব।</SetupHint>

            <OptionButton selected={data.isFromOutside === false}
              onClick={() => setData({ ...data, isFromOutside: false, accommodation: 'family' })}
              icon="🏠" title="না, আমি লোকাল" subtitle="I live with family, no rent" />
            <OptionButton selected={data.isFromOutside === true}
              onClick={() => setData({ ...data, isFromOutside: true })}
              icon="🚌" title="হ্যাঁ, অন্য জেলা থেকে" subtitle="I came from another district" />

            {data.isFromOutside === true && (
              <div className={subPanelClass}>
                <label className={`block text-sm font-medium mb-2 ${d ? 'text-slate-300' : 'text-slate-700'}`}>
                  কোন জেলা থেকে? (Home District)
                </label>
                <select value={data.homeDistrict} onChange={e => setData({ ...data, homeDistrict: e.target.value })}
                  className={`${inputClass} mb-4`}>
                  <option value="">Select district</option>
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
                  কোথায় থাকেন? (Where do you stay?)
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
              আগের খরচ যোগ করবেন? 📊
            </h1>
            <p className={`mb-6 ${d ? 'text-slate-400' : 'text-slate-600'}`}>Add your previous education costs?</p>

            <SetupHint>এটি করলে আপনার সম্পূর্ণ শিক্ষা খরচের হিসাব দেখতে পাবেন।</SetupHint>

            <OptionButton selected={data.hasHistoricalData === false}
              onClick={() => setData({ ...data, hasHistoricalData: false })}
              icon="🆕" title="না, শূন্য থেকে শুরু" subtitle="Start fresh from today" />
            <OptionButton selected={data.hasHistoricalData === true}
              onClick={() => setData({ ...data, hasHistoricalData: true })}
              icon="📈" title="হ্যাঁ, আগের খরচ যোগ করব" subtitle="Add estimated previous costs" />

            {data.hasHistoricalData === true && (
              <div className={subPanelClass}>
                <label className={`block text-sm font-medium mb-2 ${d ? 'text-slate-300' : 'text-slate-700'}`}>
                  কোন সময়ের খরচ? (Which period?)
                </label>
                <select value={data.historicalPeriod} onChange={e => setData({ ...data, historicalPeriod: e.target.value })}
                  className={`${inputClass} mb-4`}>
                  <option value="">Select period</option>
                  <option value="this_year">এই বছরের আগের মাসগুলো</option>
                  <option value="last_year">গত বছর (Last Year)</option>
                  <option value="all_previous">পুরো আগের সময় (All Previous)</option>
                </select>

                <label className={`block text-sm font-medium mb-2 ${d ? 'text-slate-300' : 'text-slate-700'}`}>
                  আনুমানিক মোট খরচ (Estimated Total)
                </label>
                <div className="relative">
                  <span className={`absolute left-4 top-1/2 -translate-y-1/2 ${d ? 'text-slate-400' : 'text-slate-500'}`}>৳</span>
                  <input type="number" placeholder="50000" value={data.historicalAmount}
                    onChange={e => setData({ ...data, historicalAmount: e.target.value })}
                    className={`${inputClass} pl-10`} inputMode="numeric" />
                </div>
                <p className={`text-xs mt-2 ${d ? 'text-slate-500' : 'text-slate-400'}`}>
                  সঠিক না হলেও চলবে, পরে এডিট করতে পারবেন।
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
              ← Back
            </button>
          )}
          <button onClick={handleNext} disabled={!canProceed()}
            className={`flex-1 py-3 rounded-xl font-semibold transition ${
              canProceed()
                ? 'bg-indigo-600 text-white hover:bg-indigo-500 active:scale-[0.98]'
                : d ? 'bg-slate-700 text-slate-500 cursor-not-allowed' : 'bg-slate-200 text-slate-400 cursor-not-allowed'
            }`}>
            {step === TOTAL_STEPS ? '✓ Finish Setup' : 'Next →'}
          </button>
        </div>

        <button onClick={() => navigate('dashboard')}
          className={`w-full mt-4 py-2 text-sm ${d ? 'text-slate-500 hover:text-slate-400' : 'text-slate-400 hover:text-slate-500'}`}>
          Skip for now, I'll set up later
        </button>
      </div>
    </div>
  );
};

export default EducationSetupView;
