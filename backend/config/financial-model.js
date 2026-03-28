// 📁 config/financial-model.js - SIMPLIFIED
export const FinancialModel = {
  // PER STUDENT ECONOMICS - CLEAN
  perStudent: {
    bundlePrice: 1999,
    mosaRevenue: 1000,      // 50.03%
    expertRevenue: 999,     // 49.97%
  },

  // EXPERT ECONOMICS - SIMPLIFIED
  expert: {
    potentialPerStudent: 999,
    payoutSchedule: [333, 333, 333],
    netPerStudent: 999,     // ❌ NO FEES - Gross = Net
  },

  // PLATFORM ECONOMICS - CLEAN  
  platform: {
    revenuePerStudent: 1000,
    // ❌ NO SUBSCRIPTION REVENUE - REMOVED
  },

  // PROJECTIONS - SIMPLIFIED
  projections: {
    year1: {
      students: 10000,
      bundleRevenue: 19990000,  // ~20M ETB
      mosaRevenue: 10000000,    // ~10M ETB
      expertEarnings: 9990000,  // ~10M ETB
      // ❌ NO SUBSCRIPTION REVENUE - REMOVED
    }
  }
};