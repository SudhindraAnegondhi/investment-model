// Web Worker for Heavy Calculations
// Handles complex financial calculations without blocking the main thread

// Worker loaded successfully

// Import calculation utilities (for worker context)
let utils, dataModel;

// Worker message handler
self.onmessage = function (e) {
  const { type, data } = e.data;

  try {
    switch (type) {
      case "CALCULATE_SCENARIOS":
        console.log("🔍 WORKER: CALCULATE_SCENARIOS message received");
        const results = performCalculations(data);
        console.log("🔍 WORKER: Calculations completed, sending results");
        console.log("🔍 WORKER: Sending message:", {
          type: "CALCULATION_COMPLETE",
          data: results,
        });

        // Try sending a simple test message first
        console.log("🔍 WORKER: Sending test message");
        self.postMessage({ type: "TEST", message: "Worker is working" });

        // Then send the actual results
        self.postMessage({ type: "CALCULATION_COMPLETE", data: results });
        break;

      case "SENSITIVITY_ANALYSIS":
        const sensitivityResults = performSensitivityAnalysis(data);
        self.postMessage({
          type: "SENSITIVITY_COMPLETE",
          data: sensitivityResults,
        });
        break;

      case "MONTE_CARLO":
        const monteCarloResults = performMonteCarloSimulation(data);
        self.postMessage({
          type: "MONTE_CARLO_COMPLETE",
          data: monteCarloResults,
        });
        break;

      default:
        self.postMessage({ type: "ERROR", error: "Unknown calculation type" });
    }
  } catch (error) {
    self.postMessage({
      type: "ERROR",
      error: error.message,
      stack: error.stack,
    });
  }
};

// Core calculation functions (duplicated for worker context)

// Data structures for worker
class InvestmentCohort {
  constructor(year, units, costPerUnit, loanAmount = 0) {
    this.year = year;
    this.units = units;
    this.costPerUnit = costPerUnit;
    this.loanAmount = loanAmount;
    this.monthlyEMI = 0;
    this.annualEMI = 0;
  }
}

class YearlyMetrics {
  constructor() {
    this.units = 0;
    this.newUnits = 0;
    this.cashFlow = 0;
    this.cumulativeCashFlow = 0;
    this.assetValue = 0;
    this.netWorth = 0;
    this.loanBalance = 0;
    this.netEquity = 0;
    this.gpr = 0;
    this.egi = 0;
    this.noi = 0;
    this.depreciation = 0;
    this.debtService = 0;
    this.taxableIncome = 0;
    this.taxes = 0;
    this.netIncome = 0;
    this.capex = 0;
    this.interestExpense = 0; // Added for P&L display
  }
}

class CalculationResults {
  constructor() {
    this.selfFinanced = [];
    this.financed = [];
    this.comparison = [];
    this.detailedData = [];
    this.inputParams = null;
    this.sensitivityResults = null;
    this.breakEvenResults = null;
  }
}

// Main calculation function
function performCalculations(params) {
  // Use the main calculation logic from calculations.js
  // This ensures consistency with the original calculations
  const results = new CalculationResults();
  results.inputParams = params;

  // Initialize arrays for 15 years
  for (let year = 1; year <= 15; year++) {
    results.selfFinanced.push(new YearlyMetrics());
    results.financed.push(new YearlyMetrics());
    results.comparison.push({});
    results.detailedData.push({
      selfCumulativeCapEx: 0,
      financedCumulativeCapEx: 0,
    });
  }

  // Calculate self-financed scenario
  calculateSelfFinanced(params, results);

  // Calculate financed scenario
  calculateFinanced(params, results);

  // Calculate comparison metrics
  calculateComparison(results);

  // Calculate break-even analysis
  calculateBreakEven(results);

  return results;
}

