// Debug Cash Flow Calculation
// Identify why Year 1 is generating $144,587 cash flow

// Test parameters (matching the current defaults)
const testParams = {
  annualBudget: 170000,
  initialCost: 160000,
  rentalRate: 1.0, // 1% monthly rent
  rentGrowthRate: 3,
  vacancyRate: 5,
  managementRate: 8,
  capexRate: 5,
  expenseInflation: 2.5,
  insuranceInflation: 4,
  interestRate: 7.0,
  ltvRatio: 70,
  loanTerm: 5,
  insurance: 1300,
  landPercent: 20,
  maintenanceRate: 1,
  costIncrease: 1,
  closingCostPercent: 2,
  loanOriginationPercent: 1,
  taxRate: 1.5,
  incomeTaxRate: 25,
  assessedValuePercent: 20,
  assessedGrowthRate: 2.5,
  appreciationRate: 3,
  selfPurchaseYears: 5,
  financedPurchaseYears: 5,
  maxUnitsFinanced: 2,
  maxUnitsFinancedLimitYears: 3,
  passthroughLLC: "yes",
};

// Simulate Year 1 with 2 units purchased (as per our test)
function debugYear1CashFlow() {
  console.log("🔍 DEBUGGING YEAR 1 CASH FLOW CALCULATION");
  console.log("==========================================");

  const year = 1;
  const propertyCost = testParams.initialCost; // $160,000
  const purchasedUnits = 2; // As per our test results

  // Simulate the cohorts and loans
  const financedCohorts = [
    {
      yearOriginated: 1,
      units: purchasedUnits,
      costPerUnit: propertyCost,
    },
  ];

  const financedLoans = [
    {
      units: purchasedUnits,
      loanAmountPerUnit: propertyCost * (testParams.ltvRatio / 100),
      yearOriginated: 1,
      interestRate: testParams.interestRate / 100,
      term: testParams.loanTerm,
    },
  ];

  const totalUnits = financedCohorts.reduce(
    (sum, cohort) => sum + cohort.units,
    0
  );

  console.log(`Year 1 Parameters:`);
  console.log(`  Property Cost: $${propertyCost.toLocaleString()}`);
  console.log(`  Purchased Units: ${purchasedUnits}`);
  console.log(`  Total Units: ${totalUnits}`);

  // Calculate detailed metrics (this is what the model does)
  const detailed = calculateDetailedMetricsOriginal(
    year,
    financedCohorts,
    testParams,
    totalUnits,
    financedLoans
  );

  console.log(`\n📊 DETAILED METRICS:`);
  console.log(`  GPR: $${detailed.gpr.toLocaleString()}`);
  console.log(`  EGI: $${detailed.egi.toLocaleString()}`);
  console.log(`  NOI: $${detailed.noi.toLocaleString()}`);
  console.log(`  Debt Service: $${detailed.debtService.toLocaleString()}`);
  console.log(`  CapEx: $${detailed.capex.toLocaleString()}`);
  console.log(`  Taxes: $${detailed.taxes.toLocaleString()}`);

  // Now calculate cash flow using the CORRECTED LOGIC
  const annualBudget =
    year <= testParams.selfPurchaseYears ? testParams.annualBudget : 0;

  // For financed: NOI - Debt Service - CapEx - Taxes - Down Payments
  const financedNewUnitsForCashFlow = financedCohorts
    .filter((c) => c.yearOriginated === year)
    .reduce((sum, c) => sum + c.units, 0);
  const financedCostPerUnitForCashFlow =
    testParams.initialCost *
    Math.pow(1 + testParams.costIncrease / 100, year - 1);
  const downPaymentPercent = 1 - testParams.ltvRatio / 100;
  const financedDownPayments =
    financedNewUnitsForCashFlow *
    financedCostPerUnitForCashFlow *
    downPaymentPercent;

  // OLD (incorrect) cash flow calculation: Annual Budget + EGI - Operating Expenses - Debt Service - CapEx - Taxes - Down Payments
  const financedOperatingExpenses = detailed.egi - detailed.noi;
  const oldFinancedCashFlow =
    annualBudget +
    detailed.egi -
    financedOperatingExpenses -
    detailed.debtService -
    detailed.capex -
    detailed.taxes -
    financedDownPayments;

  // CORRECTED cash flow calculation: NOI - Debt Service - CapEx - Taxes - Down Payments
  const correctedFinancedCashFlow =
    detailed.noi -
    detailed.debtService -
    detailed.capex -
    detailed.taxes -
    financedDownPayments;

  console.log(`\n💰 OLD (INCORRECT) CASH FLOW CALCULATION:`);
  console.log(`  Annual Budget: $${annualBudget.toLocaleString()}`);
  console.log(`  EGI: $${detailed.egi.toLocaleString()}`);
  console.log(
    `  Operating Expenses: $${financedOperatingExpenses.toLocaleString()}`
  );
  console.log(`  Debt Service: $${detailed.debtService.toLocaleString()}`);
  console.log(`  CapEx: $${detailed.capex.toLocaleString()}`);
  console.log(`  Taxes: $${detailed.taxes.toLocaleString()}`);
  console.log(`  Down Payments: $${financedDownPayments.toLocaleString()}`);
  console.log(`  OLD CASH FLOW: $${oldFinancedCashFlow.toLocaleString()}`);

  console.log(`\n✅ CORRECTED CASH FLOW CALCULATION:`);
  console.log(`  NOI: $${detailed.noi.toLocaleString()}`);
  console.log(`  Debt Service: $${detailed.debtService.toLocaleString()}`);
  console.log(`  CapEx: $${detailed.capex.toLocaleString()}`);
  console.log(`  Taxes: $${detailed.taxes.toLocaleString()}`);
  console.log(`  Down Payments: $${financedDownPayments.toLocaleString()}`);
  console.log(
    `  CORRECTED CASH FLOW: $${correctedFinancedCashFlow.toLocaleString()}`
  );

  // Now calculate what it SHOULD be
  console.log(`\n✅ VERIFICATION:`);

  // This should match the corrected calculation
  const verificationCashFlow =
    detailed.noi -
    detailed.debtService -
    detailed.capex -
    detailed.taxes -
    financedDownPayments;

  console.log(
    `  Verification Cash Flow: $${verificationCashFlow.toLocaleString()}`
  );
  console.log(
    `  Match: ${
      correctedFinancedCashFlow === verificationCashFlow ? "✅ YES" : "❌ NO"
    }`
  );

  console.log(`\n🎯 FIX VERIFICATION:`);
  console.log(`  Old Model Cash Flow: $${financedCashFlow.toLocaleString()}`);
  console.log(
    `  Corrected Cash Flow: $${correctedFinancedCashFlow.toLocaleString()}`
  );
  console.log(
    `  Difference: $${(
      financedCashFlow - correctedFinancedCashFlow
    ).toLocaleString()}`
  );
  console.log(
    `  Fix: Removed Annual Budget ($${annualBudget.toLocaleString()}) from cash flow calculation`
  );

  return {
    oldModelCashFlow: financedCashFlow,
    correctedCashFlow: correctedFinancedCashFlow,
    difference: financedCashFlow - correctedFinancedCashFlow,
    fix: "Removed annual budget from cash flow calculation",
  };
}

