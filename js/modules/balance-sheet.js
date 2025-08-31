// Balance Sheet Module
// Handles balance sheet calculations and display

// Make functions globally available
window.balanceSheet = {
  updateSummary: updateSummary,
  calculateSummaryMetrics: calculateSummaryMetrics,
};

function updateSummary() {
  if (!utils.calculationResults) return;

  const results = utils.calculationResults;

  // Use centralized dashboard metrics
  const dashboardMetrics = calculations.getDashboardMetrics(results);
  
  // TEMPORARY FIX: getDashboardMetrics is returning 0s, use summaryMetrics directly
  const directMetrics = results.summaryMetrics;
  console.log("🔍 getDashboardMetrics result:", dashboardMetrics);
  console.log("🔍 Direct summaryMetrics:", directMetrics);
  
  const metricsToUse = {
    // Use direct summaryMetrics values for the problematic fields
    leverageMultiplier: directMetrics?.leverageMultiplier || 0,
    unitsPerDollar: {
      self: directMetrics?.unitsPerDollar?.self || 0,
      financed: directMetrics?.unitsPerDollar?.financed || 0
    },
    // Use dashboardMetrics for other fields if they work
    totalReturn: dashboardMetrics?.totalReturn || { self: 0, financed: 0 },
    roe: dashboardMetrics?.roe || { self: 0, financed: 0 },
    finalNetWorth: dashboardMetrics?.finalNetWorth || { self: 0, financed: 0 },
    totalUnits: dashboardMetrics?.totalUnits || { self: 0, financed: 0 },
    totalCashInvested: dashboardMetrics?.totalCashInvested || { self: 0, financed: 0 }
  };
  
  console.log("🔧 Using hybrid metrics:", metricsToUse);
  
  if (metricsToUse) {
    // Update dashboard cards with hybrid metrics
    updateSummaryCards(metricsToUse);
  }
  
  // Update Summary & Download tab with centralized data
  updateSummaryDownloadTab(results);
}

function updateSummaryDownloadTab(results) {
  // Use centralized dashboard metrics for consistent data
  const dashboardMetrics = calculations.getDashboardMetrics(results);
  if (!dashboardMetrics) return;
  
  // Update total units
  const totalSelfUnits = document.getElementById('totalSelfUnits');
  const totalFinancedUnits = document.getElementById('totalFinancedUnits');
  if (totalSelfUnits) totalSelfUnits.textContent = dashboardMetrics.totalUnits.self;
  if (totalFinancedUnits) totalFinancedUnits.textContent = dashboardMetrics.totalUnits.financed;
  
  // Update net worth
  const selfNetWorth = document.getElementById('selfNetWorth');
  const financedNetWorth = document.getElementById('financedNetWorth');
  if (selfNetWorth) selfNetWorth.textContent = utils.formatCurrency(dashboardMetrics.finalNetWorth.self);
  if (financedNetWorth) financedNetWorth.textContent = utils.formatCurrency(dashboardMetrics.finalNetWorth.financed);
  
  // Get final year detailed data for cumulative cash flow
  const finalSelfData = calculations.getYearlyStrategyData(results, 15, 'self');
  const finalFinancedData = calculations.getYearlyStrategyData(results, 15, 'financed');
  
  // Update cumulative cash flow
  const selfCumulative = document.getElementById('selfCumulative');
  const financedCumulative = document.getElementById('financedCumulative');
  if (selfCumulative && finalSelfData) selfCumulative.textContent = utils.formatCurrency(finalSelfData.cumulativeCashFlow);
  if (financedCumulative && finalFinancedData) financedCumulative.textContent = utils.formatCurrency(finalFinancedData.cumulativeCashFlow);
  
  // Update KPI insights
  updateInsightsSection(results);
  
  // Generate and display recommendation
  generateRecommendation(results);
}

