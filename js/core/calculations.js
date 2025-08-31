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

// Calculate investment score based on objective
function calculateInvestmentScore(params, year, propertyCost, netOperatingIncome, projectedROI) {
  const objective = params.investmentObjective;
  const riskTolerance = params.riskTolerance;
  let score = 0;
  let weight = 1.0;
  
  // Risk adjustment multiplier
  const riskMultiplier = riskTolerance === 'conservative' ? 0.8 : 
                       riskTolerance === 'aggressive' ? 1.2 : 1.0;
  
  switch (objective) {
    case 'maxCashFlow':
      // Prioritize net operating income (cash flow)
      score = netOperatingIncome;
      weight = riskMultiplier;
      break;
      
    case 'maxTotalReturn':
      // Combine cash flow with projected appreciation
      const appreciation = propertyCost * (params.appreciationRate / 100);
      score = (netOperatingIncome + appreciation) / propertyCost * 100;
      weight = riskMultiplier;
      break;
      
    case 'maxROI':
      // Pure ROI focus
      score = projectedROI;
      weight = riskMultiplier * 1.1; // Slight bonus for efficiency
      break;
      
    case 'maxPortfolioSize':
      // Favor lower cost properties (more units possible)
      score = 1000000 / propertyCost; // Inverse relationship to cost
      weight = riskMultiplier * 1.1;
      break;
      
    case 'conservative':
      // Favor stability over returns
      score = Math.min(projectedROI, 15); // Cap at 15% to avoid risky high-return deals
      weight = riskMultiplier * 0.9;
      break;
      
    case 'balanced':
    default:
      // Balance cash flow, ROI, and appreciation
      const cashFlowScore = netOperatingIncome / 10000; // Normalize to 0-10 scale
      const roiScore = Math.min(projectedROI, 25) / 2.5; // Normalize to 0-10 scale
      const balancedAppreciation = propertyCost * (params.appreciationRate / 100);
      const appreciationScore = (balancedAppreciation / propertyCost * 100) / 1.0; // Normalize
      score = (cashFlowScore * 0.4) + (roiScore * 0.4) + (appreciationScore * 0.2);
      weight = riskMultiplier;
      break;
  }
  
  return score * weight;
}

// Get objective-adjusted ROI threshold
function getObjectiveThreshold(params) {
  const baseThreshold = params.minROIThreshold;
  const riskTolerance = params.riskTolerance;
  const objective = params.investmentObjective;
  
  let adjustment = 0;
  
  // Risk-based adjustment
  if (riskTolerance === 'conservative') adjustment += 1;
  if (riskTolerance === 'aggressive') adjustment -= 1;
  
  // Objective-based adjustment
  switch (objective) {
    case 'maxPortfolioSize':
      adjustment -= 2; // Lower threshold to acquire more units
      break;
    case 'conservative':
      adjustment += 2; // Higher threshold for quality
      break;
    case 'maxROI':
      adjustment += 1; // Slightly higher threshold for efficiency
      break;
    case 'maxCashFlow':
      adjustment -= 1; // Slightly lower ROI acceptable if cash flow is good
      break;
  }
  
  return Math.max(3, baseThreshold + adjustment); // Minimum 3% threshold
}

