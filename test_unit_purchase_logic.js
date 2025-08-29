// Test Unit Purchase Logic
// Standalone test to evaluate the cash flow sustainability logic

// Mock data model for testing
const dataModel = {
  CalculationResults: class {
    constructor() {
      this.comparison = [];
      this.selfFinanced = [];
      this.financed = [];
      this.detailedData = [];
      this.inputParams = {};
    }
  },
  YearlyMetrics: class {
    constructor() {
      this.units = 0;
      this.newUnits = 0;
      this.cashFlow = 0;
      this.cumulativeCashFlow = 0;
      this.assetValue = 0;
      this.netWorth = 0;
      this.gpr = 0;
      this.egi = 0;
      this.noi = 0;
      this.depreciation = 0;
      this.debtService = 0;
      this.interestExpense = 0;
      this.taxableIncome = 0;
      this.taxes = 0;
      this.netIncome = 0;
      this.capex = 0;
    }
  },
};

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
  loanTerm: 5, // Changed to 5 years as requested
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

// Test results storage
const testResults = {
  year1: [],
  year2: [],
  year3: [],
  inconsistencies: [],
  summary: {},
};

// Calculate EMI (Equated Monthly Installment)
function calculateEMI(principal, annualRate, years) {
  const monthlyRate = annualRate / 12;
  const numberOfPayments = years * 12;

  if (monthlyRate === 0) {
    return principal / numberOfPayments;
  }

  const emi =
    (principal * (monthlyRate * Math.pow(1 + monthlyRate, numberOfPayments))) /
    (Math.pow(1 + monthlyRate, numberOfPayments) - 1);

  return emi * 12; // Return annual EMI
}

// Calculate detailed metrics for existing properties
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

