// Debug script to test unit purchase logic
const testParams = {
  initialCost: 160000,
  annualBudget: 170000,
  selfPurchaseYears: 3,
  interestRate: 7,
  loanTerm: 5,
  ltvRatio: 70,
  rentalRate: 1.9,
  vacancyRate: 5,
  managementRate: 8,
  maintenanceRate: 1,
  insurance: 1300,
  taxRate: 1.1,
  assessedValuePercent: 80,
  assessedGrowthRate: 2,
  costIncrease: 3,
  rentGrowthRate: 2,
  capexRate: 0.5,
  landPercent: 20,
  passthroughLLC: "yes",
  maxUnitsFinanced: 2,
  maxUnitsFinancedLimitYears: 3,
};

function calculateEMI(principal, annualRate, years) {
  const monthlyRate = annualRate / 100 / 12;
  const totalPayments = years * 12;
  return (
    (principal * monthlyRate * Math.pow(1 + monthlyRate, totalPayments)) /
    (Math.pow(1 + monthlyRate, totalPayments) - 1)
  );
}

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

  // Calculate income from all cohorts
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

  const managementExpenses = egi * (params.managementRate / 100);
  const maintenanceExpenses = egi * (params.maintenanceRate / 100);
  const insurance = params.insurance * totalUnits;

  const noi =
    egi - managementExpenses - maintenanceExpenses - insurance - propertyTax;

  let debtService = 0;
  let interestExpense = 0;

  loans.forEach((loan) => {
    const yearsElapsed = year - loan.yearOriginated;
    const monthsElapsed = yearsElapsed * 12;
    const totalPayments = loan.term * 12;
    const remainingPayments = Math.max(0, totalPayments - monthsElapsed);
    const monthlyRate = loan.interestRate / 12;

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

      debtService += monthlyEMI * 12 * loan.units;
    }
  });

  const capex = egi * (params.capexRate / 100);
  const taxableIncome = noi - depreciation - interestExpense;
  const taxes =
    params.passthroughLLC === "yes" ? 0 : Math.max(0, taxableIncome * 0.21);

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

function analyzeCashFlowForNewUnits(
  newUnits,
  purchaseYear,
  existingCohorts,
  existingLoans,
  params,
  propertyCost,
  availableCash
) {
  console.log(`\n🔍 Testing ${newUnits} units in Year ${purchaseYear}:`);

  // A. Cash Balance (starting available cash)
  const cashBalance = availableCash;

  // B. Cash brought in (Annual Investment Budget for this year)
  const currentYearBudget =
    purchaseYear <= params.selfPurchaseYears ? params.annualBudget : 0;
  const cashBroughtIn = currentYearBudget;

  // Asset Price
  const assetPrice = propertyCost * newUnits;

  // Margin (Down Payment)
  const marginPercent = (100 - params.ltvRatio) / 100;
  const margin = assetPrice * marginPercent;

  // Loan Amount
  const loanAmount = assetPrice * (params.ltvRatio / 100);

  // Rental Income
  const monthlyRentPerUnit = propertyCost * (params.rentalRate / 100);
  const rentalIncome = monthlyRentPerUnit * 12 * newUnits;

  // Vacancy Loss
  const vacancyLoss = rentalIncome * (params.vacancyRate / 100);

  // EGI (Effective Gross Income)
  const egi = rentalIncome - vacancyLoss;

  // Operating Expenses
  const managementExpenses = egi * (params.managementRate / 100);
  const maintenanceExpenses = egi * (params.maintenanceRate / 100);
  const insurance = params.insurance * newUnits;
  const propertyTax = assetPrice * (params.taxRate / 100);

  const opEx =
    managementExpenses + maintenanceExpenses + insurance + propertyTax;

  // Net Operating Income
  const noi = egi - opEx;

  // Calculate existing properties cash flow
  let existingNOI = 0;
  let existingDebtService = 0;
  if (existingCohorts.length > 0) {
    const existingDetailed = calculateDetailedMetricsOriginal(
      purchaseYear,
      existingCohorts,
      params,
      existingCohorts.reduce((total, cohort) => total + cohort.units, 0),
      existingLoans
    );
    existingNOI = existingDetailed.noi;
    existingDebtService = existingDetailed.debtService;
  }

  // Total Cash Available
  // Cash Available = Starting Cash + Annual Budget + NOI from new units + NOI from existing units
  const totalCashAvailable = cashBalance + cashBroughtIn + noi + existingNOI;

  console.log(`   Breakdown:`);
  console.log(`     Starting Cash: $${cashBalance.toLocaleString()}`);
  console.log(`     Annual Budget: $${cashBroughtIn.toLocaleString()}`);
  console.log(`     NOI from new units: $${noi.toLocaleString()}`);
  console.log(`     NOI from existing units: $${existingNOI.toLocaleString()}`);

  // Debt Service Calculation
  const monthlyRate = params.interestRate / 100 / 12;
  const totalPayments = params.loanTerm * 12;
  const monthlyEMI =
    loanAmount > 0
      ? (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, totalPayments)) /
        (Math.pow(1 + monthlyRate, totalPayments) - 1)
      : 0;
  const bankEMI = monthlyEMI * 12;

  // Interest expense for first year
  let interestExpense = 0;
  if (loanAmount > 0) {
    interestExpense = loanAmount * (params.interestRate / 100);
  }

  // Total Outflows
  const totalOutflows = margin + bankEMI + existingDebtService;

  // Cash Flow Balance
  const cashFlowBalance = totalCashAvailable - totalOutflows;

  console.log(`   Cash Available: $${totalCashAvailable.toLocaleString()}`);
  console.log(`   Total Outflows: $${totalOutflows.toLocaleString()}`);
  console.log(`   Cash Flow Balance: $${cashFlowBalance.toLocaleString()}`);
  console.log(`   Sustainable: ${cashFlowBalance >= 0 ? "YES" : "NO"}`);

  return {
    isSustainable: cashFlowBalance >= 0,
    cashFlowBalance: cashFlowBalance,
    totalCashAvailable: totalCashAvailable,
    totalOutflows: totalOutflows,
  };
}

