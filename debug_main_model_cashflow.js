// Debug script to test main model's cash flow calculation
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

// Test Year 1 with 2 units (as purchased by main model)
console.log("🚀 DEBUGGING MAIN MODEL CASH FLOW CALCULATION");
console.log("=============================================");

const year = 1;
const propertyCost = testParams.initialCost * Math.pow(1.01, year - 1);
const purchasedUnits = 2; // As purchased by main model

console.log(`Year ${year} Parameters:`);
console.log(`  Property Cost: $${propertyCost.toLocaleString()}`);
console.log(`  Purchased Units: ${purchasedUnits}`);

// Create cohorts and loans for 2 units
const cohorts = [
  {
    yearOriginated: year,
    units: purchasedUnits,
    costPerUnit: propertyCost,
  },
];

const loans = [
  {
    units: purchasedUnits,
    loanAmountPerUnit: propertyCost * (testParams.ltvRatio / 100),
    yearOriginated: year,
    interestRate: testParams.interestRate / 100,
    term: testParams.loanTerm,
  },
];

// Calculate detailed metrics (main model logic)
const detailed = calculateDetailedMetricsOriginal(
  year,
  cohorts,
  testParams,
  purchasedUnits,
  loans
);

console.log(`\n📊 DETAILED METRICS (Main Model):`);
console.log(`  GPR: $${detailed.gpr.toLocaleString()}`);
console.log(`  EGI: $${detailed.egi.toLocaleString()}`);
console.log(`  NOI: $${detailed.noi.toLocaleString()}`);
console.log(`  Debt Service: $${detailed.debtService.toLocaleString()}`);
console.log(
  `  Interest Expense: $${detailed.interestExpense.toLocaleString()}`
);
console.log(`  CapEx: $${detailed.capex.toLocaleString()}`);
console.log(`  Taxes: $${detailed.taxes.toLocaleString()}`);

// Calculate cash flow using main model logic (including annual budget)
const annualBudget = testParams.annualBudget;
const mainModelCashFlow =
  annualBudget +
  detailed.noi -
  detailed.debtService -
  detailed.capex -
  detailed.taxes;

console.log(`\n💰 MAIN MODEL CASH FLOW CALCULATION:`);
console.log(`  Annual Budget: $${annualBudget.toLocaleString()}`);
console.log(`  + NOI: +$${detailed.noi.toLocaleString()}`);
console.log(`  - Debt Service: -$${detailed.debtService.toLocaleString()}`);
console.log(`  - CapEx: -$${detailed.capex.toLocaleString()}`);
console.log(`  - Taxes: -$${detailed.taxes.toLocaleString()}`);
console.log(`  = Cash Flow: $${mainModelCashFlow.toLocaleString()}`);

// Compare with our expected calculation
console.log(`\n🔍 COMPARISON WITH EXPECTED:`);
console.log(`  Main Model Cash Flow: $${mainModelCashFlow.toLocaleString()}`);
console.log(`  Expected Cash Flow: $53,254`);
console.log(`  Difference: $${(mainModelCashFlow - 53254).toLocaleString()}`);

// Debug the components
console.log(`\n🔍 COMPONENT ANALYSIS:`);
console.log(`  NOI Difference: ${detailed.noi - 32479.92}`);
console.log(`  Debt Service Difference: ${detailed.debtService - 53226}`);
console.log(`  CapEx Difference: ${detailed.capex - 1824}`);
console.log(`  Taxes Difference: ${detailed.taxes - 0}`);
