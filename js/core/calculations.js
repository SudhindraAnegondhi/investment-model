// Core Calculations
// Main calculation engine for the rental investment model

// Main calculation function
function calculateAll() {
  try {
    const params = utils.getInputParameters();
    const validation = dataModel.validateInvestmentParameters(params);

    if (!validation.isValid) {
      alert(
        "Please fix the following errors:\n" + validation.errors.join("\n")
      );
      return;
    }

    // Perform calculations
    const results = performCalculations(params);

    // Store results globally
    utils.calculationResults = results;

    // Update all UI components
    updateAllTables();

    console.log("Calculations completed successfully");
  } catch (error) {
    utils.handleError(error, "calculateAll");
    alert(
      "An error occurred during calculations. Please check the console for details."
    );
  }
}

// Enhanced calculation function with detailed P&L and Balance Sheet
function performCalculations(params) {
  const results = new dataModel.CalculationResults();
  results.inputParams = params;

  // Initialize arrays for 15 years
  for (let year = 1; year <= 15; year++) {
    results.selfFinanced.push(new dataModel.YearlyMetrics());
    results.financed.push(new dataModel.YearlyMetrics());
    results.comparison.push({});
    results.detailedData.push({
      selfCumulativeCapEx: 0,
      financedCumulativeCapEx: 0,
    });
  }

  // Track cohorts for each strategy
  const selfCohorts = [];
  const financedCohorts = [];
  const financedLoans = [];

  // Initialize cumulative CapEx and available cash
  let selfCumulativeCapEx = 0;
  let financedCumulativeCapEx = 0;
  let selfAvailableCash = 0;
  let financedAvailableCash = 0;

  // Main calculation loop
  for (let year = 1; year <= 15; year++) {
    const selfMetrics = results.selfFinanced[year - 1];
    const financedMetrics = results.financed[year - 1];

    // Use exact same property cost calculation as original
    const propertyCost = params.initialCost * Math.pow(1.01, year - 1);

    // Self-financed strategy - add annual budget only during purchase years
    if (year <= params.selfPurchaseYears) {
      selfAvailableCash += params.annualBudget;
    }

    // Continue purchasing with available cash (including cash flows from previous years)
    let selfNewUnits = 0;
    if (selfAvailableCash >= propertyCost * 1.02) {
      // Including 2% closing costs (exact same as original)
      selfNewUnits = Math.floor(selfAvailableCash / (propertyCost * 1.02));
      const totalCost = selfNewUnits * propertyCost * 1.02;
      selfAvailableCash -= totalCost;

      if (selfNewUnits > 0) {
        selfCohorts.push({
          yearOriginated: year,
          units: selfNewUnits,
          costPerUnit: propertyCost,
        });
        selfMetrics.newUnits = selfNewUnits;
      }
    }

    // Bank-financed strategy - add annual budget only during purchase years
    // NOTE: Original uses selfPurchaseYears for both strategies
    if (year <= params.selfPurchaseYears) {
      financedAvailableCash += params.annualBudget;
    }

    // Continue purchasing with available cash (including cash flows from previous years)
    let financedNewUnits = 0;
    const downPayment = propertyCost * (1 - params.ltvRatio / 100) * 1.03; // Including 3% closing costs (exact same as original)

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

        // Track loans for interest calculations
        financedLoans.push({
          units: financedNewUnits,
          loanAmountPerUnit: propertyCost * (params.ltvRatio / 100),
          yearOriginated: year,
          interestRate: params.interestRate / 100,
          term: params.loanTerm,
        });

        financedMetrics.newUnits = financedNewUnits;
      }
    }

    // Calculate total units
    const selfTotalUnits = selfCohorts.reduce(
      (total, cohort) => total + cohort.units,
      0
    );
    const financedTotalUnits = financedCohorts.reduce(
      (total, cohort) => total + cohort.units,
      0
    );

    // Calculate metrics for both strategies using original signature
    const selfDetailed = calculateDetailedMetricsOriginal(
      year,
      selfCohorts,
      params,
      selfTotalUnits,
      [] // No loans for self-financed
    );
    const financedDetailed = calculateDetailedMetricsOriginal(
      year,
      financedCohorts,
      params,
      financedTotalUnits,
      financedLoans
    );

    // Cash flow calculations (matching original)
    const selfCashFlow =
      selfDetailed.noi - selfDetailed.capex - selfDetailed.taxes;
    const financedCashFlow =
      financedDetailed.noi -
      financedDetailed.debtService -
      financedDetailed.capex -
      financedDetailed.taxes;

    // Update cumulative CapEx
    selfCumulativeCapEx += selfDetailed.capex;
    financedCumulativeCapEx += financedDetailed.capex;

    // Apply S&P 500 returns to CapEx reserves (exact same as original)
    const sp500Return = 0.1;
    if (year > 1) {
      selfCumulativeCapEx = selfCumulativeCapEx * (1 + sp500Return);
      financedCumulativeCapEx = financedCumulativeCapEx * (1 + sp500Return);
    }

    // Add positive cash flows to available cash (exact same as original)
    if (selfCashFlow > 0) {
      selfAvailableCash += selfCashFlow;
    }
    if (financedCashFlow > 0) {
      financedAvailableCash += financedCashFlow;
    }

    // Calculate cumulative cash flows
    const selfCumulativeCash =
      results.selfFinanced
        .slice(0, year - 1)
        .reduce((sum, yearData) => sum + yearData.cashFlow, 0) + selfCashFlow;
    const financedCumulativeCash =
      results.financed
        .slice(0, year - 1)
        .reduce((sum, yearData) => sum + yearData.cashFlow, 0) +
      financedCashFlow;

    // Calculate asset values
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

    // Update metrics
    Object.assign(selfMetrics, {
      units: selfTotalUnits,
      cashFlow: selfCashFlow,
      cumulativeCashFlow: selfCumulativeCash,
      assetValue: selfAssetValue,
      netWorth: selfAssetValue + selfCumulativeCash,
      gpr: selfDetailed.gpr,
      egi: selfDetailed.egi,
      noi: selfDetailed.noi,
      depreciation: selfDetailed.depreciation,
      debtService: selfDetailed.debtService,
      taxableIncome: selfDetailed.taxableIncome,
      taxes: selfDetailed.taxes,
      netIncome: selfDetailed.netIncome,
      capex: selfDetailed.capex,
    });

    Object.assign(financedMetrics, {
      units: financedTotalUnits,
      cashFlow: financedCashFlow,
      cumulativeCashFlow: financedCumulativeCash,
      assetValue: financedAssetValue,
      loanBalance: loanBalance,
      netWorth: financedAssetValue - loanBalance + financedCumulativeCash,
      gpr: financedDetailed.gpr,
      egi: financedDetailed.egi,
      noi: financedDetailed.noi,
      depreciation: financedDetailed.depreciation,
      debtService: financedDetailed.debtService,
      taxableIncome: financedDetailed.taxableIncome,
      taxes: financedDetailed.taxes,
      netIncome: financedDetailed.netIncome,
      capex: financedDetailed.capex,
    });

    // Store cumulative CapEx
    results.detailedData[year - 1].selfCumulativeCapEx = selfCumulativeCapEx;
    results.detailedData[year - 1].financedCumulativeCapEx =
      financedCumulativeCapEx;

    // Update comparison data (exact same structure as original)
    results.comparison[year - 1] = {
      year: year,
      propertyCost: propertyCost,
      selfNewUnits: selfMetrics.newUnits,
      selfTotalUnits: selfTotalUnits,
      selfCashFlow: selfCashFlow,
      selfAssetValue: selfAssetValue,
      financedNewUnits: financedMetrics.newUnits,
      financedTotalUnits: financedTotalUnits,
      financedCashFlow: financedCashFlow,
      financedAssetValue: financedAssetValue,
      loanBalance: loanBalance,
      netEquity: financedAssetValue - loanBalance,
    };
  }

  return results;
}

