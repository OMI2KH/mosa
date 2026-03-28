import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';

// Comprehensive translation resources for Mosa ecosystem
const resources = {
  en: {
    translation: {
      // Basic App
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
      
      // Survey & Onboarding
      survey_title: 'Forge Your Path',
      survey_religion: 'What lights your eternal fire?',
      skills: 'Your Skills (e.g., trading, crafting)',
      passions: 'Your Passions (e.g., art, hustle)',
      submit_survey: 'Forge My Archetype',
      survey_failed: 'Survey failed',
      fill_skills_passions: 'Please fill in both skills and passions',
      location_permission_needed: 'Location permission needed for tribe matching',
      archetype_forged: 'Your wealth-building archetype has been forged!',
      awaiting_forge: 'Awakening the forge...',
      
      // Navigation & Sections
      tribe_dashboard: 'Tribe Dashboard',
      lessons: 'Lessons',
      to_dos: 'To-Dos',
      profile: 'Profile',
      download: 'Download Content',
      
      // Gamification & XP System
      xp: 'XP',
      level: 'Level',
      streak: 'Streak',
      achievements: 'Achievements',
      skills_tree: 'Skill Tree',
      venture_unlocked: 'Venture Unlocked!',
      xp_earned: '{{xp}} XP Earned!',
      level_up: 'Level Up!',
      daily_streak: '{{days}} Day Streak',
      complete_lesson: 'Complete Lesson',
      lesson_completed: 'Lesson Completed!',
      skill_mastered: 'Skill Mastered!',
      
      // Wealth & Money
      subscribe_49_etb: 'Subscribe (49 ETB/month)',
      upgrade_level: 'Upgrade Level',
      make_etb_100: 'Make ETB 100',
      make_etb_1000: 'Make ETB 1000', 
      make_etb_10000: 'Make ETB 10000',
      wealth_preservation: 'Wealth Preservation',
      wealth_multiplication: 'Wealth Multiplication',
      emergency_fund: 'Emergency Fund',
      passive_income: 'Passive Income',
      investment_basics: 'Investment Basics',
      
      // Skills & Services
      carpentry: 'Carpentry',
      plumbing: 'Plumbing',
      painting: 'Painting',
      electrical: 'Electrical Work',
      furniture_making: 'Furniture Making',
      digital_marketing: 'Digital Marketing',
      freelancing: 'Freelancing',
      forex_trading: 'Forex Trading',
      
      // Ventures
      mosa: 'Mosa',
      yachi: 'Yachi Marketplace',
      chereka: 'Chereka Creative',
      sifr: 'Sifr Tech',
      azmera: 'Azmera Relationships',
      chico: 'Chico Investments',
      venture_locked: 'Venture Locked',
      venture_progress: '{{completed}}/{{total}} to unlock',
      
      // Tribe & Social
      schedule_prayers: 'Schedule Prayers',
      prayer_scheduled: 'Faith fuels the flame.',
      aura_christened: "Your tribe's aura: ",
      velvet_truth: 'You know this: ',
      fan_fire_today: 'Fan your fire today.',
      tribe_level: 'Tribe Level',
      tribe_members: 'Tribe Members',
      tribe_xp: 'Tribe XP',
      create_group_todo: 'Create Group Challenge',
      tribe_challenge: 'Tribe Challenge',
      collective_wealth: 'Collective Wealth',
      
      // Notifications & Alerts
      success: 'Success',
      error: 'Error',
      fill_all_fields: 'Please fill all fields',
      fill_required_fields: 'Please fill required fields',
      business_and_proof_required: 'Business name and proof required',
      subscription_failed: 'Subscription failed',
      prayer_schedule_failed: 'Prayer schedule failed',
      todo_creation_failed: 'Task creation failed',
      todo_completion_failed: 'Task completion failed',
      upgrade_failed: 'Upgrade failed',
      failed_fetch_tribe: 'Failed to fetch tribe data',
      
      // Motivational & Cultural
      tiktok_spotlight: 'Viral forge ignited!',
      task_forged: 'Task forged in fire.',
      downloaded: 'Downloaded',
      content_saved_to_forge_journal: 'Content saved to forge journal.',
      awaiting_aura: 'Awaiting tribe aura...',
      free_upgrade: 'Free - Upgrade to unlock Forge',
      personal_spark: 'Personal Spark',
      group_ritual: 'Group Ritual',
      todays_prayers: "Today's Prayers",
      forge_whisper: 'Forge Whisper',
      
      // New Gamified Elements
      start_learning: 'Start Learning',
      continue_learning: 'Continue Learning',
      skill_progress: 'Skill Progress',
      venture_progression: 'Venture Progression',
      unlock_yachi: 'Unlock Yachi Marketplace',
      complete_5_lessons: 'Complete 5 lessons to unlock',
      earn_xp: 'Earn XP',
      maintain_streak: 'Maintain Streak',
      daily_goal: 'Daily Goal',
      weekly_challenge: 'Weekly Challenge',
      monthly_target: 'Monthly Target',
      wealth_building: 'Wealth Building',
      practical_skills: 'Practical Skills',
      digital_skills: 'Digital Skills',
      trading_skills: 'Trading Skills',
      
      // Archetypes
      preserver_ember: 'Preserver Ember',
      multiplier_flame: 'Multiplier Flame', 
      creator_spark: 'Creator Spark',
      archetype_description_preserver: 'You value security and steady growth',
      archetype_description_multiplier: 'You seek growth and opportunity',
      archetype_description_creator: 'You are hands-on and innovative',
      
      // Task Categories
      money_task: 'Money Task',
      skill_practice: 'Skill Practice',
      trading_research: 'Trading Research',
      learning_activity: 'Learning Activity',
      
      // Time & Duration
      due: 'Due',
      completed: 'Completed',
      overdue: 'Overdue',
      due_today: 'Due Today',
      estimated_time: 'Estimated Time',
      time_commitment: 'Time Commitment',
      
      // Priority Levels
      priority: 'Priority',
      priority_low: 'Low',
      priority_medium: 'Medium', 
      priority_high: 'High',
      priority_urgent: 'Urgent',
      
      // Error States
      no_internet: 'No internet connection',
      try_again: 'Please try again',
      loading: 'Loading...',
      no_data: 'No data available',
      no_lessons: 'No lessons available',
      no_tasks: 'No tasks available',
      no_achievements: 'No achievements yet',
    }
  },
  am: {
    translation: {
      // Basic App
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
      
      // Survey & Onboarding
      survey_title: 'መንገድህን መፍጠር',
      survey_religion: 'ዘላለም እሳትህን የሚያቀጣጥላል ምንድን ነው?',
      skills: 'ክህሎቶችህ (ለምሳሌ፡ ንግድ፣ የእጅ ሥራ)',
      passions: 'ፍላጎቶችህ (ለምሳሌ፡ ጥበብ፣ ሥራ)',
      submit_survey: 'አርኬታይፕዬን መፍጠር',
      survey_failed: 'የመጠይቅ ስህተት',
      fill_skills_passions: 'እባክዎ ክህሎቶችዎን እና ፍላጎቶችዎን ያስገቡ',
      location_permission_needed: 'የጎሳ መጣጣም ለማግኘት የቦታ ፈቃድ ያስፈልጋል',
      archetype_forged: 'የገንዘብ መገንባት አርኬታይፕህ ተፈጥሯል!',
      awaiting_forge: 'ፎርጁ እየተቀጣጠለ ነው...',
      
      // Navigation & Sections
      tribe_dashboard: 'የጎሳ ዳሽቦርድ',
      lessons: 'ትምህርቶች',
      to_dos: 'የሚደረጉ ተግባራት',
      profile: 'መገለጫ',
      download: 'ይዘት አውርድ',
      
      // Gamification & XP System
      xp: 'ኤክስፒ',
      level: 'ደረጃ',
      streak: 'ተከታታይ ቀናት',
      achievements: 'ውጤቶች',
      skills_tree: 'የክህሎት ዛፍ',
      venture_unlocked: 'ፈጠራ ተከፍቷል!',
      xp_earned: '{{xp}} ኤክስፒ ተጨምሯል!',
      level_up: 'ደረጃ ከፍ ብሏል!',
      daily_streak: '{{days}} ቀን ተከታታይ',
      complete_lesson: 'ትምህርት አጠናቅቅ',
      lesson_completed: 'ትምህርት ተጠናቅቋል!',
      skill_mastered: 'ክህሎት ተቆጣጠረ!',
      
      // Wealth & Money
      subscribe_49_etb: 'መመዝገብ (49 ብር/ወር)',
      upgrade_level: 'ደረጃ ከፍታ',
      make_etb_100: '100 ብር አስገኝ',
      make_etb_1000: '1000 ብር አስገኝ',
      make_etb_10000: '10000 ብር አስገኝ',
      wealth_preservation: 'ገንዘብ ጠብቆ መቆየት',
      wealth_multiplication: 'ገንዘብ ማባዛት',
      emergency_fund: 'አደጋ ጊዜ ፈንድ',
      passive_income: 'ተጨማሪ ገቢ',
      investment_basics: 'የኢንቨስትመንት መሰረታዊዎች',
      
      // Skills & Services
      carpentry: 'የእንጨት ሥራ',
      plumbing: 'የመንጃ ሥራ',
      painting: 'የቀለም ሥራ',
      electrical: 'የኤሌክትሪክ ሥራ',
      furniture_making: 'የዕቃ ሥራ',
      digital_marketing: 'ዲጂታል ማርኬቲንግ',
      freelancing: 'ፍሪላንሲንግ',
      forex_trading: 'ፎሬክስ ንግድ',
      
      // Ventures
      mosa: 'ሞሳ',
      yachi: 'ያቺ ገበያ',
      chereka: 'ቸሬካ ክሬቲቭ',
      sifr: 'ሲፍር ቴክ',
      azmera: 'አዝመራ ሬላቲንግ',
      chico: 'ቺኮ ኢንቨስትመንት',
      venture_locked: 'ፈጠራ ተቆልፏል',
      venture_progress: 'ለመክፈት {{completed}}/{{total}}',
      
      // Tribe & Social
      schedule_prayers: 'ጸሎቶችን መርሐግብር አስያዝ',
      prayer_scheduled: 'እምነት እሳቱን ያቀጣጥላል።',
      aura_christened: 'የጎሳህ ኦራ: ',
      velvet_truth: 'ይህን እውነት ታውቃለህ: ',
      fan_fire_today: 'ዛሬ እሳትህን አቀጣጥል።',
      tribe_level: 'የጎሳ ደረጃ',
      tribe_members: 'የጎሳ አባላት',
      tribe_xp: 'የጎሳ ኤክስፒ',
      create_group_todo: 'የቡድን ተግባር ፍጠር',
      tribe_challenge: 'የጎሳ ፈተና',
      collective_wealth: 'የቡድን ሀብት',
      
      // Notifications & Alerts
      success: 'ስኬት',
      error: 'ስህተት',
      fill_all_fields: 'እባክዎ ሁሉንም መስኮች ይሙሉ',
      fill_required_fields: 'እባክዎ አስፈላጊ መስኮችን ይሙሉ',
      business_and_proof_required: 'የንግድ ስም እና ማስረጃ ያስፈልጋል',
      subscription_failed: 'መመዝገብ አልተሳካም',
      prayer_schedule_failed: 'የጸሎት መርሐግብር አልተሳካም',
      todo_creation_failed: 'ተግባር መፍጠር አልተሳካም',
      todo_completion_failed: 'ተግባር ማጠናቀቅ አልተሳካም',
      upgrade_failed: 'ደረጃ ማሳደግ አልተሳካም',
      failed_fetch_tribe: 'የጎሳ መረጃ ማግኘት አልተሳካም',
      
      // Motivational & Cultural
      tiktok_spotlight: 'ቫይራል ፎርጅ ተቀጣጥሏል!',
      task_forged: 'ተግባር በእሳት ተፈጥሯል።',
      downloaded: 'ተወርዷል',
      content_saved_to_forge_journal: 'ይዘቱ በፎርጅ ጆርናል ተቀምጧል።',
      awaiting_aura: 'የጎሳ ኦራ በመጠበቅ ላይ...',
      free_upgrade: 'ነፃ - ፎርጅ ለመክፈት ከፍ አድርግ',
      personal_spark: 'የግል እሳት',
      group_ritual: 'የቡድን ሥርዓት',
      todays_prayers: 'የዛሬ ጸሎቶች',
      forge_whisper: 'የፎርጅ ምስጢራዊ ድምፅ',
      
      // New Gamified Elements
      start_learning: 'መማር ጀምር',
      continue_learning: 'መማር ቀጠል',
      skill_progress: 'የክህሎት እድገት',
      venture_progression: 'የፈጠራ እድገት',
      unlock_yachi: 'ያቺ ገበያ ክፈት',
      complete_5_lessons: 'ለመክፈት 5 ትምህርቶች አጠናቅቅ',
      earn_xp: 'ኤክስፒ አግኝ',
      maintain_streak: 'ተከታታይነት ጠብቅ',
      daily_goal: 'ዕለታዊ ግብ',
      weekly_challenge: 'ሳምንታዊ ፈተና',
      monthly_target: 'ወርሃዊ አላማ',
      wealth_building: 'ገንዘብ መገንባት',
      practical_skills: 'ተግባራዊ ክህሎቶች',
      digital_skills: 'ዲጂታል ክህሎቶች',
      trading_skills: 'የንግድ ክህሎቶች',
      
      // Archetypes
      preserver_ember: 'ጠባቂ እሳት',
      multiplier_flame: 'ማባዣ እሳት',
      creator_spark: 'ፈጣሪ እሳት',
      archetype_description_preserver: 'ደህንነት እና ወጥ እድገት ይጠቅምዎታል',
      archetype_description_multiplier: 'እድገት እና እድል ይፈልጋሉ',
      archetype_description_creator: 'ተግባራዊ እና ፈጣሪ ነዎት',
      
      // Task Categories
      money_task: 'የገንዘብ ተግባር',
      skill_practice: 'የክህሎት ልምምድ',
      trading_research: 'የንግድ ምርምር',
      learning_activity: 'የመማር እንቅስቃሴ',
      
      // Time & Duration
      due: 'የሚያልቅ',
      completed: 'ተጠናቅቋል',
      overdue: 'በጊዜ አልተጠናቀቀም',
      due_today: 'ዛሬ የሚያልቅ',
      estimated_time: 'የሚጠበቀ ጊዜ',
      time_commitment: 'የጊዜ ቁርጠኝነት',
      
      // Priority Levels
      priority: 'ቅድሚያ',
      priority_low: 'ዝቅተኛ',
      priority_medium: 'መካከለኛ',
      priority_high: 'ከፍተኛ',
      priority_urgent: 'አስቸኳይ',
      
      // Error States
      no_internet: 'የኢንተርኔት ግንኙነት የለም',
      try_again: 'እባክዎ እንደገና ይሞክሩ',
      loading: 'በመጫን ላይ...',
      no_data: 'ምንም መረጃ የለም',
      no_lessons: 'ምንም ትምህርቶች የሉም',
      no_tasks: 'ምንም ተግባራት የሉም',
      no_achievements: 'እስካሁን ምንም ውጤቶች የሉም',
    }
  }
};

