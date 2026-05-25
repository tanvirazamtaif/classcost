// Lightweight i18n for ClassCost.
//
// Usage:
//   import { useT } from '../lib/i18n';
//   const { t, lang } = useT();
//   <h1>{t('landing.title')}</h1>
//
// The active language is stored in AppContext (`language` field, persisted to
// localStorage). Switching language re-renders subscribed components instantly.
//
// When a key is missing in the active language, falls back to English; if also
// missing in English, returns the key itself so missing strings are visible
// rather than silently empty.

import { useApp } from '../contexts/AppContext';

export const SUPPORTED_LANGS = ['en', 'bn'];

const STRINGS = {
  en: {
    // Brand / top nav
    'nav.features': 'Features',
    'nav.about': 'About',
    'nav.contact': 'Contact',

    // Hero (desktop)
    'landing.trustedBadge': 'Trusted by 500+ students',
    'landing.titleLine1': 'Track every taka',
    'landing.titleLine2Prefix': 'of your',
    'landing.titleHighlight': 'education',
    'landing.titleLine2Suffix': 'journey',
    'landing.subtitle': 'From semester fees to rickshaw fares — ClassCost helps Bangladesh students see exactly where their money goes.',
    'landing.stat.expensesTracked': 'Expenses tracked',
    'landing.stat.universities': 'Universities',
    'landing.stat.free': 'Free',
    'landing.stat.forStudents': 'For students',

    // Categories
    'cat.semesterFees': 'Semester fees',
    'cat.transport': 'Transport',
    'cat.housing': 'Housing',
    'cat.food': 'Food',
    'cat.studyMaterials': 'Study materials',

    // Mobile hero
    'landing.mobileTagline': 'Smart expense tracking for students',

    // Auth card
    'auth.getStarted': 'Get started',
    'auth.signInOrCreate': 'Sign in or create an account',
    'auth.continueWithApple': 'Continue with Apple',
    'auth.continueWithPhone': 'Continue with Phone',
    'auth.or': 'or',
    'auth.emailPlaceholder': 'Email address',
    'auth.continueWithEmail': 'Continue with Email',
    'auth.sendingCode': 'Sending code...',
    'auth.signingIn': 'Signing in...',
    'auth.codeHint': "We'll send a 6-digit verification code",
    'auth.emailFallbackToDemo': 'Email service unavailable — switching to demo. Use code 482913.',
    'otp.demoTitle': 'Demo mode',
    'otp.demoBody': 'No real email was sent. Use code 482913 to continue.',

    // Language toggle accessibility
    'lang.switchTo': 'Switch language',
    'lang.english': 'English',
    'lang.bangla': 'বাংলা',

    // Phone auth view
    'phoneAuth.title': 'Sign in with phone',
    'phoneAuth.titleVerify': 'Enter verification code',
    'phoneAuth.hint': "We'll send you a 6-digit code via SMS",
    'phoneAuth.sentTo': 'Sent to',
    'phoneAuth.phonePlaceholder': '1XXXXXXXXX',
    'phoneAuth.send': 'Send verification code',
    'phoneAuth.codePlaceholder': '6-digit code',
    'phoneAuth.verifying': 'Verifying...',
    'phoneAuth.verify': 'Verify and sign in',
    'phoneAuth.differentNumber': '← Use a different number',
    'phoneAuth.backToOptions': 'Back to sign-in options',
    'phoneAuth.invalidPhone': 'Enter a valid phone number',
    'phoneAuth.invalidCode': 'Enter the 6-digit code',
    'phoneAuth.codeSent': 'Code sent via SMS',
    'phoneAuth.signedIn': 'Signed in!',
    'phoneAuth.demoTitle': 'Demo mode',
    'phoneAuth.demoBody': 'No real SMS will be sent. Use code 482913 to continue. Set up Firebase to enable real phone OTP.',
    'phoneAuth.fallbackToDemo': 'Real SMS unavailable on this Firebase plan — switching to demo. Use code 482913.',
  },
  bn: {
    'nav.features': 'ফিচার',
    'nav.about': 'সম্পর্কে',
    'nav.contact': 'যোগাযোগ',

    'landing.trustedBadge': '৫০০+ শিক্ষার্থীর বিশ্বাস',
    'landing.titleLine1': 'প্রতিটি টাকার হিসাব',
    'landing.titleLine2Prefix': 'রাখো তোমার',
    'landing.titleHighlight': 'শিক্ষাজীবনের',
    'landing.titleLine2Suffix': '',
    'landing.subtitle': 'সেমিস্টার ফি থেকে রিকশা ভাড়া — ক্লাসকস্ট বাংলাদেশের শিক্ষার্থীদের দেখায় তাদের টাকা ঠিক কোথায় যাচ্ছে।',
    'landing.stat.expensesTracked': 'খরচের হিসাব',
    'landing.stat.universities': 'বিশ্ববিদ্যালয়',
    'landing.stat.free': 'ফ্রি',
    'landing.stat.forStudents': 'শিক্ষার্থীদের জন্য',

    'cat.semesterFees': 'সেমিস্টার ফি',
    'cat.transport': 'পরিবহন',
    'cat.housing': 'আবাসন',
    'cat.food': 'খাবার',
    'cat.studyMaterials': 'পাঠ্যসামগ্রী',

    'landing.mobileTagline': 'শিক্ষার্থীদের জন্য স্মার্ট খরচ ট্র্যাকিং',

    'auth.getStarted': 'শুরু করুন',
    'auth.signInOrCreate': 'সাইন ইন করুন বা অ্যাকাউন্ট তৈরি করুন',
    'auth.continueWithApple': 'অ্যাপল দিয়ে চালিয়ে যান',
    'auth.continueWithPhone': 'ফোন দিয়ে চালিয়ে যান',
    'auth.or': 'অথবা',
    'auth.emailPlaceholder': 'ইমেইল ঠিকানা',
    'auth.continueWithEmail': 'ইমেইল দিয়ে চালিয়ে যান',
    'auth.sendingCode': 'কোড পাঠানো হচ্ছে...',
    'auth.signingIn': 'সাইন ইন হচ্ছে...',
    'auth.codeHint': 'আমরা ৬-সংখ্যার ভেরিফিকেশন কোড পাঠাবো',
    'auth.emailFallbackToDemo': 'ইমেইল সার্ভিস পাওয়া যাচ্ছে না — ডেমো মোডে চলে যাচ্ছে। 482913 কোড ব্যবহার করুন।',
    'otp.demoTitle': 'ডেমো মোড',
    'otp.demoBody': 'আসল কোনো ইমেইল পাঠানো হয়নি। চালিয়ে যেতে 482913 কোড ব্যবহার করুন।',

    'lang.switchTo': 'ভাষা পরিবর্তন',
    'lang.english': 'English',
    'lang.bangla': 'বাংলা',

    'phoneAuth.title': 'ফোন নম্বর দিয়ে সাইন ইন',
    'phoneAuth.titleVerify': 'ভেরিফিকেশন কোড লিখুন',
    'phoneAuth.hint': 'আমরা SMS-এ ৬-সংখ্যার কোড পাঠাবো',
    'phoneAuth.sentTo': 'পাঠানো হয়েছে',
    'phoneAuth.phonePlaceholder': '১XXXXXXXXX',
    'phoneAuth.send': 'ভেরিফিকেশন কোড পাঠান',
    'phoneAuth.codePlaceholder': '৬-সংখ্যার কোড',
    'phoneAuth.verifying': 'যাচাই হচ্ছে...',
    'phoneAuth.verify': 'যাচাই করে সাইন ইন',
    'phoneAuth.differentNumber': '← অন্য নম্বর ব্যবহার করুন',
    'phoneAuth.backToOptions': 'সাইন-ইন অপশনে ফিরে যান',
    'phoneAuth.invalidPhone': 'একটি বৈধ ফোন নম্বর লিখুন',
    'phoneAuth.invalidCode': '৬-সংখ্যার কোড লিখুন',
    'phoneAuth.codeSent': 'SMS-এ কোড পাঠানো হয়েছে',
    'phoneAuth.signedIn': 'সাইন ইন হয়েছে!',
    'phoneAuth.demoTitle': 'ডেমো মোড',
    'phoneAuth.demoBody': 'আসল SMS পাঠানো হবে না। চালিয়ে যেতে 482913 কোড ব্যবহার করুন। আসল ফোন OTP চালু করতে Firebase সেটআপ করুন।',
    'phoneAuth.fallbackToDemo': 'এই Firebase প্ল্যানে আসল SMS পাওয়া যাচ্ছে না — ডেমো মোডে চলে যাচ্ছে। 482913 কোড ব্যবহার করুন।',
  },
};

export function useT() {
  const { language = 'en', setLanguage, toggleLanguage } = useApp();
  const t = (key) => {
    const dict = STRINGS[language] || STRINGS.en;
    return dict[key] ?? STRINGS.en[key] ?? key;
  };
  return { t, lang: language, setLang: setLanguage, toggleLang: toggleLanguage };
}