// Calculate detailed metrics using exact same logic as original
function calculateDetailedMetricsOriginal(
  year,
  cohorts,
  params,
  totalUnits,
  loans
) {
  let gpr = 0; // Gross Potential Rent
  let propertyTax = 0;
  let depreciation = 0;

  // Calculate income from all cohorts (exact same as original)
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

// Calculate asset value using exact same logic as original
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

// Calculate loan balance using exact same logic as original
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

// Calculate bank-financed purchases with optimization (keeping for future use)
function calculateBankFinancedPurchases(
  params,
  year,
  existingCohorts,
  currentCash
) {
  const maxUnits = params.maxUnitsFinanced;
  const maxYears = params.maxUnitsFinancedLimitYears;

  // Check if we're within the limit years
  if (year > maxYears) {
    return { unitsToPurchase: 0, remainingCash: 0, projectedAnnualCashFlow: 0 };
  }

  const costPerUnit =
    params.initialCost * Math.pow(1 + params.costIncrease / 100, year - 1);
  const downPaymentPercent = (100 - params.ltvRatio) / 100;
  const downPaymentPerUnit = costPerUnit * downPaymentPercent;
  const closingCostsPerUnit = costPerUnit * (params.closingCostPercent / 100);
  const upfrontCostPerUnit = downPaymentPerUnit + closingCostsPerUnit;

  // Calculate how many units we can afford
  const availableCash = params.annualBudget + currentCash;
  const maxAffordableUnits = Math.floor(availableCash / upfrontCostPerUnit);
  const unitsToConsider = Math.min(maxUnits, maxAffordableUnits);

  if (unitsToConsider === 0) {
    return {
      unitsToPurchase: 0,
      remainingCash: availableCash,
      projectedAnnualCashFlow: 0,
    };
  }

  // Calculate loan amount and EMI
  const loanAmountPerUnit = costPerUnit * (params.ltvRatio / 100);
  const monthlyRate = params.interestRate / 100 / 12;
  const totalPayments = params.loanTerm * 12;
  const monthlyEMI =
    (loanAmountPerUnit *
      (monthlyRate * Math.pow(1 + monthlyRate, totalPayments))) /
    (Math.pow(1 + monthlyRate, totalPayments) - 1);
  const annualEMI = monthlyEMI * 12;

  // Calculate NOI per unit
  const monthlyRent = costPerUnit * (params.rentalRate / 100);
  const annualRent = monthlyRent * 12;
  const vacancyLoss = annualRent * (params.vacancyRate / 100);
  const effectiveGrossIncome = annualRent - vacancyLoss;
  const managementFee = effectiveGrossIncome * (params.managementRate / 100);
  const maintenance = effectiveGrossIncome * (params.maintenanceRate / 100);
  const propertyTax = costPerUnit * (params.taxRate / 100);
  const insurance = params.insurance;
  const capex = effectiveGrossIncome * (params.capexRate / 100);
  const noiPerUnit =
    effectiveGrossIncome -
    managementFee -
    maintenance -
    propertyTax -
    insurance -
    capex;

  // Find optimal number of units
  let optimalUnits = 0;
  let optimalCashFlow = 0;
  let remainingCash = availableCash;

  for (let units = 1; units <= unitsToConsider; units++) {
    const totalUpfrontCost = units * upfrontCostPerUnit;
    const totalAnnualEMI = units * annualEMI;
    const totalNOI = units * noiPerUnit;
    const netCashFlow = totalNOI - totalAnnualEMI;

    if (totalUpfrontCost <= availableCash && netCashFlow >= 0) {
      optimalUnits = units;
      optimalCashFlow = netCashFlow;
      remainingCash = availableCash - totalUpfrontCost;
    }
  }

  return {
    unitsToPurchase: optimalUnits,
    remainingCash: remainingCash,
    projectedAnnualCashFlow: optimalCashFlow,
    loanAmount: optimalUnits * loanAmountPerUnit,
  };
}

// Calculate detailed metrics for a given year (keeping for future use)
function calculateDetailedMetrics(year, cohorts, params, cumulativeCapEx) {
  const metrics = new dataModel.YearlyMetrics();

  if (cohorts.length === 0) {
    return metrics;
  }

  // Calculate total units and new units
  metrics.units = cohorts.reduce((total, cohort) => total + cohort.units, 0);
  metrics.newUnits = cohorts
    .filter((cohort) => cohort.year === year)
    .reduce((total, cohort) => total + cohort.units, 0);

  // Calculate GPR (Gross Potential Rent)
  let totalGPR = 0;
  for (const cohort of cohorts) {
    const yearsSincePurchase = year - cohort.year;
    const rentGrowth = Math.pow(
      1 + params.rentGrowthRate / 100,
      yearsSincePurchase
    );
    const monthlyRent =
      cohort.costPerUnit * (params.rentalRate / 100) * rentGrowth;
    const annualRent = monthlyRent * 12;
    totalGPR += annualRent * cohort.units;
  }
  metrics.gpr = totalGPR;

  // Calculate EGI (Effective Gross Income)
  const vacancyLoss = totalGPR * (params.vacancyRate / 100);
  metrics.egi = totalGPR - vacancyLoss;

  // Calculate NOI (Net Operating Income)
  const managementFee = metrics.egi * (params.managementRate / 100);
  const maintenance = metrics.egi * (params.maintenanceRate / 100);

  let totalPropertyTax = 0;
  let totalInsurance = 0;
  for (const cohort of cohorts) {
    const yearsSincePurchase = year - cohort.year;
    const assessedValueGrowth = Math.pow(
      1 + params.assessedGrowthRate / 100,
      yearsSincePurchase
    );
    const assessedValue =
      cohort.costPerUnit *
      (params.assessedValuePercent / 100) *
      assessedValueGrowth;
    totalPropertyTax += assessedValue * (params.taxRate / 100) * cohort.units;

    const insuranceGrowth = Math.pow(
      1 + params.insuranceInflation / 100,
      yearsSincePurchase
    );
    totalInsurance += params.insurance * insuranceGrowth * cohort.units;
  }

  metrics.capex = metrics.egi * (params.capexRate / 100);
  metrics.noi =
    metrics.egi -
    managementFee -
    maintenance -
    totalPropertyTax -
    totalInsurance -
    metrics.capex;

  // Calculate depreciation
  let totalDepreciation = 0;
  for (const cohort of cohorts) {
    const buildingValue = cohort.costPerUnit * (1 - params.landPercent / 100);
    const annualDepreciation = buildingValue / 27.5; // 27.5 years for residential
    totalDepreciation += annualDepreciation * cohort.units;
  }
  metrics.depreciation = totalDepreciation;

  // Calculate debt service
  let totalDebtService = 0;
  for (const cohort of cohorts) {
    if (cohort.loanAmount > 0) {
      const monthlyRate = params.interestRate / 100 / 12;
      const totalPayments = params.loanTerm * 12;
      const monthsElapsed = (year - cohort.year) * 12;
      const remainingPayments = Math.max(0, totalPayments - monthsElapsed);

      if (remainingPayments > 0) {
        const monthlyEMI =
          (cohort.loanAmount *
            (monthlyRate * Math.pow(1 + monthlyRate, totalPayments))) /
          (Math.pow(1 + monthlyRate, totalPayments) - 1);
        const annualEMI = monthlyEMI * 12;
        totalDebtService += annualEMI;
      }
    }
  }
  metrics.debtService = totalDebtService;

  // Calculate taxable income and taxes
  metrics.taxableIncome =
    metrics.noi - metrics.depreciation - metrics.debtService;
  if (params.passthroughLLC === "yes") {
    metrics.taxes = metrics.taxableIncome * (params.incomeTaxRate / 100);
  } else {
    // Corporate tax calculation would go here
    metrics.taxes = metrics.taxableIncome * 0.21; // 21% corporate rate
  }

  metrics.netIncome = metrics.taxableIncome - metrics.taxes;

  // Calculate cash flow
  metrics.cashFlow = metrics.noi - metrics.debtService - metrics.taxes;

  // Calculate asset value
  let totalAssetValue = 0;
  for (const cohort of cohorts) {
    const yearsSincePurchase = year - cohort.year;
    const appreciation = Math.pow(
      1 + params.appreciationRate / 100,
      yearsSincePurchase
    );
    totalAssetValue += cohort.costPerUnit * appreciation * cohort.units;
  }
  metrics.assetValue = totalAssetValue;

  // Calculate loan balance
  let totalLoanBalance = 0;
  for (const cohort of cohorts) {
    if (cohort.loanAmount > 0) {
      const monthlyRate = params.interestRate / 100 / 12;
      const totalPayments = params.loanTerm * 12;
      const monthsElapsed = (year - cohort.year) * 12;
      const remainingPayments = Math.max(0, totalPayments - monthsElapsed);

      if (remainingPayments > 0) {
        const monthlyEMI =
          (cohort.loanAmount *
            (monthlyRate * Math.pow(1 + monthlyRate, totalPayments))) /
          (Math.pow(1 + monthlyRate, totalPayments) - 1);
        const remainingBalance =
          (monthlyEMI * (Math.pow(1 + monthlyRate, remainingPayments) - 1)) /
          (monthlyRate * Math.pow(1 + monthlyRate, remainingPayments));
        totalLoanBalance += remainingBalance;
      }
    }
  }
  metrics.loanBalance = totalLoanBalance;

  // Calculate net worth and equity
  metrics.netEquity = metrics.assetValue - metrics.loanBalance;
  metrics.netWorth = metrics.netEquity + cumulativeCapEx;

  return metrics;
}

// Export calculation functions
window.calculations = {
  calculateAll,
  performCalculations,
  calculateBankFinancedPurchases,
  calculateDetailedMetrics,
};