function generateRecommendation(results) {
  const recommendationDiv = document.getElementById('recommendation');
  if (!recommendationDiv) return;
  
  // Use centralized recommendation data
  const recommendationData = calculations.getRecommendationData(results);
  if (!recommendationData) return;
  
  const netWorthDiff = recommendationData.financedAdvantage;
  const dashboardMetrics = calculations.getDashboardMetrics(results);
  
  // Get final year data for additional context
  const finalSelfData = calculations.getYearlyStrategyData(results, 15, 'self');
  const finalFinancedData = calculations.getYearlyStrategyData(results, 15, 'financed');
  
  const cashFlowDiff = finalFinancedData.cumulativeCashFlow - finalSelfData.cumulativeCashFlow;
  const unitsDiff = dashboardMetrics.totalUnits.financed - dashboardMetrics.totalUnits.self;
  
  let recommendation = "";
  let recommendationType = recommendationData.recommendation;
  
  if (recommendationType === 'financed') {
    recommendation = `
      <h3>💰 Recommendation: Bank Financing Strategy</h3>
      <p><strong>Bank financing is the superior strategy</strong> for your investment parameters.</p>
      <ul>
        <li><strong>Net Worth Advantage:</strong> ${utils.formatCurrency(netWorthDiff)} higher final net worth</li>
        <li><strong>Property Portfolio:</strong> ${unitsDiff} more units acquired (${dashboardMetrics.totalUnits.financed} vs ${dashboardMetrics.totalUnits.self})</li>
        <li><strong>ROE Advantage:</strong> ${recommendationData.performance.financedROE.toFixed(1)}% vs ${recommendationData.performance.selfROE.toFixed(1)}%</li>
        <li><strong>Leverage Benefits:</strong> ${recommendationData.leverageMultiplier.toFixed(2)}x leverage multiplier</li>
      </ul>
      <p><em>Key insight:</em> Despite ${cashFlowDiff < 0 ? 'lower cash flow (' + utils.formatCurrency(Math.abs(cashFlowDiff)) + ' less)' : 'higher cash flow'}, 
      the wealth accumulation through leveraged real estate ownership significantly outweighs the difference.</p>
    `;
  } else if (recommendationType === 'self') {
    recommendation = `
      <h3>🏦 Recommendation: Self-Financing Strategy</h3>
      <p><strong>Self-financing is the superior strategy</strong> for your investment parameters.</p>
      <ul>
        <li><strong>Net Worth Advantage:</strong> ${utils.formatCurrency(Math.abs(netWorthDiff))} higher final net worth</li>
        <li><strong>ROE Advantage:</strong> ${recommendationData.performance.selfROE.toFixed(1)}% vs ${recommendationData.performance.financedROE.toFixed(1)}%</li>
        <li><strong>Cash Flow Advantage:</strong> ${utils.formatCurrency(Math.abs(cashFlowDiff))} more cumulative cash flow</li>
        <li><strong>Risk Reduction:</strong> No debt obligations or interest payments</li>
      </ul>
      <p><em>Key insight:</em> Lower leverage means less risk and potentially higher returns 
      when property appreciation and rent growth are moderate.</p>
    `;
  } else {
    recommendation = `
      <h3>⚖️ Recommendation: Strategies Are Nearly Equal</h3>
      <p><strong>Both strategies yield similar results</strong> with your current parameters.</p>
      <ul>
        <li><strong>Net Worth Difference:</strong> Only ${utils.formatCurrency(Math.abs(netWorthDiff))} (${recommendationData.percentDifference.toFixed(1)}% difference)</li>
        <li><strong>Self-Financed:</strong> ${dashboardMetrics.totalUnits.self} units, ${utils.formatCurrency(dashboardMetrics.finalNetWorth.self)} net worth</li>
        <li><strong>Bank-Financed:</strong> ${dashboardMetrics.totalUnits.financed} units, ${utils.formatCurrency(dashboardMetrics.finalNetWorth.financed)} net worth</li>
        <li><strong>Leverage Impact:</strong> ${recommendationData.leverageMultiplier.toFixed(2)}x multiplier with financing</li>
      </ul>
      <p><em>Consider:</em> Personal risk tolerance, cash flow preferences, and market conditions 
      when making your final decision.</p>
    `;
  }
  
  recommendationDiv.innerHTML = recommendation;
  recommendationDiv.className = `recommendation ${recommendationType}`;
}