// Self-financed scenario calculation
function calculateSelfFinanced(params, results) {
  const cohorts = [];
  let cumulativeCF = 0;
  let cumulativeCapEx = 0;

  // Create purchase cohorts
  for (
    let purchaseYear = 1;
    purchaseYear <= params.selfPurchaseYears;
    purchaseYear++
  ) {
    const unitsThisYear = Math.floor(params.annualBudget / params.initialCost);
    const costPerUnit =
      params.initialCost *
      Math.pow(1 + params.costIncrease / 100, purchaseYear - 1);

    cohorts.push(
      new InvestmentCohort(purchaseYear, unitsThisYear, costPerUnit)
    );
  }

  // Calculate yearly metrics
  for (let year = 1; year <= 15; year++) {
    const yearMetrics = results.selfFinanced[year - 1];

    // Calculate units owned
    yearMetrics.units = cohorts
      .filter((c) => c.year <= year)
      .reduce((sum, c) => sum + c.units, 0);

    yearMetrics.newUnits = cohorts
      .filter((c) => c.year === year)
      .reduce((sum, c) => sum + c.units, 0);

    // Calculate asset value with appreciation
    yearMetrics.assetValue = cohorts.reduce((sum, cohort) => {
      const yearsHeld = Math.max(0, year - cohort.year + 1);
      const appreciatedValue =
        cohort.costPerUnit *
        cohort.units *
        Math.pow(1 + params.appreciationRate / 100, yearsHeld);
      return sum + appreciatedValue;
    }, 0);

    // Calculate rental income and expenses
    yearMetrics.gpr = cohorts.reduce((sum, cohort) => {
      if (cohort.year <= year) {
        const yearsHeld = year - cohort.year + 1;
        const currentRental =
          cohort.costPerUnit *
          (params.rentalRate / 100) *
          cohort.units *
          Math.pow(1 + params.rentGrowthRate / 100, yearsHeld - 1);
        return sum + currentRental;
      }
      return sum;
    }, 0);

    // Effective Gross Income (after vacancy)
    yearMetrics.egi = yearMetrics.gpr * (1 - params.vacancyRate / 100);

    // Interest expense (0 for self-financed since no loans)
    yearMetrics.interestExpense = 0;

    // Operating expenses
    const insurance =
      params.insurance *
      yearMetrics.units *
      Math.pow(1 + params.insuranceInflation / 100, year - 1);
    const maintenance = yearMetrics.assetValue * (params.maintenanceRate / 100);
    const management = yearMetrics.egi * (params.managementRate / 100);
    const propertyTaxes = calculatePropertyTaxes(
      yearMetrics.assetValue,
      params,
      year
    );

    const totalExpenses =
      insurance +
      maintenance +
      management +
      propertyTaxes +
      yearMetrics.interestExpense;

    // Net Operating Income (includes interest expense)
    yearMetrics.noi = yearMetrics.egi - totalExpenses;

    // CapEx (cash charge only, not included in NOI)
    yearMetrics.capex = yearMetrics.assetValue * (params.capexRate / 100);
    cumulativeCapEx += yearMetrics.capex;

    // Depreciation
    yearMetrics.depreciation = cohorts.reduce((sum, cohort) => {
      if (cohort.year <= year) {
        const buildingValue =
          cohort.costPerUnit * cohort.units * (1 - params.landPercent / 100);
        return sum + buildingValue / 27.5; // 27.5 years straight-line depreciation
      }
      return sum;
    }, 0);

    // Taxable income and taxes (NOI already includes interest expense)
    yearMetrics.taxableIncome = yearMetrics.noi - yearMetrics.depreciation;

    if (params.passthroughLLC === "yes" && yearMetrics.taxableIncome > 0) {
      yearMetrics.taxes =
        yearMetrics.taxableIncome * (params.incomeTaxRate / 100);
    } else {
      yearMetrics.taxes = 0;
    }

    // Net income after taxes
    yearMetrics.netIncome = yearMetrics.noi - yearMetrics.taxes;

    // Cash flow (net income minus CapEx)
    yearMetrics.cashFlow = yearMetrics.netIncome - yearMetrics.capex;
    cumulativeCF += yearMetrics.cashFlow;
    yearMetrics.cumulativeCashFlow = cumulativeCF;

    // Net worth calculation
    yearMetrics.netWorth = yearMetrics.assetValue; // No loans to subtract
    yearMetrics.netEquity = yearMetrics.assetValue;

    // Store cumulative CapEx for detailed analysis
    results.detailedData[year - 1].selfCumulativeCapEx = cumulativeCapEx;
  }
}

