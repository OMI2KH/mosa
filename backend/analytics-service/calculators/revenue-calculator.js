// analytics-service/calculators/revenue-calculator.js

/**
 * 💰 Enterprise Revenue Calculator
 * Financial calculations and revenue analytics
 */

class RevenueCalculator {
  constructor() {
    this.bundlePrice = 1999; // ETB
    this.platformSplit = 1000; // ETB
    this.expertSplit = 999; // ETB
    this.payoutPhases = 3;
    this.payoutAmount = 333; // ETB per phase
  }

  calculateBundleRevenue(studentCount) {
    return studentCount * this.bundlePrice;
  }

  calculatePlatformRevenue(studentCount) {
    return studentCount * this.platformSplit;
  }

  calculateExpertRevenue(studentCount, bonusMultiplier = 1) {
    const baseRevenue = studentCount * this.expertSplit;
    return baseRevenue * bonusMultiplier;
  }

  calculatePayoutSchedule(studentCount, completionRate = 1) {
    const completedStudents = studentCount * completionRate;
    return {
      phase1: completedStudents * this.payoutAmount,
      phase2: completedStudents * this.payoutAmount,
      phase3: completedStudents * this.payoutAmount,
      total: completedStudents * this.expertSplit
    };
  }

  calculateQualityBonus(baseAmount, qualityScore, tier) {
    const tierMultipliers = {
      MASTER: 0.2,
      SENIOR: 0.1,
      STANDARD: 0,
      DEVELOPING: -0.1,
      PROBATION: -0.2
    };

    const multiplier = tierMultipliers[tier] || 0;
    return baseAmount * multiplier;
  }

  calculateNetRevenue(grossRevenue, expenses, taxes) {
    return grossRevenue - expenses - taxes;
  }

  calculateProfitMargin(grossRevenue, netRevenue) {
    return grossRevenue > 0 ? (netRevenue / grossRevenue) * 100 : 0;
  }
}

module.exports = {
  RevenueCalculator
};