// Initialize i18n with enhanced configuration
i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: Localization.locale.split('-')[0], // Auto-detect device language
    fallbackLng: 'en',
    
    // Enhanced interpolation for dynamic values
    interpolation: {
      escapeValue: false, // React already safes from XSS
      format: (value, format, lng) => {
        if (format === 'currency') {
          return `${value} ETB`;
        }
        if (format === 'uppercase') {
          return value.toUpperCase();
        }
        if (format === 'capitalize') {
          return value.charAt(0).toUpperCase() + value.slice(1);
        }
        return value;
      }
    },
    
    // Better detection options
    detection: {
      order: ['localStorage', 'navigator', 'htmlTag'],
      caches: ['localStorage']
    },
    
    // React i18next special options
    react: {
      useSuspense: false, // For better Expo compatibility
      bindI18n: 'languageChanged loaded',
      bindI18nStore: '',
      transEmptyNodeValue: '',
      transSupportBasicHtmlNodes: true,
      transKeepBasicHtmlNodesFor: ['br', 'strong', 'i', 'p']
    }
  });

// Enhanced language management utilities
export const languageUtils = {
  // Change language with persistence
  changeLanguage: async (lang) => {
    try {
      await i18n.changeLanguage(lang);
      // You could add AsyncStorage persistence here
      return true;
    } catch (error) {
      console.error('Language change failed:', error);
      return false;
    }
  },

  // Get current language
  getCurrentLanguage: () => i18n.language,

  // Get available languages
  getAvailableLanguages: () => Object.keys(resources),

  // Get language name for display
  getLanguageName: (code) => {
    const names = {
      en: 'English',
      am: 'አማርኛ'
    };
    return names[code] || code;
  },

  // Check if language is RTL
  isRTL: (lang = i18n.language) => {
    return lang === 'am'; // Amharic is RTL
  },

  // Format numbers based on locale
  formatNumber: (number, options = {}) => {
    return new Intl.NumberFormat(i18n.language, options).format(number);
  },

  // Format currency (ETB)
  formatCurrency: (amount) => {
    return i18n.t('{{value, currency}}', { value: amount });
  },

  // Format date based on locale
  formatDate: (date, options = {}) => {
    return new Intl.DateTimeFormat(i18n.language, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      ...options
    }).format(new Date(date));
  }
};

// Custom hooks for common translation patterns
export const useGamificationTranslations = () => {
  return {
    xp: (amount) => i18n.t('{{amount}} XP', { amount }),
    level: (number) => i18n.t('Level {{number}}', { number }),
    streak: (days) => i18n.t('{{days}} Day Streak', { days }),
    progress: (current, total) => i18n.t('{{current}}/{{total}}', { current, total })
  };
};

export const useVentureTranslations = () => {
  return {
    venture: (name) => i18n.t(name.toLowerCase()),
    ventureProgress: (completed, total) => 
      i18n.t('venture_progress', { completed, total }),
    ventureLocked: () => i18n.t('venture_locked')
  };
};

// Export the enhanced i18n instance
export default i18n;