// Financed scenario calculation
function calculateFinanced(params, results) {
  const cohorts = [];
  let cumulativeCF = 0;
  let cumulativeCapEx = 0;

  // Create purchase cohorts with financing
  for (
    let purchaseYear = 1;
    purchaseYear <= params.financedPurchaseYears;
    purchaseYear++
  ) {
    let unitsThisYear = Math.floor(
      params.annualBudget / (params.initialCost * (1 - params.ltvRatio / 100))
    );

    // Apply max units financed limit
    if (purchaseYear <= params.maxUnitsFinancedLimitYears) {
      unitsThisYear = Math.min(unitsThisYear, params.maxUnitsFinanced);
    }

    const costPerUnit =
      params.initialCost *
      Math.pow(1 + params.costIncrease / 100, purchaseYear - 1);
    const loanAmount = costPerUnit * (params.ltvRatio / 100) * unitsThisYear;

    const cohort = new InvestmentCohort(
      purchaseYear,
      unitsThisYear,
      costPerUnit,
      loanAmount
    );

    // Calculate EMI
    const monthlyRate = params.interestRate / 100 / 12;
    const numPayments = params.loanTerm * 12;

    if (monthlyRate > 0) {
      cohort.monthlyEMI =
        (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) /
        (Math.pow(1 + monthlyRate, numPayments) - 1);
    } else {
      cohort.monthlyEMI = loanAmount / numPayments;
    }

    cohort.annualEMI = cohort.monthlyEMI * 12;

    cohorts.push(cohort);
  }

  // Calculate yearly metrics
  for (let year = 1; year <= 15; year++) {
    const yearMetrics = results.financed[year - 1];

    // Calculate units owned
    yearMetrics.units = cohorts
      .filter((c) => c.year <= year)
      .reduce((sum, c) => sum + c.units, 0);

    yearMetrics.newUnits = cohorts
      .filter((c) => c.year === year)
      .reduce((sum, c) => sum + c.units, 0);

    // Calculate asset value with appreciation
    yearMetrics.assetValue = cohorts.reduce((sum, cohort) => {
      const yearsHeld = Math.max(0, year - cohort.year + 1);
      const appreciatedValue =
        cohort.costPerUnit *
        cohort.units *
        Math.pow(1 + params.appreciationRate / 100, yearsHeld);
      return sum + appreciatedValue;
    }, 0);

    // Calculate loan balances
    yearMetrics.loanBalance = cohorts.reduce((sum, cohort) => {
      if (cohort.year <= year) {
        const monthsElapsed = (year - cohort.year) * 12;
        const monthlyRate = params.interestRate / 100 / 12;
        const numPayments = params.loanTerm * 12;

        if (monthsElapsed >= numPayments || monthlyRate === 0) {
          return sum; // Loan paid off
        }

        const remainingBalance =
          (cohort.loanAmount *
            (Math.pow(1 + monthlyRate, numPayments) -
              Math.pow(1 + monthlyRate, monthsElapsed))) /
          (Math.pow(1 + monthlyRate, numPayments) - 1);

        return sum + Math.max(0, remainingBalance);
      }
      return sum;
    }, 0);

    // Calculate rental income (same as self-financed)
    yearMetrics.gpr = cohorts.reduce((sum, cohort) => {
      if (cohort.year <= year) {
        const yearsHeld = year - cohort.year + 1;
        const currentRental =
          cohort.costPerUnit *
          (params.rentalRate / 100) *
          cohort.units *
          Math.pow(1 + params.rentGrowthRate / 100, yearsHeld - 1);
        return sum + currentRental;
      }
      return sum;
    }, 0);

    // Effective Gross Income
    yearMetrics.egi = yearMetrics.gpr * (1 - params.vacancyRate / 100);

    // Calculate interest expense first
    const interestExpense = calculateInterestExpense(cohorts, year, params);
    yearMetrics.interestExpense = interestExpense;

    // CRITICAL DEBUG: Check if interest is being calculated
    if (year === 1) {
      console.log(`🔍 YEAR 1 INTEREST EXPENSE: ${interestExpense}`);
      console.log(`🔍 YEAR 1 COHORTS COUNT: ${cohorts.length}`);
      console.log(`🔍 YEAR 1 INTEREST RATE: ${params.interestRate}%`);
    }

    // Operating expenses
    const insurance =
      params.insurance *
      yearMetrics.units *
      Math.pow(1 + params.insuranceInflation / 100, year - 1);
    const maintenance = yearMetrics.assetValue * (params.maintenanceRate / 100);
    const management = yearMetrics.egi * (params.managementRate / 100);
    const propertyTaxes = calculatePropertyTaxes(
      yearMetrics.assetValue,
      params,
      year
    );

    const totalExpenses =
      insurance + maintenance + management + propertyTaxes + interestExpense;

    // Net Operating Income (includes interest expense)
    yearMetrics.noi = yearMetrics.egi - totalExpenses;

    // Debt service
    yearMetrics.debtService = cohorts.reduce((sum, cohort) => {
      if (cohort.year <= year) {
        const monthsElapsed = (year - cohort.year) * 12;
        const numPayments = params.loanTerm * 12;

        if (monthsElapsed < numPayments) {
          return sum + cohort.annualEMI;
        }
      }
      return sum;
    }, 0);

    // CapEx (cash charge only, not included in NOI)
    yearMetrics.capex = yearMetrics.assetValue * (params.capexRate / 100);
    cumulativeCapEx += yearMetrics.capex;

    // Depreciation
    yearMetrics.depreciation = cohorts.reduce((sum, cohort) => {
      if (cohort.year <= year) {
        const buildingValue =
          cohort.costPerUnit * cohort.units * (1 - params.landPercent / 100);
        return sum + buildingValue / 27.5;
      }
      return sum;
    }, 0);

    // Calculate taxable income (NOI already includes interest expense)
    yearMetrics.taxableIncome = yearMetrics.noi - yearMetrics.depreciation;

    if (params.passthroughLLC === "yes" && yearMetrics.taxableIncome > 0) {
      yearMetrics.taxes =
        yearMetrics.taxableIncome * (params.incomeTaxRate / 100);
    } else {
      yearMetrics.taxes = 0;
    }

    // Net income after taxes
    yearMetrics.netIncome = yearMetrics.noi - yearMetrics.taxes;

    // Cash flow (net income minus debt service and CapEx)
    yearMetrics.cashFlow =
      yearMetrics.netIncome - yearMetrics.debtService - yearMetrics.capex;
    cumulativeCF += yearMetrics.cashFlow;
    yearMetrics.cumulativeCashFlow = cumulativeCF;

    // Net worth calculation
    yearMetrics.netWorth = yearMetrics.assetValue - yearMetrics.loanBalance;
    yearMetrics.netEquity = yearMetrics.netWorth;

    // Store cumulative CapEx
    results.detailedData[year - 1].financedCumulativeCapEx = cumulativeCapEx;
  }
}