// Test the cash flow analysis function
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

  // A. Cash Balance (starting available cash - excludes current year budget)
  const currentYearBudget =
    purchaseYear <= params.selfPurchaseYears ? params.annualBudget : 0;
  const cashBalance = availableCash - currentYearBudget;

  // B. Cash brought in (Annual Investment Budget for this year)
  const cashBroughtIn = currentYearBudget;

  // Asset Price
  const assetPrice = propertyCost * newUnits;

  // Margin (Down Payment) - 30% in manual calculation
  const marginPercent = (100 - params.ltvRatio) / 100;
  const margin = assetPrice * marginPercent;

  // Loan Amount
  const loanAmount = assetPrice * (params.ltvRatio / 100);

  // === EFFECTIVE GROSS RENTAL INCOME ===
  // Rental Income
  const monthlyRentPerUnit = propertyCost * (params.rentalRate / 100);
  const rentalIncome = monthlyRentPerUnit * 12 * newUnits;

  // Vacancy Loss
  const vacancyLoss = rentalIncome * (params.vacancyRate / 100);

  // EGI (Effective Gross Income)
  const egi = rentalIncome - vacancyLoss;

  // === OPERATING EXPENSES BASED ON EGI ===
  const managementExpenses = egi * (params.managementRate / 100);
  const maintenanceExpenses = egi * (params.maintenanceRate / 100);
  const insurance = params.insurance * newUnits;
  const propertyTax = assetPrice * (params.taxRate / 100);

  // OpEx (Operating Expenses) - NOTE: Does NOT include interest expense or debt service
  const opEx =
    managementExpenses + maintenanceExpenses + insurance + propertyTax;

  // Net Operating Income (C) - Before financing costs
  const noi = egi - opEx;

  // === CALCULATE EXISTING PROPERTIES CASH FLOW ===
  let existingNOI = 0;
  if (existingCohorts.length > 0) {
    const existingDetailed = calculateDetailedMetricsOriginal(
      purchaseYear,
      existingCohorts,
      params,
      existingCohorts.reduce((total, cohort) => total + cohort.units, 0),
      existingLoans
    );
    existingNOI = existingDetailed.noi;
  }

  // Total Cash Available (A+B+C+Existing NOI)
  const totalCashAvailable = cashBalance + cashBroughtIn + noi + existingNOI;

  // === DEBT SERVICE CALCULATION ===
  // Calculate EMI properly following old implementation
  const monthlyRate = params.interestRate / 100 / 12;
  const totalPayments = params.loanTerm * 12;
  const monthlyEMI =
    loanAmount > 0
      ? (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, totalPayments)) /
        (Math.pow(1 + monthlyRate, totalPayments) - 1)
      : 0;
  const bankEMI = monthlyEMI * 12;

  // Calculate interest expense for the first year
  let interestExpense = 0;
  if (loanAmount > 0) {
    interestExpense = loanAmount * (params.interestRate / 100);
  }

  // Principal payment = EMI - Interest
  const principalPayment = bankEMI - interestExpense;

  // Calculate existing debt service
  let existingDebtService = 0;
  if (existingLoans.length > 0) {
    const existingDetailed = calculateDetailedMetricsOriginal(
      purchaseYear,
      existingCohorts,
      params,
      existingCohorts.reduce((total, cohort) => total + cohort.units, 0),
      existingLoans
    );
    existingDebtService = existingDetailed.debtService;
  }

  // === OUTFLOWS ===
  // Total Outflows = Down payment + EMI (for cash flow purposes)
  const totalOutflows = margin + bankEMI + existingDebtService;

  // === CASH FLOW BALANCE ===
  const cashFlowBalance = totalCashAvailable - totalOutflows;

  // Decision logic
  const decision =
    cashFlowBalance >= 0
      ? cashFlowBalance > 50000
        ? "Too much cash"
        : "Selected"
      : "Rejected";

  // Calculate detailed breakdown for return object
  const capex = egi * (params.capexRate / 100);

  // Calculate depreciation
  const buildingValue = assetPrice * (1 - params.landPercent / 100);
  const depreciation = buildingValue / 27.5;

  // Calculate taxable income (NOI - Interest Expense - Depreciation)
  const taxableIncome = noi - depreciation - interestExpense;
  const taxes =
    params.passthroughLLC === "yes" ? 0 : Math.max(0, taxableIncome * 0.21);

  // Calculate cash flow (NOI - Debt Service - CapEx - Taxes)
  const newUnitsCashFlow = noi - bankEMI - capex - taxes;
  const existingCashFlow = existingNOI - existingDebtService;
  const totalCashFlow = existingCashFlow + newUnitsCashFlow;

  const result = {
    units: newUnits,
    isSustainable: cashFlowBalance >= 0,
    cashFlowBalance: cashFlowBalance,
    totalCashFlow: totalCashFlow,
    newUnitsCashFlow: newUnitsCashFlow,
    existingCashFlow: existingCashFlow,
    downPayment: margin,
    noi: noi,
    emi: bankEMI,
    interestExpense: interestExpense,
    principalPayment: principalPayment,
    totalCashAvailable: totalCashAvailable,
    totalOutflows: totalOutflows,
    decision: decision,
    // Additional breakdown
    rentalIncome: rentalIncome,
    egi: egi,
    managementExpenses: managementExpenses,
    maintenanceExpenses: maintenanceExpenses,
    insurance: insurance,
    propertyTax: propertyTax,
    opEx: opEx,
    capex: capex,
    depreciation: depreciation,
    taxableIncome: taxableIncome,
    taxes: taxes,
    // Input parameters for debugging
    availableCash: availableCash,
    propertyCost: propertyCost,
    assetPrice: assetPrice,
    margin: margin,
    loanAmount: loanAmount,
  };

  console.log(
    `   Cash Flow Balance: $${cashFlowBalance.toLocaleString()} (${decision})`
  );
  console.log(
    `   Total Cash Available: $${totalCashAvailable.toLocaleString()}`
  );
  console.log(`   Total Outflows: $${totalOutflows.toLocaleString()}`);
  console.log(
    `   NOI: $${noi.toLocaleString()}, EMI: $${bankEMI.toLocaleString()}`
  );

  return result;
}

