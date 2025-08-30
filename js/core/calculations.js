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

  } catch (error) {
    utils.handleError(error, "calculateAll");
    alert(
      "An error occurred during calculations. Please check the console for details."
    );
  }
}

// Enhanced calculation function with proper cash flow analysis
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

    // Calculate property cost for this year
    const propertyCost = params.initialCost * Math.pow(1 + params.costIncrease / 100, year - 1);

    // Note: Annual budget is added in cash flow calculation, not here
    // This prevents double-counting in the unit purchase logic

    // SELF-FINANCED STRATEGY
    let selfNewUnits = 0;
    // Add annual budget for self-financed purchases (only during active investment period)
    if (year <= params.selfPurchaseYears) {
      selfAvailableCash += params.annualBudget;
    }

    // Self-financed can purchase units ANYTIME they have sufficient cash
    // This allows using accumulated rental income for additional purchases
    if (selfAvailableCash >= propertyCost * 1.02) {
      // Including 2% closing costs
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


    // BANK-FINANCED STRATEGY
    let financedNewUnits = 0;
    let financedCashFlowBalance = 0;
    
    // Add annual budget for financed purchases
    if (year <= params.selfPurchaseYears) {
      financedAvailableCash += params.annualBudget;
    }

    const downPaymentPerUnit = propertyCost * (1 - params.ltvRatio / 100); // Down payment without closing costs

    if (financedAvailableCash >= downPaymentPerUnit) {
      const maxAffordableUnits = Math.floor(
        financedAvailableCash / downPaymentPerUnit
      );


      // Find sustainable number of units to purchase
      const sustainableResult = calculateSustainableUnits(
        maxAffordableUnits,
        year,
        financedCohorts,
        financedLoans,
        params,
        propertyCost,
        financedAvailableCash
      );
      
      financedNewUnits = sustainableResult.units;
      financedCashFlowBalance = sustainableResult.cashFlowBalance;

      if (financedNewUnits > 0) {
        const totalDownPayment = financedNewUnits * downPaymentPerUnit;
        financedAvailableCash -= totalDownPayment;

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

        financedMetrics.newUnits = financedNewUnits;
      }
    } else {
      // No units can be afforded, but still calculate cash flow for existing properties
      financedCashFlowBalance = financedAvailableCash;
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

    // Calculate detailed metrics for both strategies
    const selfDetailed = calculateDetailedMetricsOriginal(
      year,
      selfCohorts,
      params,
      selfTotalUnits,
      []
    );
    const financedDetailed = calculateDetailedMetricsOriginal(
      year,
      financedCohorts,
      params,
      financedTotalUnits,
      financedLoans
    );

    // Calculate cash flows using unified logic - matching the modal calculation exactly
    const annualBudget =
      year <= params.selfPurchaseYears ? params.annualBudget : 0;

    // For self-financed: NOI - CapEx - Taxes - Property Acquisitions + Annual Budget
    const selfNewUnitsForCashFlow = selfCohorts
      .filter((c) => c.year === year)
      .reduce((sum, c) => sum + c.units, 0);
    const selfCostPerUnitForCashFlow =
      params.initialCost * Math.pow(1 + params.costIncrease / 100, year - 1);
    const selfPropertyAcquisitions =
      selfNewUnitsForCashFlow * selfCostPerUnitForCashFlow;

    // For financed: NOI - Debt Service - CapEx - Taxes - Down Payments + Annual Budget
    const financedNewUnitsForCashFlow = financedCohorts
      .filter((c) => c.year === year)
      .reduce((sum, c) => sum + c.units, 0);
    const financedCostPerUnitForCashFlow =
      params.initialCost * Math.pow(1 + params.costIncrease / 100, year - 1);
    const downPaymentPercent = 1 - params.ltvRatio / 100;
    const financedDownPayments =
      financedNewUnitsForCashFlow *
      financedCostPerUnitForCashFlow *
      downPaymentPercent;

    // Use the cash flow balance calculated by calculateSustainableUnits
    // This matches the "Cash Flow Balance" from debug_model_script.js
    const financedCashFlow = financedCashFlowBalance;

    // For self-financed: Available Cash + NOI - Property Acquisitions - CapEx - Taxes
    // Note: Annual budget is already added to selfAvailableCash on line 80, so don't double-count it
    const selfTotalCashAvailable = selfAvailableCash + selfDetailed.noi;
    const selfTotalOutflows = selfPropertyAcquisitions + selfDetailed.capex + selfDetailed.taxes;
    const selfCashFlow = selfTotalCashAvailable - selfTotalOutflows;

    // Update cumulative CapEx
    selfCumulativeCapEx += selfDetailed.capex;
    financedCumulativeCapEx += financedDetailed.capex;

    // Apply S&P 500 returns to CapEx reserves
    const sp500Return = 0.1;
    if (year > 1) {
      selfCumulativeCapEx = selfCumulativeCapEx * (1 + sp500Return);
      financedCumulativeCapEx = financedCumulativeCapEx * (1 + sp500Return);
    }

    // Apply cash flows to available cash (both positive and negative)
    selfAvailableCash += selfCashFlow;
    financedAvailableCash += financedCashFlow;

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
      interestExpense: selfDetailed.interestExpense,
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
      interestExpense: financedDetailed.interestExpense,
      taxableIncome: financedDetailed.taxableIncome,
      taxes: financedDetailed.taxes,
      netIncome: financedDetailed.netIncome,
      capex: financedDetailed.capex,
    });

    // Store cumulative CapEx and available cash
    results.detailedData[year - 1].selfCumulativeCapEx = selfCumulativeCapEx;
    results.detailedData[year - 1].financedCumulativeCapEx =
      financedCumulativeCapEx;
    results.detailedData[year - 1].selfAvailableCash = selfAvailableCash;
    results.detailedData[year - 1].financedAvailableCash =
      financedAvailableCash;

    // Update comparison data
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