// Helper function to calculate property taxes
function calculatePropertyTaxes(assetValue, params, year) {
  const assessedValue = assetValue * (params.assessedValuePercent / 100);
  const currentTaxRate =
    params.taxRate *
    Math.pow(1 + (params.assessedGrowthRate || 2.5) / 100, year - 1);
  return assessedValue * (currentTaxRate / 100);
}

// Helper function to calculate interest expense for tax purposes
function calculateInterestExpense(cohorts, year, params) {
  let totalInterest = 0;

  // CRITICAL DEBUG: Check if function is called
  if (year === 1) {
    console.log(`🔍 CALCULATE INTEREST CALLED for Year ${year}`);
    console.log(`🔍 COHORTS:`, cohorts);
    console.log(`🔍 PARAMS:`, {
      interestRate: params.interestRate,
      loanTerm: params.loanTerm,
    });
  }

  cohorts.forEach((cohort) => {
    if (cohort.year <= year) {
      const monthsElapsed = (year - cohort.year) * 12;
      const monthlyRate = params.interestRate / 100 / 12;
      const numPayments = params.loanTerm * 12;

      if (monthsElapsed < numPayments && monthlyRate > 0) {
        // Calculate interest component from EMI for the year
        let cohortInterest = 0;
        for (let month = 0; month < 12; month++) {
          const currentMonth = monthsElapsed + month;
          if (currentMonth < numPayments) {
            // Calculate remaining balance at the start of this month
            const balanceAtMonth =
              (cohort.loanAmount *
                (Math.pow(1 + monthlyRate, numPayments) -
                  Math.pow(1 + monthlyRate, currentMonth))) /
              (Math.pow(1 + monthlyRate, numPayments) - 1);

            // Interest component of EMI = remaining balance * monthly rate
            const monthlyInterest = Math.max(0, balanceAtMonth) * monthlyRate;
            cohortInterest += monthlyInterest;
          }
        }
        totalInterest += cohortInterest;

        // CRITICAL DEBUG: Check each cohort calculation
        if (year === 1) {
          console.log(
            `🔍 COHORT ${
              cohort.year
            }: loanAmount=$${cohort.loanAmount.toLocaleString()}, cohortInterest=$${cohortInterest.toLocaleString()}`
          );
        }
      }
    }
  });

  // CRITICAL DEBUG: Final result
  if (year === 1) {
    console.log(
      `🔍 TOTAL INTEREST for Year ${year}: $${totalInterest.toLocaleString()}`
    );
  }

  return totalInterest;
}