// Test the sustainable units calculation
function calculateSustainableUnits(
  maxAffordableUnits,
  year,
  existingCohorts,
  existingLoans,
  params,
  propertyCost,
  availableCash
) {
  if (maxAffordableUnits === 0) return 0;

  console.log(`\n💡 Year ${year}: Determining optimal units to purchase`);
  console.log(`   Max affordable based on cash: ${maxAffordableUnits} units`);

  let bestUnits = 0;
  let analyses = [];

  // Test from 1 unit up to max affordable units
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

    // Following manual logic: Select units that keep cash flow positive
    if (analysis.isSustainable) {
      if (analysis.cashFlowBalance >= 0 && analysis.cashFlowBalance <= 100000) {
        // Sweet spot: positive but not excessive cash
        bestUnits = units;
        console.log(
          `✅ Year ${year}: ${units} units - SELECTED (Balance: $${analysis.cashFlowBalance.toLocaleString()})`
        );
      } else if (analysis.cashFlowBalance > 100000) {
        // Too much cash left - could buy more
        console.log(
          `⚠️ Year ${year}: ${units} units - Too much cash (Balance: $${analysis.cashFlowBalance.toLocaleString()})`
        );
        if (bestUnits === 0) bestUnits = units; // Keep as fallback
      } else {
        console.log(
          `✅ Year ${year}: ${units} units - Sustainable (Balance: $${analysis.cashFlowBalance.toLocaleString()})`
        );
        bestUnits = units;
      }
    } else {
      console.log(
        `❌ Year ${year}: ${units} units - REJECTED (Balance: $${analysis.cashFlowBalance.toLocaleString()})`
      );
    }
  }

  // Follow manual logic: maximize units while keeping cash flow positive
  let optimalUnits = 0;
  let optimalBalance = 0;

  for (const item of analyses) {
    if (item.analysis.isSustainable && item.units > optimalUnits) {
      optimalUnits = item.units;
      optimalBalance = item.analysis.cashFlowBalance;
    }
  }

  if (optimalUnits > 0) {
    console.log(
      `🎯 Year ${year}: Final decision - ${optimalUnits} units (Balance: $${optimalBalance.toLocaleString()})`
    );
    return optimalUnits;
  }

  console.log(
    `🚫 Year ${year}: No sustainable options found - purchasing 0 units`
  );
  return 0;
}