// Calculate dynamic annual budget based on budget mode and investment objectives
function calculateDynamicAnnualBudget(params, year, previousResults, propertyCost, strategy = 'self') {
  const purchaseYears = strategy === 'financed' ? params.financedPurchaseYears : params.selfPurchaseYears;
  
  // Debug: Show what budget mode we're in
  if (year === 1 && strategy === 'self') {
    console.log(`🔍 Budget Mode: ${params.budgetMode}, Objective: ${params.investmentObjective}, Risk: ${params.riskTolerance}`);
  }
  
  if (params.budgetMode !== 'needsBased' || year > purchaseYears) {
    // Use predetermined budget for predetermined mode or after purchase years
    return year <= purchaseYears ? params.annualBudget : 0;
  }
  
  // Needs-based logic
  let totalInvestedSoFar = 0;
  let totalCashFlowGenerated = 0;
  for (let i = 0; i < previousResults.length; i++) {
    const invested = previousResults[i].selfStrategy?.annualBudget || 0;
    totalInvestedSoFar += invested;
    totalCashFlowGenerated += previousResults[i].selfStrategy?.noi || 0;
  }
  
  // Check if we've reached investment limits
  if (totalInvestedSoFar >= params.totalInvestmentLimit) {
    console.log(`🎯 Year ${year}: Investment limit reached ($${totalInvestedSoFar.toLocaleString()})`);
    return 0;
  }
  
  // Check if we've reached target cash flow (for cash flow objective)
  if (params.investmentObjective === 'maxCashFlow' && totalCashFlowGenerated >= params.targetAnnualCashFlow) {
    console.log(`🎯 Year ${year}: Target cash flow reached ($${totalCashFlowGenerated.toLocaleString()})`);
    return 0;
  }
  
  // Calculate projected financials for this year's investment
  const currentRentalRate = params.rentalRate * (1 + params.rentGrowthRate / 100) ** (year - 1);
  const annualRent = propertyCost * (currentRentalRate / 100) * 12;
  
  // Calculate operating expenses
  const vacancyCost = annualRent * (params.vacancyRate / 100);
  const managementCost = annualRent * (params.managementRate / 100);
  const capexCost = annualRent * (params.capexRate / 100);
  const maintenanceCost = annualRent * (params.maintenanceRate / 100);
  const insuranceCost = params.insurance || (propertyCost * 0.005);
  
  const totalOperatingExpenses = vacancyCost + managementCost + capexCost + maintenanceCost + insuranceCost;
  const netOperatingIncome = annualRent - totalOperatingExpenses;
  const projectedROI = (netOperatingIncome / propertyCost) * 100;
  
  // Get objective-adjusted threshold
  const effectiveThreshold = getObjectiveThreshold(params);
  
  // Calculate investment score
  const investmentScore = calculateInvestmentScore(params, year, propertyCost, netOperatingIncome, projectedROI);
  
  // Only invest if meets threshold and has good score
  if (projectedROI < effectiveThreshold) {
    console.log(`🎯 Year ${year}: ROI ${projectedROI.toFixed(1)}% below ${params.investmentObjective} threshold ${effectiveThreshold.toFixed(1)}%`);
    return 0;
  }
  
  // Calculate optimal investment amount within limits
  const remainingLimit = params.totalInvestmentLimit - totalInvestedSoFar;
  let optimalInvestment = Math.min(
    params.maxSingleInvestment,
    remainingLimit,
    propertyCost * 1.02 // Include closing costs
  );
  
  // Adjust investment amount based on objective and score
  if (params.investmentObjective === 'maxPortfolioSize' && investmentScore > 50) {
    // For portfolio maximization, prefer smaller amounts to buy more units
    optimalInvestment = Math.min(optimalInvestment, propertyCost * 0.25); // Down payment only
  }
  
  console.log(`✅ Year ${year}: ${params.investmentObjective} investment approved $${optimalInvestment.toLocaleString()} (ROI: ${projectedROI.toFixed(1)}%, Score: ${investmentScore.toFixed(1)})`);
  return optimalInvestment;
}