// Calculate comparison metrics
function calculateComparison(results) {
  for (let year = 0; year < 15; year++) {
    const selfData = results.selfFinanced[year];
    const financedData = results.financed[year];

    results.comparison[year] = {
      // Property cost (same for both scenarios in this model)
      propertyCost: selfData.assetValue / Math.max(1, selfData.units),

      // Self-financed metrics
      selfNewUnits: selfData.newUnits,
      selfTotalUnits: selfData.units,
      selfCashFlow: selfData.cashFlow,
      selfAssetValue: selfData.assetValue,

      // Financed metrics
      financedNewUnits: financedData.newUnits,
      financedTotalUnits: financedData.units,
      financedCashFlow: financedData.cashFlow,
      financedAssetValue: financedData.assetValue,

      // Loan and equity metrics
      loanBalance: financedData.loanBalance,
      netEquity: financedData.netEquity,

      // Difference metrics (for compatibility)
      netWorthDiff: selfData.netWorth - financedData.netWorth,
      cashFlowDiff: selfData.cashFlow - financedData.cashFlow,
      cumulativeCFDiff:
        selfData.cumulativeCashFlow - financedData.cumulativeCashFlow,
      unitsDiff: selfData.units - financedData.units,
    };
  }
}

// Calculate break-even analysis
function calculateBreakEven(results) {
  const selfBreakEven = results.selfFinanced.findIndex(
    (year) => year.cumulativeCashFlow > 0
  );
  const financedBreakEven = results.financed.findIndex(
    (year) => year.cumulativeCashFlow > 0
  );

  results.breakEvenResults = {
    selfFinancedBreakEven: selfBreakEven >= 0 ? selfBreakEven + 1 : null,
    financedBreakEven: financedBreakEven >= 0 ? financedBreakEven + 1 : null,
  };
}

