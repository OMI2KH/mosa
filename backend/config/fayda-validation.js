// 📁 config/fayda-validation.js
export const FaydaConfig = {
  validation: {
    apiEndpoint: 'https://api.fayda.gov.et/validate',
    timeout: 10000,
    retryAttempts: 3
  },
  duplicateCheck: {
    enabled: true,
    cacheDuration: 3600000, // 1 hour
    aiDetection: true
  },
  errorMessages: {
    duplicate: 'Fayda ID already exists in our system',
    invalid: 'Invalid Fayda ID provided',
    network: 'Unable to verify Fayda ID. Please try again.'
  }
};

// 📁 config/training-limits.js
export const TrainingConfig = {
  sessionLimits: {
    maxConcurrentStudents: 5,
    maxTotalStudents: 10000,
    maxSessionDuration: 4, // months
    minRatingDays: 30
  },
  enrollment: {
    singleExpert: true,
    cancellationAllowed: true, // before course start
    courseStartIrreversible: true
  }
};

// 📁 config/payment-distribution.js
export const PaymentConfig = {
  bundlePrice: 1999,
  distribution: {
    expertUpfront: 0.5, // 50% on course start
    platformRevenue: 0.5, // 50% if not completed
    expiryDays: 150 // 5 months
  },
  processing: {
    methods: ['telebirr', 'cbebirr'],
    timeout: 300000, // 5 minutes
    retryAttempts: 3
  }
};

// 📁 config/session-management.js
export const SessionConfig = {
  capacity: {
    maxStudentsPerSession: 5,
    maxSessionsPerExpert: 2000, // 5 students × 2000 sessions = 10,000
    checkInRequired: true
  },
  attendance: {
    verificationRequired: true,
    autoExpire: true,
    expiryDays: 120 // 4 months
  }
};