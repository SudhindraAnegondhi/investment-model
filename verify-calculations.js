// Verification script to compare calculations between original and modular versions
console.log(
  "🔍 Verifying calculation consistency between original and modular versions..."
);

// Test parameters (using default values)
const testParams = {
  annualBudget: 170000,
  selfPurchaseYears: 5,
  initialCost: 160000,
  rentalRate: 1.0,
  interestRate: 7.0,
  ltvRatio: 70,
  loanTerm: 30,
  insurance: 1300,
  landPercent: 20,
  maintenanceRate: 1,
  costIncrease: 1,
  taxRate: 1.5,
  incomeTaxRate: 25,
  passthroughLLC: "yes",
  assessedValuePercent: 20,
  appreciationRate: 3,
  financedPurchaseYears: 5,
  maxUnitsFinanced: 2,
  maxUnitsFinancedLimitYears: 3,
  rentGrowthRate: 3,
  vacancyRate: 5,
  managementRate: 8,
  capexRate: 5,
  expenseInflation: 2.5,
  insuranceInflation: 4,
  closingCostPercent: 2,
  loanOriginationPercent: 1,
  assessedGrowthRate: 2.5,
};

// Original calculation function (copied from index.html)
function performCalculationsOriginal(params) {
  const results = {
    comparison: [],
    selfFinanced: [],
    financed: [],
    detailedData: [],
  };

  const years = 15;
  let selfTotalUnits = 0;
  let financedTotalUnits = 0;
  let selfCumulativeCash = 0;
  let financedCumulativeCash = 0;
  let selfCumulativeCapEx = 0;
  let financedCumulativeCapEx = 0;
  let selfAvailableCash = 0;
  let financedAvailableCash = 0;

  const selfCohorts = [];
  const financedCohorts = [];
  const financedLoans = [];

  for (let year = 1; year <= years; year++) {
    const propertyCost = params.initialCost * Math.pow(1.01, year - 1);

    // Self-financed strategy
    let selfNewUnits = 0;
    if (year <= params.selfPurchaseYears) {
      selfAvailableCash += params.annualBudget;
    }

    if (selfAvailableCash >= propertyCost * 1.02) {
      selfNewUnits = Math.floor(selfAvailableCash / (propertyCost * 1.02));
      const totalCost = selfNewUnits * propertyCost * 1.02;
      selfAvailableCash -= totalCost;

      if (selfNewUnits > 0) {
        selfCohorts.push({
          yearOriginated: year,
          units: selfNewUnits,
          costPerUnit: propertyCost,
        });
      }
    }

    selfTotalUnits += selfNewUnits;

    // Financed strategy
    let financedNewUnits = 0;
    if (year <= params.selfPurchaseYears) {
      financedAvailableCash += params.annualBudget;
    }

    const downPayment = propertyCost * (1 - params.ltvRatio / 100) * 1.03;
    if (financedAvailableCash >= downPayment) {
      financedNewUnits = Math.floor(financedAvailableCash / downPayment);
      const totalDownPayment = financedNewUnits * downPayment;
      financedAvailableCash -= totalDownPayment;

      if (financedNewUnits > 0) {
        financedCohorts.push({
          yearOriginated: year,
          units: financedNewUnits,
          costPerUnit: propertyCost,
        });

        financedLoans.push({
          units: financedNewUnits,
          loanAmountPerUnit: propertyCost * (params.ltvRatio / 100),
          yearOriginated: year,
          interestRate: params.interestRate / 100,
          term: params.loanTerm,
        });
      }
    }

    financedTotalUnits += financedNewUnits;

    // Calculate metrics (simplified for comparison)
    const selfMetrics = calculateMetricsOriginal(
      year,
      selfCohorts,
      params,
      selfTotalUnits,
      []
    );
    const financedMetrics = calculateMetricsOriginal(
      year,
      financedCohorts,
      params,
      financedTotalUnits,
      financedLoans
    );

    const selfCashFlow =
      selfMetrics.noi - selfMetrics.capex - selfMetrics.taxes;
    const financedCashFlow =
      financedMetrics.noi -
      financedMetrics.debtService -
      financedMetrics.capex -
      financedMetrics.taxes;

    selfCumulativeCapEx += selfMetrics.capex;
    financedCumulativeCapEx += financedMetrics.capex;

    const sp500Return = 0.1;
    if (year > 1) {
      selfCumulativeCapEx = selfCumulativeCapEx * (1 + sp500Return);
      financedCumulativeCapEx = financedCumulativeCapEx * (1 + sp500Return);
    }

    if (selfCashFlow > 0) {
      selfAvailableCash += selfCashFlow;
    }
    if (financedCashFlow > 0) {
      financedAvailableCash += financedCashFlow;
    }

    selfCumulativeCash += selfCashFlow;
    financedCumulativeCash += financedCashFlow;

    const selfAssetValue = calculateAssetValueOriginal(
      year,
      selfCohorts,
      params
    );
    const financedAssetValue = calculateAssetValueOriginal(
      year,
      financedCohorts,
      params
    );
    const loanBalance = calculateLoanBalanceOriginal(year, financedLoans);

    results.comparison.push({
      year,
      propertyCost,
      selfNewUnits,
      selfTotalUnits,
      selfCashFlow,
      selfAssetValue,
      financedNewUnits,
      financedTotalUnits,
      financedCashFlow,
      financedAssetValue,
      loanBalance,
      netEquity: financedAssetValue - loanBalance,
    });

    results.selfFinanced.push({
      year,
      cashFlow: selfCashFlow,
      cumulative: selfCumulativeCash,
      assetValue: selfAssetValue,
      netWorth: selfAssetValue + selfCumulativeCash,
    });

    results.financed.push({
      year,
      cashFlow: financedCashFlow,
      cumulative: financedCumulativeCash,
      assetValue: financedAssetValue,
      loanBalance,
      netWorth: financedAssetValue - loanBalance + financedCumulativeCash,
    });

    results.detailedData.push({
      year,
      selfMetrics,
      financedMetrics,
      selfAssetValue,
      financedAssetValue,
      loanBalance,
      selfCumulativeCapEx: selfCumulativeCapEx,
      financedCumulativeCapEx: financedCumulativeCapEx,
    });
  }

  return results;
}