// Sensitivity Analysis
function performSensitivityAnalysis(data) {
  const { baseParams, parameters } = data;
  const results = [];

  parameters.forEach((param) => {
    const result = {
      parameter: param.name,
      key: param.key,
      baseValue: baseParams[param.key],
      scenarios: [],
    };

    // Test different variations
    const variations = [-0.2, -0.1, -0.05, 0.05, 0.1, 0.2];

    variations.forEach((variation) => {
      const testParams = { ...baseParams };
      testParams[param.key] = baseParams[param.key] * (1 + variation);

      const testResults = performCalculations(testParams);
      const finalYear = testResults.selfFinanced[14];

      result.scenarios.push({
        variation: variation,
        newValue: testParams[param.key],
        netWorth: finalYear.netWorth,
        cashFlow: finalYear.cumulativeCashFlow,
        roi: calculateROI(testResults.selfFinanced, testParams),
      });
    });

    results.push(result);
  });

  return results;
}

// Monte Carlo Simulation
function performMonteCarloSimulation(data) {
  const { baseParams, numSimulations = 1000, variableParams } = data;
  const results = {
    simulations: [],
    statistics: {},
  };

  for (let i = 0; i < numSimulations; i++) {
    // Generate random parameters based on distributions
    const randomParams = { ...baseParams };

    variableParams.forEach((param) => {
      // Assume normal distribution for simplicity
      const randomValue = generateNormalRandom(param.mean, param.stdDev);
      randomParams[param.key] = Math.max(0, randomValue); // Ensure positive values
    });

    const simulationResult = performCalculations(randomParams);
    const finalYear = simulationResult.selfFinanced[14];

    results.simulations.push({
      parameters: randomParams,
      finalNetWorth: finalYear.netWorth,
      finalCashFlow: finalYear.cumulativeCashFlow,
      roi: calculateROI(simulationResult.selfFinanced, randomParams),
    });

    // Progress reporting
    if (i % 100 === 0) {
      self.postMessage({
        type: "MONTE_CARLO_PROGRESS",
        progress: (i / numSimulations) * 100,
      });
    }
  }

  // Calculate statistics
  const netWorths = results.simulations.map((s) => s.finalNetWorth);
  const cashFlows = results.simulations.map((s) => s.finalCashFlow);
  const rois = results.simulations.map((s) => s.roi);

  results.statistics = {
    netWorth: calculateStatistics(netWorths),
    cashFlow: calculateStatistics(cashFlows),
    roi: calculateStatistics(rois),
  };

  return results;
}

// Helper function to generate normal random numbers (Box-Muller transform)
function generateNormalRandom(mean, stdDev) {
  let u = 0,
    v = 0;
  while (u === 0) u = Math.random(); // Converting [0,1) to (0,1)
  while (v === 0) v = Math.random();

  const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
  return mean + stdDev * z;
}

// Calculate statistics for arrays
function calculateStatistics(values) {
  values.sort((a, b) => a - b);
  const n = values.length;

  return {
    min: values[0],
    max: values[n - 1],
    mean: values.reduce((a, b) => a + b, 0) / n,
    median:
      n % 2 === 0
        ? (values[n / 2 - 1] + values[n / 2]) / 2
        : values[Math.floor(n / 2)],
    percentile5: values[Math.floor(n * 0.05)],
    percentile95: values[Math.floor(n * 0.95)],
    stdDev: Math.sqrt(
      values.reduce(
        (sq, v) => sq + Math.pow(v - values.reduce((a, b) => a + b, 0) / n, 2),
        0
      ) /
        (n - 1)
    ),
  };
}

// Calculate ROI
function calculateROI(yearlyData, params) {
  const totalInvested = params.annualBudget * params.selfPurchaseYears;
  const finalNetWorth = yearlyData[yearlyData.length - 1].netWorth;
  return ((finalNetWorth - totalInvested) / totalInvested) * 100;
}
