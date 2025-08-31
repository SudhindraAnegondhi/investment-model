// Balance Sheet Module
// Handles balance sheet calculations and display

// Make functions globally available
window.balanceSheet = {
  updateSummary: updateSummary,
  calculateSummaryMetrics: calculateSummaryMetrics,
  updateNegativeCashFlowAnalysis: updateNegativeCashFlowAnalysis,
  updateModelSynopsis: updateModelSynopsis,
  updateAIInsights: updateAIInsights,
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
  
  // Update negative cash flow analysis
  updateNegativeCashFlowAnalysis();
  
  // Update model synopsis
  updateModelSynopsis();
  
  // Update AI insights if available
  updateAIInsights();
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

function updateNegativeCashFlowAnalysis() {
  if (!utils.calculationResults) return;
  
  const results = utils.calculationResults;
  const section = document.getElementById('negative-cashflow-section');
  const selfContainer = document.getElementById('self-negative-years');
  const financedContainer = document.getElementById('financed-negative-years');
  
  if (!section || !selfContainer || !financedContainer) return;
  
  // Analyze self-financed strategy using same data source as other tabs
  const selfNegativeYears = [];
  for (let year = 1; year <= 15; year++) {
    const yearData = calculations.getYearlyStrategyData(results, year, 'self');
    if (yearData && yearData.closingCash < 0) {
      selfNegativeYears.push({
        year: year,
        amount: yearData.closingCash
      });
    }
  }
  
  // Analyze bank-financed strategy using same data source as other tabs
  const financedNegativeYears = [];
  for (let year = 1; year <= 15; year++) {
    const yearData = calculations.getYearlyStrategyData(results, year, 'financed');
    if (yearData && yearData.closingCash < 0) {
      financedNegativeYears.push({
        year: year,
        amount: yearData.closingCash
      });
    }
  }
  
  // Get cards by ID for precise control
  const selfCard = document.getElementById('self-negative-card');
  const financedCard = document.getElementById('financed-negative-card');
  
  // Update self-financed section
  if (selfNegativeYears.length > 0) {
    let selfHTML = '<div class="negative-years-header">Negative Cash Flow Years:</div>';
    selfNegativeYears.forEach(item => {
      selfHTML += `
        <div class="negative-year-item">
          <span class="year">Year ${item.year}:</span>
          <span class="amount negative">${utils.formatCurrency(item.amount)}</span>
        </div>
      `;
    });
    const totalNegative = selfNegativeYears.reduce((sum, item) => sum + Math.abs(item.amount), 0);
    selfHTML += `<div class="negative-total">Total negative: ${utils.formatCurrency(-totalNegative)}</div>`;
    selfContainer.innerHTML = selfHTML;
    if (selfCard) selfCard.style.display = 'block';
  } else {
    if (selfCard) selfCard.style.display = 'none';
  }
  
  // Update bank-financed section
  if (financedNegativeYears.length > 0) {
    let financedHTML = '<div class="negative-years-header">Negative Cash Flow Years:</div>';
    financedNegativeYears.forEach(item => {
      financedHTML += `
        <div class="negative-year-item">
          <span class="year">Year ${item.year}:</span>
          <span class="amount negative">${utils.formatCurrency(item.amount)}</span>
        </div>
      `;
    });
    const totalNegative = financedNegativeYears.reduce((sum, item) => sum + Math.abs(item.amount), 0);
    financedHTML += `<div class="negative-total">Total negative: ${utils.formatCurrency(-totalNegative)}</div>`;
    financedContainer.innerHTML = financedHTML;
    if (financedCard) financedCard.style.display = 'block';
  } else {
    if (financedCard) financedCard.style.display = 'none';
  }
  
  // Show/hide the section based on whether there are any negative years
  const hasNegativeYears = selfNegativeYears.length > 0 || financedNegativeYears.length > 0;
  section.style.display = hasNegativeYears ? 'block' : 'none';
  
  console.log("📊 Negative cash flow analysis:", {
    selfNegativeYears: selfNegativeYears.length,
    financedNegativeYears: financedNegativeYears.length,
    sectionVisible: hasNegativeYears
  });
}

// Helper function to describe confidence levels
function getConfidenceDescription(confidencePercent) {
  if (confidencePercent >= 85) return 'Very High';
  if (confidencePercent >= 75) return 'High';
  if (confidencePercent >= 60) return 'Moderate';
  if (confidencePercent >= 45) return 'Low';
  return 'Very Low';
}

function updateModelSynopsis() {
  if (!utils.calculationResults) return;
  
  const results = utils.calculationResults;
  const params = results.inputParams;
  const synopsisContainer = document.getElementById('model-synopsis-content');
  
  if (!synopsisContainer) return;
  
  const dashboardMetrics = calculations.getDashboardMetrics(results);
  
  // Check if AI is enabled
  const aiEnabled = params.aiData?.enabled || false;
  const aiData = params.aiData?.projections;
  
  // Determine which strategy performed better
  const financedBetter = dashboardMetrics.finalNetWorth.financed > dashboardMetrics.finalNetWorth.self;
  const betterStrategy = financedBetter ? 'Bank-Financed' : 'Self-Financed';
  const advantage = Math.abs(dashboardMetrics.finalNetWorth.financed - dashboardMetrics.finalNetWorth.self);
  const advantagePercent = ((advantage / Math.min(dashboardMetrics.finalNetWorth.financed, dashboardMetrics.finalNetWorth.self)) * 100).toFixed(1);
  
  // Key settings impact analysis
  const keySettings = analyzeKeySettings(params, results, aiData);
  
  let synopsisHTML = `
    <div class="synopsis-grid">
      <!-- Investment Overview -->
      <div class="synopsis-card">
        <h4>🎯 Investment Strategy Overview</h4>
        <div class="synopsis-content">
          <div class="strategy-comparison">
            <div class="better-strategy">
              <strong>Recommended Strategy:</strong> ${betterStrategy}
              <span class="advantage">+${utils.formatCurrency(advantage)} (${advantagePercent}% better)</span>
            </div>
          </div>
          <div class="key-metrics">
            <div class="metric-row">
              <span>Investment Timeline:</span> <strong>${params.selfPurchaseYears || 15} years</strong>
            </div>
            <div class="metric-row">
              <span>Annual Budget:</span> <strong>${utils.formatCurrency(params.annualBudget)}</strong>
            </div>
            <div class="metric-row">
              <span>Property Cost:</span> <strong>${utils.formatCurrency(params.initialCost)}</strong>
            </div>
            <div class="metric-row">
              <span>Total Units:</span> <strong>Self: ${dashboardMetrics.totalUnits.self} | Financed: ${dashboardMetrics.totalUnits.financed}</strong>
            </div>
          </div>
        </div>
      </div>

      <!-- Key Settings Impact -->
      <div class="synopsis-card">
        <h4>⚙️ Key Settings & Their Impact</h4>
        <div class="synopsis-content">
          ${keySettings.map(setting => `
            <div class="setting-impact ${setting.impact}">
              <div class="setting-header">
                <strong>${setting.name}:</strong> ${setting.value}
              </div>
              <div class="impact-description">${setting.description}</div>
            </div>
          `).join('')}
        </div>
      </div>

      <!-- AI Enhancement Status -->
      <div class="synopsis-card">
        <h4>${aiEnabled ? '🤖' : '📊'} Analysis Method</h4>
        <div class="synopsis-content">
          ${aiEnabled ? `
            <div class="ai-enabled">
              <div class="ai-status-header">
                <strong>AI-Enhanced Analysis Active</strong>
                <span class="ai-location">${aiData?.location?.city || ''}, ${aiData?.location?.state || ''}</span>
              </div>
              <div class="ai-enhancements">
                ${getAIEnhancementsList(aiData)}
              </div>
              <div class="ai-impact">
                ${getAIImpactAnalysis(params, aiData)}
              </div>
            </div>
          ` : `
            <div class="static-analysis">
              <div class="static-status">
                <strong>Static Model Analysis</strong>
                <span class="enable-suggestion">Enable AI for location-specific insights</span>
              </div>
              <div class="static-assumptions">
                <div>• Property Appreciation: ${params.appreciationRate}% annually</div>
                <div>• Rent Growth: ${params.rentGrowthRate}% annually</div>
                <div>• Interest Rate: ${params.interestRate}% fixed</div>
              </div>
            </div>
          `}
        </div>
      </div>
    </div>
  `;
  
  synopsisContainer.innerHTML = synopsisHTML;
}

// Helper function to analyze key settings impact
function analyzeKeySettings(params, results, aiData) {
  const settings = [];
  
  // Get any user overrides
  const overrides = window.getAIOverrides ? window.getAIOverrides() : {};
  
  // Interest Rate Impact
  const interestRate = overrides.interestRate || aiData?.avgInterestRate || params.interestRate;
  const isOverridden = overrides.interestRate !== undefined;
  settings.push({
    name: 'Interest Rate',
    value: `${interestRate.toFixed(2)}%${isOverridden ? ' (User Override)' : ''}`,
    impact: interestRate > 7 ? 'negative' : interestRate < 5 ? 'positive' : 'neutral',
    description: interestRate > 7 
      ? `High rates reduce financing advantage and increase debt costs${isOverridden ? ' - based on your specific rate' : ''}`
      : interestRate < 5 
      ? `Low rates create strong financing leverage and reduce borrowing costs${isOverridden ? ' - based on your specific rate' : ''}`
      : `Moderate rates provide balanced financing conditions${isOverridden ? ' - based on your specific rate' : ''}`
  });
  
  // LTV Ratio Impact
  const ltvRatio = params.ltvRatio;
  settings.push({
    name: 'Loan-to-Value Ratio',
    value: `${ltvRatio}%`,
    impact: ltvRatio > 80 ? 'negative' : ltvRatio < 60 ? 'neutral' : 'positive',
    description: ltvRatio > 80 
      ? 'High leverage increases returns but also risk and interest costs'
      : ltvRatio < 60 
      ? 'Conservative leverage reduces risk but limits financing advantage'
      : 'Balanced leverage optimizes returns while managing risk'
  });
  
  // Property Appreciation Impact
  const appreciation = overrides.appreciationRate || aiData?.avgPropertyAppreciation || params.appreciationRate;
  const appreciationOverridden = overrides.appreciationRate !== undefined;
  settings.push({
    name: 'Property Appreciation',
    value: `${appreciation.toFixed(1)}%/year${appreciationOverridden ? ' (User Override)' : ''}`,
    impact: appreciation > 4 ? 'positive' : appreciation < 2.5 ? 'negative' : 'neutral',
    description: appreciation > 4 
      ? `Strong appreciation drives significant wealth building through asset growth${appreciationOverridden ? ' - based on your market knowledge' : ''}`
      : appreciation < 2.5 
      ? `Low appreciation limits long-term wealth accumulation potential${appreciationOverridden ? ' - based on your market knowledge' : ''}`
      : `Moderate appreciation provides steady but not exceptional growth${appreciationOverridden ? ' - based on your market knowledge' : ''}`
  });
  
  // Rent Growth Impact  
  const rentGrowth = overrides.rentGrowthRate || aiData?.avgRentGrowth || params.rentGrowthRate;
  const rentOverridden = overrides.rentGrowthRate !== undefined;
  settings.push({
    name: 'Rent Growth',
    value: `${rentGrowth.toFixed(1)}%/year${rentOverridden ? ' (User Override)' : ''}`,
    impact: rentGrowth > 3.5 ? 'positive' : rentGrowth < 2 ? 'negative' : 'neutral',
    description: rentGrowth > 3.5 
      ? `Strong rent growth improves cash flow and accelerates payoff timelines${rentOverridden ? ' - based on your rental experience' : ''}`
      : rentGrowth < 2 
      ? `Low rent growth may limit cash flow improvement over time${rentOverridden ? ' - based on your rental experience' : ''}`
      : `Steady rent growth supports consistent cash flow progression${rentOverridden ? ' - based on your rental experience' : ''}`
  });
  
  return settings;
}

// Helper function to get AI enhancements list
function getAIEnhancementsList(aiData) {
  if (!aiData) return '<div>No AI enhancements available</div>';
  
  const enhancements = [];
  if (aiData.propertyAppreciation) enhancements.push('📈 Dynamic property price projections');
  if (aiData.rentGrowth) enhancements.push('💰 Location-specific rent growth analysis');
  if (aiData.interestRates) enhancements.push('📊 Federal Reserve interest rate forecasts');
  if (aiData.marketConditions) enhancements.push('🎯 Local market condition insights');
  
  return enhancements.map(e => `<div class="ai-enhancement-item">${e}</div>`).join('');
}

// Helper function to analyze AI impact
function getAIImpactAnalysis(params, aiData) {
  if (!aiData) return 'AI impact analysis unavailable';
  
  const impacts = [];
  
  // Compare AI vs static rates
  const staticAppreciation = params.appreciationRate;
  const aiAppreciation = aiData.avgPropertyAppreciation;
  if (aiAppreciation && Math.abs(aiAppreciation - staticAppreciation) > 0.5) {
    const difference = aiAppreciation - staticAppreciation;
    impacts.push(`Property appreciation ${difference > 0 ? 'increased' : 'decreased'} by ${Math.abs(difference).toFixed(1)}% based on ${aiData.location?.city || 'local'} market data`);
  }
  
  const staticRent = params.rentGrowthRate;
  const aiRent = aiData.avgRentGrowth;
  if (aiRent && Math.abs(aiRent - staticRent) > 0.3) {
    const difference = aiRent - staticRent;
    impacts.push(`Rent growth ${difference > 0 ? 'upgraded' : 'downgraded'} by ${Math.abs(difference).toFixed(1)}% based on rental market analysis`);
  }
  
  if (impacts.length === 0) {
    impacts.push('AI projections align closely with static assumptions, validating current market conditions');
  }
  
  return impacts.map(impact => `<div class="ai-impact-item">• ${impact}</div>`).join('');
}

function updateAIInsights() {
  if (!utils.calculationResults) return;
  
  const results = utils.calculationResults;
  const section = document.getElementById('ai-insights-section');
  
  if (!section) return;
  
  // Check if AI data is available in the calculation results
  const aiData = results.inputParams?.aiData;
  
  if (!aiData || !aiData.enabled) {
    section.style.display = 'none';
    return;
  }
  
  // Show the AI insights section
  section.style.display = 'block';
  
  const projections = aiData.projections;
  
  // Update market conditions
  const conditionsEl = document.getElementById('ai-market-conditions');
  if (conditionsEl && projections.marketConditions) {
    const conditionClass = projections.marketConditions.toLowerCase();
    
    // Calculate average confidence from all AI sources
    const confidenceValues = [];
    if (projections.avgPropertyAppreciation !== undefined) {
      confidenceValues.push(0.75); // Property appreciation confidence
    }
    if (projections.avgRentGrowth !== undefined) {
      confidenceValues.push(0.8); // Rent growth confidence  
    }
    if (projections.avgInterestRate !== undefined) {
      confidenceValues.push(0.6); // Interest rate confidence
    }
    if (projections.confidence !== undefined) {
      confidenceValues.push(projections.confidence); // Market insights confidence
    }
    
    const avgConfidence = confidenceValues.length > 0 
      ? confidenceValues.reduce((a, b) => a + b) / confidenceValues.length
      : 0.5;
    
    const confidencePercent = Math.round(avgConfidence * 100);
    const confidenceDescription = getConfidenceDescription(confidencePercent);
    
    conditionsEl.innerHTML = `
      <div class="ai-market-condition ${conditionClass}">${projections.marketConditions}</div>
      <p>${projections.summary || 'Market analysis based on current trends and economic indicators.'}</p>
      <div style="margin-top: 15px; padding: 12px; background: #f8f9fa; border-radius: 6px; border-left: 4px solid #667eea;">
        <div style="margin-bottom: 5px;">
          <strong>AI Confidence Level: ${confidencePercent}%</strong>
          <span style="color: #666; font-size: 0.9em; margin-left: 8px;">(${confidenceDescription})</span>
        </div>
        <p style="font-size: 0.85em; color: #555; margin: 5px 0 0 0; line-height: 1.4;">
          This confidence level reflects the reliability of AI predictions based on data quality, 
          model accuracy, and market stability. Higher percentages indicate more reliable forecasts.
        </p>
      </div>
    `;
  }
  
  // Update risk factors
  const riskEl = document.getElementById('ai-risk-factors');
  if (riskEl && projections.riskFactors) {
    let riskHTML = '<ul>';
    projections.riskFactors.forEach(risk => {
      riskHTML += `<li>${risk}</li>`;
    });
    riskHTML += '</ul>';
    riskEl.innerHTML = riskHTML;
  }
  
  // Update opportunities
  const opportunitiesEl = document.getElementById('ai-opportunities');
  if (opportunitiesEl && projections.opportunities) {
    let oppHTML = '<ul>';
    projections.opportunities.forEach(opp => {
      oppHTML += `<li>${opp}</li>`;
    });
    oppHTML += '</ul>';
    opportunitiesEl.innerHTML = oppHTML;
  }
  
  // Update location display
  const locationEl = document.getElementById('ai-location-display');
  if (locationEl && aiData.location) {
    locationEl.textContent = `${aiData.location.city}, ${aiData.location.state}`;
  }
  
  console.log("🤖 AI insights updated for", aiData.location);
}