function updateInsightsSection(results) {
  // Use centralized data for consistent metrics
  const dashboardMetrics = calculations.getDashboardMetrics(results);
  if (!dashboardMetrics) return;
  
  // Get detailed data for cash flow difference
  const finalSelfData = calculations.getYearlyStrategyData(results, 15, 'self');
  const finalFinancedData = calculations.getYearlyStrategyData(results, 15, 'financed');
  
  const netWorthDiff = dashboardMetrics.finalNetWorth.financed - dashboardMetrics.finalNetWorth.self;
  const cashFlowDiff = finalFinancedData.cumulativeCashFlow - finalSelfData.cumulativeCashFlow;
  const unitsDiff = dashboardMetrics.totalUnits.financed - dashboardMetrics.totalUnits.self;
  
  // Update net worth difference
  const netWorthDifference = document.getElementById('netWorthDifference');
  if (netWorthDifference) {
    netWorthDifference.textContent = utils.formatCurrency(Math.abs(netWorthDiff));
    netWorthDifference.className = `insight-value ${netWorthDiff >= 0 ? 'positive' : 'negative'}`;
  }
  
  // Update unit difference
  const unitDifference = document.getElementById('unitDifference');
  if (unitDifference) {
    unitDifference.textContent = `+${unitsDiff} units`;
    unitDifference.className = `insight-value ${unitsDiff >= 0 ? 'positive' : 'negative'}`;
  }
  
  // Update cash flow difference
  const cashFlowDifference = document.getElementById('cashFlowDifference');
  if (cashFlowDifference) {
    const isPositive = cashFlowDiff >= 0;
    cashFlowDifference.textContent = `${isPositive ? '+' : ''}${utils.formatCurrency(cashFlowDiff)}`;
    cashFlowDifference.className = `insight-value ${isPositive ? 'positive' : 'negative'}`;
  }
}

function calculateSummaryMetrics(results) {
  const year15 = results.selfFinanced[14];
  const financedYear15 = results.financed[14];
  const detailedYear15 = results.detailedData[14];


  // Self-financed summary
  const selfSummary = {
    finalNetWorth: year15.netWorth,
    totalCashFlow: year15.cumulativeCashFlow, // This property exists in the data
    totalUnits: year15.units,
    finalAssetValue: year15.assetValue,
    cumulativeCapEx: detailedYear15.selfCumulativeCapEx,
    totalROI: calculateROI(results, "self"),
  };

  // Bank-financed summary
  const financedSummary = {
    finalNetWorth: financedYear15.netWorth,
    totalCashFlow: financedYear15.cumulativeCashFlow, // This property exists in the data
    totalUnits: financedYear15.units,
    finalAssetValue: financedYear15.assetValue,
    finalLoanBalance: financedYear15.loanBalance,
    cumulativeCapEx: detailedYear15.financedCumulativeCapEx,
    totalROI: calculateROI(results, "financed"),
  };


  // Comparison metrics
  const totalCashInvested = calculateTotalCashInvested(results, "financed");
  const netEquity = financedSummary.finalAssetValue - financedSummary.finalLoanBalance;
  
  
  const comparison = {
    netWorthDifference:
      financedSummary.finalNetWorth - selfSummary.finalNetWorth,
    cashFlowDifference:
      financedSummary.totalCashFlow - selfSummary.totalCashFlow,
    unitsDifference: financedSummary.totalUnits - selfSummary.totalUnits,
    leverageMultiplier: netEquity > 0 ? (financedSummary.finalAssetValue / netEquity) : 1,
    unitsPerDollar: totalCashInvested > 0 ? (financedSummary.totalUnits / totalCashInvested) : 0,
  };


  return {
    self: selfSummary,
    financed: financedSummary,
    comparison: comparison,
  };
}