// Run comprehensive tests
function runUnitPurchaseTests() {
  console.log("🧪 STARTING UNIT PURCHASE LOGIC TESTS");
  console.log("=====================================");

  // Test Year 1 (no existing properties)
  console.log("\n📊 TESTING YEAR 1 (No existing properties)");
  console.log("==========================================");

  const year1AvailableCash = testParams.annualBudget; // $170,000
  const year1PropertyCost = testParams.initialCost; // $160,000
  const year1DownPaymentPerUnit =
    year1PropertyCost * (1 - testParams.ltvRatio / 100) * 1.03; // Including 3% closing costs
  const year1MaxAffordableUnits = Math.floor(
    year1AvailableCash / year1DownPaymentPerUnit
  );

  console.log(`Year 1 Parameters:`);
  console.log(`  Available Cash: $${year1AvailableCash.toLocaleString()}`);
  console.log(`  Property Cost: $${year1PropertyCost.toLocaleString()}`);
  console.log(
    `  Down Payment per Unit: $${year1DownPaymentPerUnit.toLocaleString()}`
  );
  console.log(`  Max Affordable Units: ${year1MaxAffordableUnits}`);

  const year1Result = calculateSustainableUnits(
    year1MaxAffordableUnits,
    1,
    [], // No existing cohorts
    [], // No existing loans
    testParams,
    year1PropertyCost,
    year1AvailableCash
  );

  testResults.year1 = {
    availableCash: year1AvailableCash,
    propertyCost: year1PropertyCost,
    downPaymentPerUnit: year1DownPaymentPerUnit,
    maxAffordableUnits: year1MaxAffordableUnits,
    selectedUnits: year1Result,
  };

  // Test Year 2 (with existing properties from Year 1)
  console.log("\n📊 TESTING YEAR 2 (With existing properties from Year 1)");
  console.log("=========================================================");

  // Simulate Year 1 results
  const year1Cohorts =
    year1Result > 0
      ? [
          {
            yearOriginated: 1,
            units: year1Result,
            costPerUnit: year1PropertyCost,
          },
        ]
      : [];

  const year1Loans =
    year1Result > 0
      ? [
          {
            units: year1Result,
            loanAmountPerUnit: year1PropertyCost * (testParams.ltvRatio / 100),
            yearOriginated: 1,
            interestRate: testParams.interestRate / 100,
            term: testParams.loanTerm,
          },
        ]
      : [];

  // Calculate Year 2 available cash (including Year 1 cash flow)
  const year2PropertyCost = year1PropertyCost * Math.pow(1.01, 1); // 1% increase
  let year2AvailableCash = year1AvailableCash + testParams.annualBudget; // Add Year 2 budget

  // Calculate Year 1 cash flow to add to available cash
  if (year1Result > 0) {
    const year1Analysis = analyzeCashFlowForNewUnits(
      year1Result,
      1,
      [],
      [],
      testParams,
      year1PropertyCost,
      year1AvailableCash
    );
    if (year1Analysis.cashFlowBalance > 0) {
      year2AvailableCash += year1Analysis.cashFlowBalance;
    }
  }

  const year2DownPaymentPerUnit =
    year2PropertyCost * (1 - testParams.ltvRatio / 100) * 1.03;
  const year2MaxAffordableUnits = Math.floor(
    year2AvailableCash / year2DownPaymentPerUnit
  );

  console.log(`Year 2 Parameters:`);
  console.log(`  Available Cash: $${year2AvailableCash.toLocaleString()}`);
  console.log(`  Property Cost: $${year2PropertyCost.toLocaleString()}`);
  console.log(
    `  Down Payment per Unit: $${year2DownPaymentPerUnit.toLocaleString()}`
  );
  console.log(`  Max Affordable Units: ${year2MaxAffordableUnits}`);
  console.log(
    `  Existing Properties: ${
      year1Cohorts.length > 0 ? year1Cohorts[0].units : 0
    } units`
  );

  const year2Result = calculateSustainableUnits(
    year2MaxAffordableUnits,
    2,
    year1Cohorts,
    year1Loans,
    testParams,
    year2PropertyCost,
    year2AvailableCash
  );

  testResults.year2 = {
    availableCash: year2AvailableCash,
    propertyCost: year2PropertyCost,
    downPaymentPerUnit: year2DownPaymentPerUnit,
    maxAffordableUnits: year2MaxAffordableUnits,
    selectedUnits: year2Result,
    existingUnits: year1Cohorts.length > 0 ? year1Cohorts[0].units : 0,
  };

  // Test edge cases and inconsistencies
  console.log("\n🔍 TESTING EDGE CASES AND INCONSISTENCIES");
  console.log("=========================================");

  // Test 1: What if we force 3 units in Year 1?
  console.log("\nTest 1: Forcing 3 units in Year 1");
  const force3UnitsAnalysis = analyzeCashFlowForNewUnits(
    3,
    1,
    [],
    [],
    testParams,
    year1PropertyCost,
    year1AvailableCash
  );

  testResults.inconsistencies.push({
    test: "Force 3 units in Year 1",
    units: 3,
    isSustainable: force3UnitsAnalysis.isSustainable,
    cashFlowBalance: force3UnitsAnalysis.cashFlowBalance,
    expected: "Should be negative cash flow",
    actual: force3UnitsAnalysis.isSustainable
      ? "Unexpectedly sustainable"
      : "Correctly rejected",
  });

  // Test 2: What if we test all possible unit combinations?
  console.log("\nTest 2: Testing all possible unit combinations for Year 1");
  for (let units = 1; units <= 5; units++) {
    const analysis = analyzeCashFlowForNewUnits(
      units,
      1,
      [],
      [],
      testParams,
      year1PropertyCost,
      year1AvailableCash
    );

    testResults.inconsistencies.push({
      test: `Year 1 - ${units} units`,
      units: units,
      isSustainable: analysis.isSustainable,
      cashFlowBalance: analysis.cashFlowBalance,
      totalCashAvailable: analysis.totalCashAvailable,
      totalOutflows: analysis.totalOutflows,
      noi: analysis.noi,
      emi: analysis.emi,
    });
  }

  // Generate summary
  testResults.summary = {
    year1Selected: year1Result,
    year2Selected: year2Result,
    year1MaxAffordable: year1MaxAffordableUnits,
    year2MaxAffordable: year2MaxAffordableUnits,
    totalUnitsAfter2Years: year1Result + year2Result,
    logicConsistency:
      year1Result <= year1MaxAffordableUnits &&
      year2Result <= year2MaxAffordableUnits
        ? "Consistent"
        : "Inconsistent",
    cashFlowLogic: "Prohibits negative cash flow purchases",
  };

  console.log("\n📋 TEST SUMMARY");
  console.log("===============");
  console.log(
    `Year 1: Selected ${year1Result} units (Max affordable: ${year1MaxAffordableUnits})`
  );
  console.log(
    `Year 2: Selected ${year2Result} units (Max affordable: ${year2MaxAffordableUnits})`
  );
  console.log(`Total after 2 years: ${year1Result + year2Result} units`);
  console.log(`Logic consistency: ${testResults.summary.logicConsistency}`);

  return testResults;
}

// Run the tests
const results = runUnitPurchaseTests();

// Export results for analysis
console.log("\n📊 DETAILED TEST RESULTS");
console.log("========================");
console.log(JSON.stringify(results, null, 2));

// Save results to file (if running in Node.js environment)
if (typeof module !== "undefined" && module.exports) {
  const fs = require("fs");
  fs.writeFileSync(
    "unit_purchase_test_results.json",
    JSON.stringify(results, null, 2)
  );
  console.log("\n💾 Results saved to unit_purchase_test_results.json");
}
