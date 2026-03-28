// 📁 services/revenue-split-manager.js - SIMPLIFIED
export class RevenueSplitManager {
  constructor() {
    this.bundlePrice = 1999;
    this.mosaShare = 1000;
    this.expertShare = 999;
    // ❌ NO MONTHLY FEE - REMOVED
  }

  async processBundlePayment(studentId, expertId) {
    const payment = await Payment.create({
      studentId,
      expertId,
      amount: this.bundlePrice,
      mosaRevenue: this.mosaShare,
      expertRevenue: this.expertShare,
      status: 'processing'
    });

    // Simple revenue allocation
    await MosaRevenue.create({
      studentId,
      expertId,
      amount: this.mosaShare,
      type: 'bundle_share'
    });

    await ExpertRevenue.create({
      expertId,
      studentId, 
      potentialAmount: this.expertShare,
      allocatedAmount: 0,
      status: 'pending_payout'
    });

    return payment;
  }

  async scheduleExpertPayouts(expertId, studentId) {
    // Clean 333/333/333 payout schedule
    const payouts = [
      { type: 'upfront', amount: 333, trigger: 'course_started' },
      { type: 'milestone', amount: 333, trigger: '75_percent_completion' },
      { type: 'completion', amount: 333, trigger: 'certification' }
    ];

    for (const payout of payouts) {
      await ExpertPayoutSchedule.create({
        expertId,
        studentId,
        ...payout,
        status: 'pending'
      });
    }
  }
}

// 📁 services/expert-earnings-calculator.js - SIMPLIFIED
export class ExpertEarningsCalculator {
  // ❌ NO FEE CALCULATIONS - REMOVED
  
  async calculateExpertEarnings(expertId) {
    const grossEarnings = await ExpertRevenue.getTotal(expertId);
    
    // SIMPLIFIED: Gross = Net (no fees)
    return {
      grossEarnings,
      netEarnings: grossEarnings, // ❌ NO FEE DEDUCTION
      totalStudents: await this.getStudentCount(expertId),
      averagePerStudent: 999
    };
  }
}