function calculateROI(results, strategy) {
  const totalInvested = calculateTotalCashInvested(results, strategy);
  const finalValue =
    strategy === "self"
      ? results.selfFinanced[14].assetValue +
        results.detailedData[14].selfCumulativeCapEx
      : results.financed[14].assetValue +
        results.detailedData[14].financedCumulativeCapEx;

  return totalInvested > 0
    ? ((finalValue - totalInvested) / totalInvested) * 100
    : 0;
}

function calculateTotalCashInvested(results, strategy) {
  let totalInvested = 0;

  for (let year = 1; year <= 5; year++) {
    const comparison = results.comparison[year - 1];
    if (strategy === "self") {
      totalInvested += comparison.selfNewUnits * comparison.propertyCost * 1.02;
    } else {
      const downPayment =
        comparison.propertyCost *
        (1 - results.inputParams.ltvRatio / 100) *
        1.03;
      totalInvested += comparison.financedNewUnits * downPayment;
    }
  }

  return totalInvested;
}

function updateSummaryCards(dashboardMetrics) {
  console.log("📊 Updating dashboard cards with centralized data:", {
    leverageMultiplier: dashboardMetrics.leverageMultiplier,
    unitsPerDollar: dashboardMetrics.unitsPerDollar.financed,
    finalNetWorth: dashboardMetrics.finalNetWorth,
    totalReturn: dashboardMetrics.totalReturn
  });

  // Update self-financed summary cards
  updateSummaryCard("self-net-worth", dashboardMetrics.finalNetWorth.self);
  updateSummaryCard("self-cash-flow", dashboardMetrics.totalReturn.self);  // Using total return as it's more comprehensive
  updateSummaryCard("self-roi", dashboardMetrics.roe.self);

  // Update bank-financed summary cards
  updateSummaryCard("financed-net-worth", dashboardMetrics.finalNetWorth.financed);
  updateSummaryCard("financed-cash-flow", dashboardMetrics.totalReturn.financed);
  updateSummaryCard("financed-roi", dashboardMetrics.roe.financed);

  // Update comparison cards
  const netWorthDiff = dashboardMetrics.finalNetWorth.financed - dashboardMetrics.finalNetWorth.self;
  const cashFlowDiff = dashboardMetrics.totalReturn.financed - dashboardMetrics.totalReturn.self;
  
  updateSummaryCard("net-worth-diff", netWorthDiff);
  updateSummaryCard("cash-flow-diff", cashFlowDiff);
  
  // Bank Financed Benefits - these are the key metrics that should show correct centralized data
  console.log("🏦 Updating Bank Financed Benefits with:", {
    leverageMultiplier: dashboardMetrics.leverageMultiplier,
    unitsPerDollar: dashboardMetrics.unitsPerDollar.financed
  });
  updateSummaryCard("leverage-multiplier", dashboardMetrics.leverageMultiplier);
  updateSummaryCard("units-per-dollar", dashboardMetrics.unitsPerDollar.financed);
}

function updateSummaryCard(elementId, value) {
  const element = document.getElementById(elementId);
  if (!element) return;

  console.log(`🔍 updateSummaryCard called: elementId=${elementId}, value=${value}, type=${typeof value}`);

  if (typeof value === "number") {
    if (elementId.includes("roi")) {
      element.textContent = utils.formatPercentage(value);
    } else if (elementId.includes("multiplier")) {
      const formattedValue = value.toFixed(2) + "x";
      console.log(`📊 Setting leverage multiplier: ${value} -> ${formattedValue}`);
      element.textContent = formattedValue;
    } else if (elementId.includes("per-dollar")) {
      // Value is already units per $1000 invested
      const formattedValue = value.toFixed(4) + " units per $1K";
      console.log(`📊 Setting units per dollar: ${value} -> ${formattedValue}`);
      element.textContent = formattedValue;
    } else {
      element.textContent = utils.formatCurrency(value);
    }

    // Add color coding for positive/negative values
    if (elementId.includes("diff")) {
      element.className = value >= 0 ? "positive" : "negative";
    }
  }
}