// Enhanced calculation function with centralized data generation
function performCalculations(params) {
  
  const results = new dataModel.CalculationResults();
  results.inputParams = params;
  
  // Initialize enhanced data structures
  results.yearlyData = [];
  results.summaryMetrics = new dataModel.SummaryMetrics();
  results.cashFlowData = new dataModel.CashFlowAnalysisData();

  // Initialize arrays for 15 years
  for (let year = 1; year <= 15; year++) {
    results.selfFinanced.push(new dataModel.YearlyMetrics());
    results.financed.push(new dataModel.YearlyMetrics());
    results.comparison.push({});
    results.detailedData.push({
      selfCumulativeCapEx: 0,
      financedCumulativeCapEx: 0,
    });
    
    // Initialize enhanced yearly data
    results.yearlyData.push(new dataModel.YearlyData(year));
    results.cashFlowData.yearlyBreakdown.push(new dataModel.YearlyCashFlowBreakdown(year));
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
  
  // Track running cash balance for cash flow statements
  let selfRunningCash = 0;
  let financedRunningCash = 0;

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
    // Track annual budget separately to avoid double-counting
    // Use dynamic budget calculation for needs-based mode
    const selfAnnualBudget = calculateDynamicAnnualBudget(params, year, results.yearlyData, propertyCost, 'self');

    // Self-financed purchases with reasonable cash flow constraint
    const selfCostPerUnit = propertyCost * 1.02; // Including 2% closing costs
    const selfTotalCashForPurchases = selfAvailableCash + selfAnnualBudget;
    
    if (selfTotalCashForPurchases >= selfCostPerUnit) {
      // Calculate how many units we can afford with current cash plus annual budget
      const maxAffordableSelfUnits = Math.floor(selfTotalCashForPurchases / selfCostPerUnit);
      
      // Keep a reasonable cash reserve: 20% of total available cash or $50k, whichever is higher
      const cashReserve = Math.max(selfTotalCashForPurchases * 0.2, 50000);
      const availableForPurchase = Math.max(0, selfTotalCashForPurchases - cashReserve);
      const conservativeUnits = Math.floor(availableForPurchase / selfCostPerUnit);
      
      // Buy the conservative amount, but at least 1 if we can afford it
      selfNewUnits = Math.max(0, Math.min(conservativeUnits, maxAffordableSelfUnits));
      
      // If during investment years and we have substantial cash, buy at least 1 unit
      if (year <= params.selfPurchaseYears && selfNewUnits === 0 && maxAffordableSelfUnits >= 1) {
        selfNewUnits = 1;
      }

      if (selfNewUnits > 0) {
        const totalCost = selfNewUnits * selfCostPerUnit;
        // Deduct purchase cost from available cash (annual budget will be added in cash flow)
        selfAvailableCash = Math.max(0, selfAvailableCash + selfAnnualBudget - totalCost);

        selfCohorts.push({
          yearOriginated: year,
          units: selfNewUnits,
          costPerUnit: propertyCost,
        });
        selfMetrics.newUnits = selfNewUnits;
      } else {
        // If no purchase, still add annual budget to available cash
        selfAvailableCash += selfAnnualBudget;
      }
    }


    // BANK-FINANCED STRATEGY
    let financedNewUnits = 0;
    let financedCashFlowBalance = 0;
    
    // Track annual budget separately to avoid double-counting
    // Use dynamic budget calculation for financed strategy as well (for equity portion)
    const financedAnnualBudget = calculateDynamicAnnualBudget(params, year, results.yearlyData, propertyCost, 'financed');

    const downPaymentPerUnit = propertyCost * (1 - params.ltvRatio / 100); // Down payment without closing costs
    const financedTotalCashForPurchases = financedAvailableCash + financedAnnualBudget;

    if (financedTotalCashForPurchases >= downPaymentPerUnit) {
      const maxAffordableUnits = Math.floor(
        financedTotalCashForPurchases / downPaymentPerUnit
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
        // Deduct down payment from available cash (annual budget will be added in cash flow)
        financedAvailableCash = Math.max(0, financedAvailableCash + financedAnnualBudget - totalDownPayment);

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
      } else {
        // If no purchase, still add annual budget to available cash
        financedAvailableCash += financedAnnualBudget;
      }
    } else {
      // No units can be afforded, but still add annual budget to available cash
      financedAvailableCash += financedAnnualBudget;
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

    // Calculate cash flows using proper cash flow accounting principles
    // Use the budget variables we already calculated to avoid inconsistency

    // Calculate property purchases for this year
    const selfNewUnitsForCashFlow = selfCohorts
      .filter((c) => c.yearOriginated === year)
      .reduce((sum, c) => sum + c.units, 0);
    const selfCostPerUnitForCashFlow =
      params.initialCost * Math.pow(1 + params.costIncrease / 100, year - 1) * 1.02; // Including closing costs
    const selfPropertyAcquisitions = selfNewUnitsForCashFlow * selfCostPerUnitForCashFlow;

    const financedNewUnitsForCashFlow = financedCohorts
      .filter((c) => c.yearOriginated === year)
      .reduce((sum, c) => sum + c.units, 0);
    const financedCostPerUnitForCashFlow =
      params.initialCost * Math.pow(1 + params.costIncrease / 100, year - 1) * 1.02; // Including closing costs
    const downPaymentPercent = 1 - params.ltvRatio / 100;
    const financedDownPayments = financedNewUnitsForCashFlow * financedCostPerUnitForCashFlow * downPaymentPercent;

    // CORRECT CASH FLOW CALCULATION
    // For self-financed: Annual Budget + NOI - Property Purchases - CapEx - Taxes
    const selfCashFlow = selfAnnualBudget + selfDetailed.noi - selfPropertyAcquisitions - selfDetailed.capex - selfDetailed.taxes;

    // For financed: Annual Budget + NOI - Down Payments - Debt Service - CapEx - Taxes  
    const financedCashFlow = financedAnnualBudget + financedDetailed.noi - financedDownPayments - financedDetailed.debtService - financedDetailed.capex - financedDetailed.taxes;

    // Update cumulative CapEx
    selfCumulativeCapEx += selfDetailed.capex;
    financedCumulativeCapEx += financedDetailed.capex;

    // Apply S&P 500 returns to CapEx reserves
    const sp500Return = 0.1;
    if (year > 1) {
      selfCumulativeCapEx = selfCumulativeCapEx * (1 + sp500Return);
      financedCumulativeCapEx = financedCumulativeCapEx * (1 + sp500Return);
    }

    // Available cash balances are already updated correctly in purchase logic above
    // We've already: 1) Added annual budget, 2) Deducted purchases, 3) Added NOI from operations
    // Adding the full cash flow here would double-count these items
    
    // Only add the operational cash flows (NOI - expenses) that weren't handled in purchase logic
    const selfOperationalCashFlow = selfDetailed.noi - selfDetailed.capex - selfDetailed.taxes;
    const financedOperationalCashFlow = financedDetailed.noi - financedDetailed.debtService - financedDetailed.capex - financedDetailed.taxes;
    
    selfAvailableCash += selfOperationalCashFlow;
    financedAvailableCash += financedOperationalCashFlow;

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
      netEquity: financedAssetValue - loanBalance,  // Add the missing netEquity calculation
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

    // POPULATE CENTRALIZED DATA STRUCTURES
    const yearlyData = results.yearlyData[year - 1];
    const cashFlowBreakdown = results.cashFlowData.yearlyBreakdown[year - 1];
    
    // Set cost per unit for this year
    yearlyData.costPerUnit = propertyCost;
    
    // Populate self-financed strategy data
    const selfStrategy = yearlyData.selfStrategy;
    selfStrategy.units = selfTotalUnits;
    selfStrategy.newUnits = selfNewUnits;
    selfStrategy.totalUnits = selfTotalUnits;
    selfStrategy.assetValue = selfAssetValue;
    selfStrategy.loanBalance = 0;
    selfStrategy.netEquity = selfAssetValue;
    selfStrategy.availableCash = selfAvailableCash;
    selfStrategy.cumulativeCapEx = selfCumulativeCapEx;
    
    // Cash flow components for self-financed  
    // The cash flow statement should reflect what actually happened to available cash
    selfStrategy.openingCash = selfRunningCash;
    
    // Calculate the actual cash change from operations and purchases
    const selfActualCashChange = selfAvailableCash - selfRunningCash;
    
    selfStrategy.closingCash = selfAvailableCash; // Use actual available cash as closing balance
    selfStrategy.netCashFlow = selfActualCashChange; // Actual change in cash position
    selfRunningCash = selfStrategy.closingCash; // Update running balance for next year
    selfStrategy.annualBudget = selfAnnualBudget;
    selfStrategy.gpr = selfDetailed.gpr;
    selfStrategy.egi = selfDetailed.egi;
    selfStrategy.noi = selfDetailed.noi;
    selfStrategy.capex = selfDetailed.capex;
    selfStrategy.debtService = 0;
    selfStrategy.interestExpense = 0;
    selfStrategy.principalPayment = 0;
    selfStrategy.netCashFlow = selfCashFlow;
    selfStrategy.cumulativeCashFlow = selfCumulativeCash;
    
    // Purchase calculations for self-financed
    selfStrategy.purchaseCost = selfPropertyAcquisitions;
    selfStrategy.downPayment = selfPropertyAcquisitions;
    selfStrategy.loanAmount = 0;
    selfStrategy.closingCosts = selfPropertyAcquisitions * 0.02; // 2% closing costs
    
    // Tax calculations for self-financed
    selfStrategy.depreciation = selfDetailed.depreciation;
    selfStrategy.taxableIncome = selfDetailed.taxableIncome;
    selfStrategy.taxes = selfDetailed.taxes;
    selfStrategy.netIncome = selfDetailed.netIncome;
    
    // Populate financed strategy data
    const financedStrategy = yearlyData.financedStrategy;
    financedStrategy.units = financedTotalUnits;
    financedStrategy.newUnits = financedNewUnits;
    financedStrategy.totalUnits = financedTotalUnits;
    financedStrategy.assetValue = financedAssetValue;
    financedStrategy.loanBalance = loanBalance;
    financedStrategy.netEquity = financedAssetValue - loanBalance;
    financedStrategy.availableCash = financedAvailableCash;
    financedStrategy.cumulativeCapEx = financedCumulativeCapEx;
    
    // Cash flow components for financed
    // The cash flow statement should reflect what actually happened to available cash
    financedStrategy.openingCash = financedRunningCash;
    
    // Calculate the actual cash change from operations and purchases
    const financedActualCashChange = financedAvailableCash - financedRunningCash;
    
    financedStrategy.closingCash = financedAvailableCash; // Use actual available cash as closing balance
    financedStrategy.netCashFlow = financedActualCashChange; // Actual change in cash position
    financedRunningCash = financedStrategy.closingCash; // Update running balance for next year
    financedStrategy.annualBudget = financedAnnualBudget;
    financedStrategy.gpr = financedDetailed.gpr;
    financedStrategy.egi = financedDetailed.egi;
    financedStrategy.noi = financedDetailed.noi;
    financedStrategy.capex = financedDetailed.capex;
    financedStrategy.debtService = financedDetailed.debtService;
    financedStrategy.interestExpense = financedDetailed.interestExpense;
    financedStrategy.principalPayment = financedDetailed.debtService - financedDetailed.interestExpense;
    financedStrategy.netCashFlow = financedCashFlow;
    financedStrategy.cumulativeCashFlow = financedCumulativeCash;
    
    // Purchase calculations for financed
    financedStrategy.purchaseCost = financedNewUnitsForCashFlow * financedCostPerUnitForCashFlow;
    financedStrategy.downPayment = financedDownPayments;
    financedStrategy.loanAmount = financedStrategy.purchaseCost - financedStrategy.downPayment;
    financedStrategy.closingCosts = financedStrategy.purchaseCost * 0.02; // 2% closing costs
    
    // Tax calculations for financed
    financedStrategy.depreciation = financedDetailed.depreciation;
    financedStrategy.taxableIncome = financedDetailed.taxableIncome;
    financedStrategy.taxes = financedDetailed.taxes;
    financedStrategy.netIncome = financedDetailed.netIncome;
    
    // Populate cash flow breakdown for detailed analysis
    populateCashFlowBreakdown(cashFlowBreakdown, year, results, params, 
                              selfStrategy, financedStrategy, loanBalance);

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

  // Calculate summary metrics after all years are processed
  console.log("🔄 About to call calculateSummaryMetrics...");
  console.trace("📍 Call stack for calculateSummaryMetrics");
  calculateSummaryMetrics(results);
  console.log("✅ calculateSummaryMetrics completed");
  
  // Validate cash flow continuity
  validateCashFlowContinuity(results.cashFlowData);
  
  return results;
}

// Function to populate detailed cash flow breakdown
function populateCashFlowBreakdown(breakdown, year, results, params, selfStrategy, financedStrategy, totalLoanBalance) {
  // Self-financed cash flow breakdown
  const selfBreakdown = breakdown.self;
  selfBreakdown.openingCash = selfStrategy.openingCash;
  selfBreakdown.openingLoan = 0;
  
  // Inflows
  selfBreakdown.annualBudget = selfStrategy.annualBudget;
  selfBreakdown.rentalIncome = selfStrategy.egi;
  selfBreakdown.loanProceeds = 0;
  selfBreakdown.totalInflows = selfBreakdown.annualBudget + selfBreakdown.rentalIncome;
  
  // Outflows
  selfBreakdown.propertyPurchases = selfStrategy.purchaseCost;
  selfBreakdown.operatingExpenses = selfStrategy.egi - selfStrategy.noi; // Operating expenses
  selfBreakdown.debtService = 0;
  selfBreakdown.capex = selfStrategy.capex;
  selfBreakdown.taxes = selfStrategy.taxes;
  selfBreakdown.totalOutflows = selfBreakdown.propertyPurchases + selfBreakdown.operatingExpenses + selfBreakdown.capex + selfBreakdown.taxes;
  
  // Use the actual net cash flow from the main calculation
  selfBreakdown.netCashFlow = selfStrategy.netCashFlow;
  selfBreakdown.closingCash = selfBreakdown.openingCash + selfBreakdown.netCashFlow;
  selfBreakdown.closingLoan = 0;
  
  // Financed cash flow breakdown
  const financedBreakdown = breakdown.financed;
  financedBreakdown.openingCash = financedStrategy.openingCash;
  financedBreakdown.openingLoan = year === 1 ? 0 : 
    (results.cashFlowData.yearlyBreakdown[year - 2] ? results.cashFlowData.yearlyBreakdown[year - 2].financed.closingLoan : 0);
  
  // Inflows
  financedBreakdown.annualBudget = financedStrategy.annualBudget;
  financedBreakdown.rentalIncome = financedStrategy.egi;
  financedBreakdown.loanProceeds = financedStrategy.loanAmount;
  financedBreakdown.totalInflows = financedBreakdown.annualBudget + financedBreakdown.rentalIncome + financedBreakdown.loanProceeds;
  
  // Outflows  
  financedBreakdown.propertyPurchases = financedStrategy.purchaseCost;
  financedBreakdown.operatingExpenses = financedStrategy.egi - financedStrategy.noi;
  financedBreakdown.debtService = financedStrategy.debtService;
  financedBreakdown.capex = financedStrategy.capex;
  financedBreakdown.taxes = financedStrategy.taxes;
  financedBreakdown.totalOutflows = financedBreakdown.propertyPurchases + financedBreakdown.operatingExpenses + 
                                   financedBreakdown.debtService + financedBreakdown.capex + financedBreakdown.taxes;
  
  // Use the actual net cash flow from the main calculation
  financedBreakdown.netCashFlow = financedStrategy.netCashFlow;
  financedBreakdown.closingCash = financedBreakdown.openingCash + financedBreakdown.netCashFlow;
  financedBreakdown.closingLoan = totalLoanBalance;
}

// Function to calculate comprehensive summary metrics
function calculateSummaryMetrics(results) {
  try {
    console.log("🔍 calculateSummaryMetrics ENTRY");
    
    const finalYear = 15;
    // Use the correct data arrays - the old structure with YearlyMetrics objects
    const selfFinal = results.selfFinanced[finalYear - 1];
    const financedFinal = results.financed[finalYear - 1];
    const params = results.inputParams;
    
    console.log("🔍 calculateSummaryMetrics - Final year data:", {
      selfFinal: selfFinal,
      financedFinal: financedFinal,
      yearlyDataLength: results.yearlyData.length,
      selfFinancedLength: results.selfFinanced.length,
      financedLength: results.financed.length
    });
    
    if (!selfFinal) {
      console.error("❌ selfFinal is null/undefined!");
      return;
    }
    
    if (!financedFinal) {
      console.error("❌ financedFinal is null/undefined!");
      return;
    }
  
  const summary = results.summaryMetrics;
  
  // Total return calculations - using correct property names from YearlyMetrics
  summary.selfTotalReturn = selfFinal.assetValue + selfFinal.cumulativeCashFlow;
  summary.financedTotalReturn = financedFinal.assetValue + financedFinal.cumulativeCashFlow;
  
  // Calculate total cash invested
  let selfInvested = 0;
  let financedInvested = 0;
  
  for (let i = 0; i < finalYear; i++) {
    const yearData = results.yearlyData[i];
    if (i < params.selfPurchaseYears) {
      selfInvested += params.annualBudget;
    }
    if (i < params.financedPurchaseYears) {
      financedInvested += params.annualBudget;
    }
  }
  
  summary.totalCashInvested.self = selfInvested;
  summary.totalCashInvested.financed = financedInvested;
  
  // ROE calculations
  summary.selfROE = selfInvested > 0 ? (summary.selfTotalReturn / selfInvested - 1) * 100 : 0;
  summary.financedROE = financedInvested > 0 ? (summary.financedTotalReturn / financedInvested - 1) * 100 : 0;
  
  // Risk metrics - using correct property names from YearlyMetrics
  console.log("🔍 Debug Leverage Multiplier Calculation:", {
    assetValue: financedFinal.assetValue,
    loanBalance: financedFinal.loanBalance,
    netEquity: financedFinal.netEquity,
    leverageCalc: financedFinal.netEquity > 0 ? financedFinal.assetValue / financedFinal.netEquity : 0
  });
  
  console.log("🔍 Debug Units Per Dollar Calculation:", {
    selfTotalUnits: selfFinal.units,  // Changed from totalUnits to units
    financedTotalUnits: financedFinal.units,  // Changed from totalUnits to units
    selfInvested: selfInvested,
    financedInvested: financedInvested,
    selfUnitsPerDollar: selfInvested > 0 ? selfFinal.units / selfInvested * 1000 : 0,
    financedUnitsPerDollar: financedInvested > 0 ? financedFinal.units / financedInvested * 1000 : 0
  });
  
  summary.leverageMultiplier = financedFinal.netEquity > 0 ? financedFinal.assetValue / financedFinal.netEquity : 0;
  summary.unitsPerDollar.self = selfInvested > 0 ? selfFinal.units / selfInvested * 1000 : 0; // Units per thousand dollars ($1K)
  summary.unitsPerDollar.financed = financedInvested > 0 ? financedFinal.units / financedInvested * 1000 : 0;
  summary.debtServiceCoverage = financedFinal.debtService > 0 ? financedFinal.noi / financedFinal.debtService : 0;
  
  console.log("✅ Final calculated metrics:", {
    leverageMultiplier: summary.leverageMultiplier,
    unitsPerDollarSelf: summary.unitsPerDollar.self,
    unitsPerDollarFinanced: summary.unitsPerDollar.financed
  });
  
  // Final metrics - using correct property names from YearlyMetrics
  summary.totalUnits.self = selfFinal.units;  // Changed from totalUnits to units
  summary.totalUnits.financed = financedFinal.units;  // Changed from totalUnits to units
  summary.finalAssetValue.self = selfFinal.assetValue;
  summary.finalAssetValue.financed = financedFinal.assetValue;
  summary.finalNetWorth.self = selfFinal.assetValue + selfFinal.cumulativeCashFlow;
  summary.finalNetWorth.financed = financedFinal.netEquity + financedFinal.cumulativeCashFlow;
  
  // Break-even analysis (simplified)
  summary.breakEvenYear.self = findBreakEvenYear(results.yearlyData, 'selfStrategy');
  summary.breakEvenYear.financed = findBreakEvenYear(results.yearlyData, 'financedStrategy');
  
  console.log("🔍 calculateSummaryMetrics EXIT - SUCCESS");
  
  } catch (error) {
    console.error("❌ calculateSummaryMetrics ERROR:", error);
    console.error("Error stack:", error.stack);
  }
}

// Helper function to find break-even year (when cumulative cash flow turns positive)
function findBreakEvenYear(yearlyData, strategy) {
  for (let i = 0; i < yearlyData.length; i++) {
    if (yearlyData[i][strategy].cumulativeCashFlow > 0) {
      return i + 1;
    }
  }
  return 0; // Never breaks even
}

// Function to validate cash flow continuity
function validateCashFlowContinuity(cashFlowData) {
  const errors = [];
  
  for (let i = 1; i < cashFlowData.yearlyBreakdown.length; i++) {
    const prevYear = cashFlowData.yearlyBreakdown[i - 1];
    const currentYear = cashFlowData.yearlyBreakdown[i];
    
    // Check self-financed continuity
    if (Math.abs(prevYear.self.closingCash - currentYear.self.openingCash) > 0.01) {
      errors.push(`Self-financed cash flow discontinuity between year ${prevYear.year} and ${currentYear.year}`);
    }
    
    // Check financed continuity
    if (Math.abs(prevYear.financed.closingCash - currentYear.financed.openingCash) > 0.01) {
      errors.push(`Financed cash flow discontinuity between year ${prevYear.year} and ${currentYear.year}`);
    }
  }
  
  cashFlowData.continuityCheck = errors.length === 0;
  cashFlowData.errors = errors;
}


// Calculate sustainable units following manual calculation logic (bank-financed)
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


// Comprehensive cash flow analysis for new units - Following manual calculation logic (bank-financed)
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
  const annualBudgetForYear = purchaseYear <= params.financedPurchaseYears ? params.annualBudget : 0;
  const cashBroughtIn = annualBudgetForYear;

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

// CENTRALIZED DATA ACCESSOR FUNCTIONS
// These functions provide consistent access to calculated data across all UI components

// Get dashboard metrics from centralized data
function getDashboardMetrics(results) {
  console.log("🔍 getDashboardMetrics called with:", results);
  
  if (!results || !results.summaryMetrics) {
    console.error("❌ getDashboardMetrics: Missing results or summaryMetrics");
    return null;
  }
  
  const summary = results.summaryMetrics;
  console.log("📊 Summary metrics in getDashboardMetrics:", {
    leverageMultiplier: summary.leverageMultiplier,
    unitsPerDollar: summary.unitsPerDollar
  });
  
  return {
    // Leverage and risk metrics
    leverageMultiplier: summary.leverageMultiplier,
    unitsPerDollar: {
      self: summary.unitsPerDollar.self,
      financed: summary.unitsPerDollar.financed
    },
    debtServiceCoverage: summary.debtServiceCoverage,
    
    // Performance metrics
    totalReturn: {
      self: summary.selfTotalReturn,
      financed: summary.financedTotalReturn
    },
    roe: {
      self: summary.selfROE,
      financed: summary.financedROE
    },
    
    // Final outcomes
    finalNetWorth: {
      self: summary.finalNetWorth.self,
      financed: summary.finalNetWorth.financed
    },
    totalUnits: {
      self: summary.totalUnits.self,
      financed: summary.totalUnits.financed
    },
    totalCashInvested: {
      self: summary.totalCashInvested.self,
      financed: summary.totalCashInvested.financed
    }
  };
}

// Get cash flow analysis data from centralized source
function getCashFlowAnalysisData(results, strategy = 'both') {
  if (!results || !results.cashFlowData) return null;
  
  return {
    yearlyBreakdown: results.cashFlowData.yearlyBreakdown,
    continuityCheck: results.cashFlowData.continuityCheck,
    errors: results.cashFlowData.errors,
    strategy: strategy
  };
}

// Get yearly data for specific strategy and year
function getYearlyStrategyData(results, year, strategy) {
  if (!results || !results.yearlyData || year < 1 || year > 15) return null;
  
  const yearData = results.yearlyData[year - 1];
  if (!yearData) return null;
  
  return strategy === 'self' ? yearData.selfStrategy : yearData.financedStrategy;
}

// Get comparative table data (backwards compatible)
function getComparativeTableData(results) {
  if (!results || !results.yearlyData) return null;
  
  return results.yearlyData.map((yearData, index) => ({
    year: index + 1,
    costPerUnit: yearData.costPerUnit,
    
    // Self-financed data
    selfNewUnits: yearData.selfStrategy.newUnits,
    selfTotalUnits: yearData.selfStrategy.totalUnits,
    selfCashFlow: yearData.selfStrategy.netCashFlow,
    selfCumulativeCashFlow: yearData.selfStrategy.cumulativeCashFlow,
    selfAssetValue: yearData.selfStrategy.assetValue,
    selfNetWorth: yearData.selfStrategy.assetValue + yearData.selfStrategy.cumulativeCashFlow,
    
    // Financed data
    financedNewUnits: yearData.financedStrategy.newUnits,
    financedTotalUnits: yearData.financedStrategy.totalUnits,
    financedCashFlow: yearData.financedStrategy.netCashFlow,
    financedCumulativeCashFlow: yearData.financedStrategy.cumulativeCashFlow,
    financedAssetValue: yearData.financedStrategy.assetValue,
    financedLoanBalance: yearData.financedStrategy.loanBalance,
    financedNetEquity: yearData.financedStrategy.netEquity,
    financedNetWorth: yearData.financedStrategy.netEquity + yearData.financedStrategy.cumulativeCashFlow
  }));
}

// Get P&L data for specific strategy and year
function getPLData(results, year, strategy) {
  const strategyData = getYearlyStrategyData(results, year, strategy);
  if (!strategyData) return null;
  
  return {
    gpr: strategyData.gpr,
    egi: strategyData.egi,
    noi: strategyData.noi,
    depreciation: strategyData.depreciation,
    debtService: strategyData.debtService,
    interestExpense: strategyData.interestExpense,
    principalPayment: strategyData.principalPayment,
    taxableIncome: strategyData.taxableIncome,
    taxes: strategyData.taxes,
    netIncome: strategyData.netIncome,
    capex: strategyData.capex
  };
}

// Get cash flow statement data for modal
function getCashFlowStatementData(results, year, strategy) {
  const strategyData = getYearlyStrategyData(results, year, strategy);
  const breakdown = results.cashFlowData?.yearlyBreakdown[year - 1];
  
  if (!strategyData || !breakdown) return null;
  
  const strategyBreakdown = strategy === 'self' ? breakdown.self : breakdown.financed;
  
  return {
    openingCash: strategyBreakdown.openingCash,
    
    // Inflows
    annualBudget: strategyBreakdown.annualBudget,
    rentalIncome: strategyBreakdown.rentalIncome,
    loanProceeds: strategyBreakdown.loanProceeds,
    totalInflows: strategyBreakdown.totalInflows,
    
    // Outflows
    propertyPurchases: strategyBreakdown.propertyPurchases,
    operatingExpenses: strategyBreakdown.operatingExpenses,
    debtService: strategyBreakdown.debtService,
    interestExpense: strategyData.interestExpense,
    capex: strategyBreakdown.capex,
    taxes: strategyBreakdown.taxes,
    totalOutflows: strategyBreakdown.totalOutflows,
    
    netCashFlow: strategyBreakdown.netCashFlow,
    closingCash: strategyBreakdown.closingCash,
    
    // Additional context
    units: strategyData.totalUnits,
    newUnits: strategyData.newUnits,
    costPerUnit: results.yearlyData[year - 1].costPerUnit
  };
}

// Get recommendation data
function getRecommendationData(results) {
  if (!results || !results.summaryMetrics) return null;
  
  const summary = results.summaryMetrics;
  
  // Determine recommended strategy
  const financedBetter = summary.financedTotalReturn > summary.selfTotalReturn;
  const difference = Math.abs(summary.financedTotalReturn - summary.selfTotalReturn);
  const percentDifference = difference / Math.max(summary.selfTotalReturn, summary.financedTotalReturn) * 100;
  
  let recommendation = 'neutral';
  if (percentDifference > 5) {
    recommendation = financedBetter ? 'financed' : 'self';
  }
  
  return {
    recommendation: recommendation,
    financedAdvantage: summary.financedTotalReturn - summary.selfTotalReturn,
    percentDifference: percentDifference,
    leverageMultiplier: summary.leverageMultiplier,
    riskMetrics: {
      debtServiceCoverage: summary.debtServiceCoverage,
      leverageMultiplier: summary.leverageMultiplier
    },
    performance: {
      selfROE: summary.selfROE,
      financedROE: summary.financedROE,
      selfTotal: summary.selfTotalReturn,
      financedTotal: summary.financedTotalReturn
    }
  };
}

// Export calculation functions with accessor functions
window.calculations = {
  calculateAll,
  performCalculations,
  calculateBankFinancedPurchases,
  calculateDetailedMetrics,
  calculateSummaryMetrics,
  
  // Centralized data accessors
  getDashboardMetrics,
  getCashFlowAnalysisData,
  getYearlyStrategyData,
  getComparativeTableData,
  getPLData,
  getCashFlowStatementData,
  getRecommendationData
};