function calculateSustainableUnits(
  maxAffordableUnits,
  year,
  existingCohorts,
  existingLoans,
  params,
  propertyCost,
  availableCash
) {
  console.log(`\n🎯 Testing units from 1 to ${maxAffordableUnits}:`);

  let bestUnits = 0;
  const analyses = [];

  // Test each number of units
  for (let units = 1; units <= maxAffordableUnits; units++) {
    const analysis = analyzeCashFlowForNewUnits(
      units,
      year,
      existingCohorts,
      existingLoans,
      params,
      propertyCost,
      availableCash
    );

    analyses.push({
      units: units,
      analysis: analysis,
    });

    // Select the maximum number of sustainable units
    if (analysis.isSustainable) {
      bestUnits = units;
      console.log(
        `✅ Year ${year}: ${units} units - SUSTAINABLE (Balance: $${analysis.cashFlowBalance.toLocaleString()})`
      );
    } else {
      console.log(
        `❌ Year ${year}: ${units} units - REJECTED (Balance: $${analysis.cashFlowBalance.toLocaleString()})`
      );
    }
  }

  console.log(`\n🎯 Final decision: ${bestUnits} units`);
  return bestUnits;
}

// Test Year 1

// Extended simulation for 15 years with summary table
console.log("\n============================");
console.log("15-YEAR UNIT PURCHASE SUMMARY");
console.log("============================\n");

let cohorts = [];
let loans = [];
let cashBalance = 0;
let summary = [];

for (let year = 1; year <= 15; year++) {
  // Property cost increases each year
  const propertyCost =
    testParams.initialCost *
    Math.pow(1 + testParams.costIncrease / 100, year - 1);
  // Annual budget only for selfPurchaseYears
  const annualBudget =
    year <= testParams.selfPurchaseYears ? testParams.annualBudget : 0;
  // Calculate max affordable units using both available cash and annual budget
  const availableFunds = cashBalance + annualBudget;
  const downPaymentPerUnit = propertyCost * (1 - testParams.ltvRatio / 100);
  const maxAffordableUnits = Math.floor(availableFunds / downPaymentPerUnit);

  // Find sustainable units
  const unitsToPurchase = calculateSustainableUnits(
    maxAffordableUnits,
    year,
    cohorts,
    loans,
    testParams,
    propertyCost,
    cashBalance
  );

  // If units purchased, update cohorts and loans
  if (unitsToPurchase > 0) {
    cohorts.push({
      yearOriginated: year,
      units: unitsToPurchase,
      costPerUnit: propertyCost,
    });
    loans.push({
      units: unitsToPurchase,
      loanAmountPerUnit: propertyCost * (testParams.ltvRatio / 100),
      yearOriginated: year,
      interestRate: testParams.interestRate / 100,
      term: testParams.loanTerm,
    });
  }

  // Calculate final cash balance correctly
  // Get cohorts and loans state before this year's purchase
  const existingCohorts = cohorts.filter(c => c.yearOriginated < year);
  const existingLoans = loans.filter(l => l.yearOriginated < year);
  
  const finalAnalysis = analyzeCashFlowForNewUnits(
    unitsToPurchase,
    year,
    existingCohorts, // Cohorts from previous years only
    existingLoans,   // Loans from previous years only
    testParams,
    propertyCost,
    cashBalance
  );

  // Carry forward cash for next year
  cashBalance = finalAnalysis.cashFlowBalance;

  // Store summary
  summary.push({
    year,
    propertyCost: Math.round(propertyCost),
    unitsPurchased: unitsToPurchase,
    totalUnits: cohorts.reduce((sum, c) => sum + c.units, 0),
    cashFlowBalance: Math.round(finalAnalysis.cashFlowBalance),
    decision:
      unitsToPurchase > 0
        ? finalAnalysis.isSustainable
          ? "Purchased"
          : "Rejected"
        : "None",
  });
}

// Print summary table
console.log(
  "Year | Property Cost | Units Purchased | Total Units | Cash Flow Balance | Decision"
);
console.log(
  "-----|---------------|-----------------|------------|-------------------|---------"
);
summary.forEach((row) => {
  console.log(
    `${row.year.toString().padStart(4)} | $${row.propertyCost
      .toLocaleString()
      .padStart(13)} | ${row.unitsPurchased
      .toString()
      .padStart(15)} | ${row.totalUnits
      .toString()
      .padStart(10)} | $${row.cashFlowBalance
      .toLocaleString()
      .padStart(17)} | ${row.decision}`
  );
});
