import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

const resources = {
  en: {
    translation: {
      welcome: 'Welcome to Mosa Forge',
      login: 'Login',
      register: 'Register',
      email: 'Email',
      password: 'Password',
      name: 'Name',
      referral_code: 'Referral Code (Optional)',
      back_to_login: 'Back to Login',
      login_failed: 'Login failed',
      register_failed: 'Register failed',
      survey_title: 'Forge Your Path',
      survey_religion: 'What lights your eternal fire?',
      skills: 'Your Skills (e.g., trading, crafting)',
      passions: 'Your Passions (e.g., art, hustle)',
      risk_tolerance: 'Risk Tolerance',
      submit_survey: 'Forge My Archetype',
      survey_failed: 'Survey submission failed',
      success: 'Success',
      tribe_dashboard: 'Tribe Dashboard',
      lessons: 'Lessons',
      profile: 'Profile',
      subscribe_49_etb: 'Subscribe (49 ETB/month)',
      schedule_prayers: 'Schedule Prayers',
      prayer_scheduled: 'Faith fuels the flame.',
      aura_christened: 'Your tribe\'s aura: ',
      velvet_truth: 'You know this: ',
      level_up: 'Aura ascends to ',
      tiktok_spotlight: 'Viral forge ignited! #MosaForge',
      download: 'Download Content',
      upgrade_level: 'Upgrade Tribe Level',
      business_name: 'Business Name (e.g., Tribe Teff Co)',
      proof: 'Proof (e.g., photo URL or description)'
    }
  },
  am: {
    translation: {
      welcome: 'ወደ Mosa Forge እንኳን ደህና መጡ',
      login: 'መግባት',
      register: 'መመዝገብ',
      email: 'ኢሜይል',
      password: 'የይለፍ ቃል',
      name: 'ስም',
      referral_code: 'ሪፈራል ኮድ (አማራጭ)',
      back_to_login: 'ወደ መግቢያ ተመለስ',
      login_failed: 'መግባት አልተሳካም',
      register_failed: 'መመዝገብ አልተሳካም',
      survey_title: 'መንገድህን መፍጠር',
      survey_religion: 'ዘላለም እሳትህን የሚያቀጣጣል ምንድን ነው?',
      skills: 'ክህሎቶችህ (ለምሳሌ፡ ንግድ፣ የእጅ ሥራ)',
      passions: 'ፍላጎቶችህ (ለምሳሌ፡ ጥበብ፣ ሥራ)',
      risk_tolerance: 'የአደጋ መቻቻል',
      submit_survey: 'አርኬታይፕዬን መፍጠር',
      survey_failed: 'የመጠይቅ ስህተት',
      success: 'ስኬት',
      tribe_dashboard: 'የጎሳ ዳሽቦርድ',
      lessons: 'ትምህርቶች',
      profile: 'መገለጫ',
      subscribe_49_etb: 'መመዝገብ (49 ብር/ወር)',
      schedule_prayers: 'ጸሎቶችን መርሐግብር አስያዝ',
      prayer_scheduled: 'እምነት እሳቱን ያቀጣጥላል።',
      aura_christened: 'የጎሳህ ኦራ: ',
      velvet_truth: 'ይህን እውነት ታውቃለህ: ',
      level_up: 'ኦራ ወደ ',
      tiktok_spotlight: 'ቫይራል ፎርጅ ተቀጣጥሏል! #MosaForge',
      download: 'ይዘት አውርድ',
      upgrade_level: 'የጎሳ ደረጃ ከፍታፍል',
      business_name: 'የንግድ ስም (ለምሳሌ፡ ጎሳ ተፍ ኮ)',
      proof: 'ማረጋገጫ (ለምሳሌ፡ ፎቶ URL ወይም መግለጫ)'
    }
  }
};

i18n.use(initReactI18next).init({
  resources,
  lng: 'am', // Default to Amharic
  fallbackLng: 'en',
  interpolation: {
    escapeValue: false
  }
});

export default i18n;