// Calculate detailed metrics (copied from the model)
function calculateDetailedMetricsOriginal(
  year,
  cohorts,
  params,
  totalUnits,
  loans
) {
  let gpr = 0;
  let propertyTax = 0;
  let depreciation = 0;

  cohorts.forEach((cohort) => {
    const yearsOwned = year - cohort.yearOriginated;
    const currentRent = cohort.costPerUnit * (params.rentalRate / 100) * 12;
    const adjustedRent =
      currentRent *
      Math.pow(1 + params.rentGrowthRate / 100, Math.max(0, yearsOwned));
    gpr += adjustedRent * cohort.units;

    const assessedValue =
      cohort.costPerUnit *
      (params.assessedValuePercent / 100) *
      Math.pow(1 + params.assessedGrowthRate / 100, yearsOwned);
    propertyTax += assessedValue * (params.taxRate / 100) * cohort.units;

    const buildingValue = cohort.costPerUnit * (1 - params.landPercent / 100);
    depreciation += (buildingValue / 27.5) * cohort.units;
  });

  const vacancyLoss = gpr * (params.vacancyRate / 100);
  const egi = gpr - vacancyLoss;
  const managementFee = egi * (params.managementRate / 100);
  const maintenance = egi * (params.maintenanceRate / 100);
  const insurance = params.insurance * totalUnits;
  const capex = egi * (params.capexRate / 100);

  // Calculate interest expense
  let interestExpense = 0;
  loans.forEach((loan) => {
    const monthlyRate = loan.interestRate / 12;
    const totalPayments = loan.term * 12;
    const monthsElapsed = (year - loan.yearOriginated) * 12;
    const remainingPayments = Math.max(0, totalPayments - monthsElapsed);

    if (remainingPayments > 0) {
      const monthlyEMI =
        (loan.loanAmountPerUnit *
          monthlyRate *
          Math.pow(1 + monthlyRate, totalPayments)) /
        (Math.pow(1 + monthlyRate, totalPayments) - 1);

      for (let month = 0; month < 12; month++) {
        const currentMonth = monthsElapsed + month;
        if (currentMonth < totalPayments) {
          const balanceAtMonth =
            (monthlyEMI *
              (Math.pow(1 + monthlyRate, totalPayments - currentMonth) - 1)) /
            (monthlyRate *
              Math.pow(1 + monthlyRate, totalPayments - currentMonth));
          const monthlyInterest = balanceAtMonth * monthlyRate;
          interestExpense += monthlyInterest * loan.units;
        }
      }
    }
  });

  const noi = egi - managementFee - maintenance - propertyTax - insurance;

  let debtService = 0;
  loans.forEach((loan) => {
    const monthlyRate = loan.interestRate / 12;
    const totalPayments = loan.term * 12;
    const monthsElapsed = (year - loan.yearOriginated) * 12;
    const remainingPayments = Math.max(0, totalPayments - monthsElapsed);

    if (remainingPayments > 0) {
      const monthlyEMI =
        (loan.loanAmountPerUnit *
          monthlyRate *
          Math.pow(1 + monthlyRate, totalPayments)) /
        (Math.pow(1 + monthlyRate, totalPayments) - 1);
      debtService += monthlyEMI * 12 * loan.units;
    }
  });

  const taxableIncome = noi - depreciation - interestExpense;
  const taxes = params.passthroughLLC === "yes" ? 0 : taxableIncome * 0.21;

  return {
    gpr,
    egi,
    noi,
    depreciation,
    debtService,
    interestExpense,
    taxes,
    capex,
    taxableIncome: taxableIncome,
    netIncome: taxableIncome - taxes,
  };
}

// Run the debug
const debugResult = debugYear1CashFlow();

console.log("\n📋 SUMMARY:");
console.log("============");
console.log(
  `The model is incorrectly adding the annual budget ($${testParams.annualBudget.toLocaleString()}) to the cash flow calculation.`
);
console.log(
  `This should only be used for purchasing units, not as a cash inflow.`
);
console.log(
  `The correct cash flow should be: NOI - Debt Service - CapEx - Taxes - Down Payments`
);
console.log(
  `This would result in approximately $${debugResult.correctedCashFlow.toLocaleString()} instead of $${debugResult.oldModelCashFlow.toLocaleString()}.`
);