// Calculate sustainable units following manual calculation logic
function calculateSustainableUnits(
  maxAffordableUnits,
  year,
  existingCohorts,
  existingLoans,
  params,
  propertyCost,
  availableCash
) {
  if (maxAffordableUnits === 0) return { units: 0, cashFlowBalance: availableCash };


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

    // Select the maximum number of sustainable units
    if (analysis.isSustainable) {
      bestUnits = units; // Always select the highest sustainable number
    } else {
    }
  }

  // Follow manual logic: maximize units while keeping cash flow positive
  // Select the highest number of units that maintains positive cash flow
  let optimalUnits = 0;
  let optimalBalance = 0;

  for (const item of analyses) {
    if (item.analysis.isSustainable && item.units > optimalUnits) {
      optimalUnits = item.units;
      optimalBalance = item.analysis.cashFlowBalance;
    }
  }

  if (optimalUnits > 0) {
    return { units: optimalUnits, cashFlowBalance: optimalBalance };
  }

  return { units: 0, cashFlowBalance: availableCash };
}

// Comprehensive cash flow analysis for new units - Following manual calculation logic
function analyzeCashFlowForNewUnits(
  newUnits,
  purchaseYear,
  existingCohorts,
  existingLoans,
  params,
  propertyCost,
  availableCash
) {
  // ===============================
  // MANUAL CALCULATION LOGIC IMPLEMENTATION
  // Following the exact structure from your PDF
  // ===============================


  // A. Cash Balance (starting available cash)
  const cashBalance = availableCash;

  // B. Cash brought in (Annual Investment Budget for this year)
  // Note: Annual budget is already included in availableCash, so don't add again
  const cashBroughtIn = 0;

  // Asset Price
  const assetPrice = propertyCost * newUnits;

  // Margin (Down Payment) - 30% in manual calculation
  const marginPercent = (100 - params.ltvRatio) / 100; // Use LTV ratio from params
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

  // Calculate interest expense for the first year (following old implementation)
  let interestExpense = 0;
  if (loanAmount > 0) {
    // Interest expense = remaining balance * annual interest rate
    // For first year, remaining balance is approximately the full loan amount
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

  return {
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
  };
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

  // Calculate interest expense - extract interest component from EMI
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

      // Calculate interest component for each month of the year
      for (let month = 0; month < 12; month++) {
        const currentMonth = monthsElapsed + month;
        if (currentMonth < totalPayments) {
          // Calculate remaining balance at start of month
          const balanceAtMonth =
            (monthlyEMI *
              (Math.pow(1 + monthlyRate, totalPayments - currentMonth) - 1)) /
            (monthlyRate *
              Math.pow(1 + monthlyRate, totalPayments - currentMonth));

          // Interest component = remaining balance * monthly rate
          const monthlyInterest = balanceAtMonth * monthlyRate;
          interestExpense += monthlyInterest * loan.units;
        }
      }
    }
  });

  // NOI should NOT include CapEx (CapEx is a cash flow item, not an operating expense)
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

  // Taxable income should include interest expense
  const taxableIncome = noi - depreciation - interestExpense;
  const taxes =
    params.passthroughLLC === "yes"
      ? 0 // Pass-through LLC pays no entity-level taxes
      : taxableIncome * 0.21;

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
function calculateBankFinancedPurchases(params, year, currentCash) {
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

  // Calculate cash flow - include annual budget as inflow and property acquisitions as outflow
  const annualBudget =
    year <= params.selfPurchaseYears ? params.annualBudget : 0;

  // Calculate property acquisition outflows (down payments for new units this year)
  let propertyAcquisitionOutflows = 0;
  const newUnitCohorts = cohorts.filter((cohort) => cohort.year === year);
  for (const cohort of newUnitCohorts) {
    const downPaymentPercent =
      cohort.loanAmount > 0 ? 1 - cohort.loanAmount / cohort.costPerUnit : 1.0;
    propertyAcquisitionOutflows +=
      cohort.costPerUnit * downPaymentPercent * cohort.units;
  }

  metrics.cashFlow =
    annualBudget +
    metrics.noi -
    metrics.debtService -
    metrics.taxes -
    propertyAcquisitionOutflows;

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
