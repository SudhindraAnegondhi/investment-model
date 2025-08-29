// Test script to replicate main model logic exactly
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
  insurance: 13537,
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
  // Note: Annual budget is already included in availableCash, so don't add again
  const cashBroughtIn = 0;

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

// Test Year 1 with main model logic
console.log("🚀 TESTING MAIN MODEL LOGIC - YEAR 1");
console.log("=====================================");

const year = 1;
// Use main model's property cost calculation
const propertyCost = testParams.initialCost * Math.pow(1.01, year - 1);
let financedAvailableCash = 0;

// Add annual budget to available cash for unit purchase calculations
if (year <= testParams.selfPurchaseYears) {
  financedAvailableCash += testParams.annualBudget;
}

// Calculate max affordable units (main model logic)
const downPaymentPerUnit = propertyCost * (1 - testParams.ltvRatio / 100);
const maxAffordableUnits = Math.floor(
  financedAvailableCash / downPaymentPerUnit
);

console.log(`Year ${year} Parameters (Main Model):`);
console.log(`  Property Cost: $${propertyCost.toLocaleString()}`);
console.log(`  Annual Budget: $${testParams.annualBudget.toLocaleString()}`);
console.log(`  Available Cash: $${financedAvailableCash.toLocaleString()}`);
console.log(`  Down Payment per Unit: $${downPaymentPerUnit.toLocaleString()}`);
console.log(`  Max Affordable Units: ${maxAffordableUnits}`);

// Test the unit purchase logic
const purchasedUnits = calculateSustainableUnits(
  maxAffordableUnits,
  year,
  [], // No existing cohorts
  [], // No existing loans
  testParams,
  propertyCost,
  financedAvailableCash
);

console.log(`\n📊 RESULT: Purchasing ${purchasedUnits} units in Year 1`);