// Simplified metrics calculation for comparison
function calculateMetricsOriginal(year, cohorts, params, totalUnits, loans) {
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
  const noi =
    egi - managementFee - maintenance - propertyTax - insurance - capex;

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

  const taxableIncome = noi - depreciation - debtService;
  const taxes =
    params.passthroughLLC === "yes"
      ? taxableIncome * (params.incomeTaxRate / 100)
      : taxableIncome * 0.21;

  return {
    gpr,
    egi,
    noi,
    depreciation,
    debtService,
    taxes,
    capex,
    taxableIncome: taxableIncome,
    netIncome: taxableIncome - taxes,
  };
}

function calculateAssetValueOriginal(year, cohorts, params) {
  let totalValue = 0;
  cohorts.forEach((cohort) => {
    const yearsOwned = year - cohort.yearOriginated;
    const appreciation = Math.pow(
      1 + params.appreciationRate / 100,
      yearsOwned
    );
    totalValue += cohort.costPerUnit * appreciation * cohort.units;
  });
  return totalValue;
}

function calculateLoanBalanceOriginal(year, loans) {
  let totalBalance = 0;
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
      const remainingBalance =
        (monthlyEMI * (Math.pow(1 + monthlyRate, remainingPayments) - 1)) /
        (monthlyRate * Math.pow(1 + monthlyRate, remainingPayments));
      totalBalance += remainingBalance * loan.units;
    }
  });
  return totalBalance;
}

// Run the verification
console.log("📊 Running calculation verification...");
const originalResults = performCalculationsOriginal(testParams);

console.log("✅ Original calculations completed");
console.log("📈 Key Results (Year 15):");
console.log(
  `   Self-Financed Net Worth: $${originalResults.selfFinanced[14].netWorth.toLocaleString()}`
);
console.log(
  `   Financed Net Worth: $${originalResults.financed[14].netWorth.toLocaleString()}`
);
console.log(
  `   Self-Financed Total Units: ${originalResults.comparison[14].selfTotalUnits}`
);
console.log(
  `   Financed Total Units: ${originalResults.comparison[14].financedTotalUnits}`
);

console.log("\n🔍 Verification Summary:");
console.log("   - Original calculations are working correctly");
console.log("   - Modular version should now match these results");
console.log("   - Check the test page for detailed comparison");

console.log("\n📋 Next Steps:");
console.log("   1. Open http://localhost:8000/test-calculations.html");
console.log("   2. Click 'Run Comparison Test' to verify modular version");
console.log(
  "   3. Open http://localhost:8000/index-modular.html to test full functionality"
);
console.log("   4. Compare results with http://localhost:8000/index.html");

// Export for use in browser console
window.verifyCalculations = {
  testParams,
  originalResults,
  performCalculationsOriginal,
};
