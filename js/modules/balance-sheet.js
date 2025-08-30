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

  // Calculate summary metrics for dashboard
  const summary = calculateSummaryMetrics(results);

  // Update dashboard cards
  updateSummaryCards(summary);
  
  // Update Summary & Download tab
  updateSummaryDownloadTab(results);
}

function updateSummaryDownloadTab(results) {
  // Get final year data
  const finalYear = results.selfFinanced.length - 1;
  const selfFinal = results.selfFinanced[finalYear];
  const financedFinal = results.financed[finalYear];
  const comparisonFinal = results.comparison[finalYear];
  
  // Update total units
  const totalSelfUnits = document.getElementById('totalSelfUnits');
  const totalFinancedUnits = document.getElementById('totalFinancedUnits');
  if (totalSelfUnits) totalSelfUnits.textContent = selfFinal.units || comparisonFinal.selfTotalUnits;
  if (totalFinancedUnits) totalFinancedUnits.textContent = financedFinal.units || comparisonFinal.financedTotalUnits;
  
  // Update net worth
  const selfNetWorth = document.getElementById('selfNetWorth');
  const financedNetWorth = document.getElementById('financedNetWorth');
  if (selfNetWorth) selfNetWorth.textContent = utils.formatCurrency(selfFinal.netWorth);
  if (financedNetWorth) financedNetWorth.textContent = utils.formatCurrency(financedFinal.netWorth);
  
  // Update cumulative cash flow
  const selfCumulative = document.getElementById('selfCumulative');
  const financedCumulative = document.getElementById('financedCumulative');
  if (selfCumulative) selfCumulative.textContent = utils.formatCurrency(selfFinal.cumulativeCashFlow);
  if (financedCumulative) financedCumulative.textContent = utils.formatCurrency(financedFinal.cumulativeCashFlow);
  
  // Update KPI insights
  updateInsightsSection(results);
  
  // Generate and display recommendation
  generateRecommendation(results);
}

function generateRecommendation(results) {
  const recommendationDiv = document.getElementById('recommendation');
  if (!recommendationDiv) return;
  
  const finalYear = results.selfFinanced.length - 1;
  const selfFinal = results.selfFinanced[finalYear];
  const financedFinal = results.financed[finalYear];
  
  const netWorthDiff = financedFinal.netWorth - selfFinal.netWorth;
  const cashFlowDiff = financedFinal.cumulativeCashFlow - selfFinal.cumulativeCashFlow;
  const unitsDiff = financedFinal.units - selfFinal.units;
  
  let recommendation = "";
  let recommendationType = "";
  
  if (netWorthDiff > 50000) {
    recommendationType = "financed";
    recommendation = `
      <h3>💰 Recommendation: Bank Financing Strategy</h3>
      <p><strong>Bank financing is the superior strategy</strong> for your investment parameters.</p>
      <ul>
        <li><strong>Net Worth Advantage:</strong> ${utils.formatCurrency(netWorthDiff)} higher final net worth</li>
        <li><strong>Property Portfolio:</strong> ${unitsDiff} more units acquired (${financedFinal.units} vs ${selfFinal.units})</li>
        <li><strong>Leverage Benefits:</strong> Control more assets with the same capital investment</li>
      </ul>
      <p><em>Key insight:</em> Despite lower cash flow (${utils.formatCurrency(Math.abs(cashFlowDiff))} less), 
      the wealth accumulation through leveraged real estate ownership significantly outweighs the cash flow difference.</p>
    `;
  } else if (netWorthDiff < -50000) {
    recommendationType = "self";
    recommendation = `
      <h3>🏦 Recommendation: Self-Financing Strategy</h3>
      <p><strong>Self-financing is the superior strategy</strong> for your investment parameters.</p>
      <ul>
        <li><strong>Net Worth Advantage:</strong> ${utils.formatCurrency(Math.abs(netWorthDiff))} higher final net worth</li>
        <li><strong>Cash Flow Advantage:</strong> ${utils.formatCurrency(cashFlowDiff)} more cumulative cash flow</li>
        <li><strong>Risk Reduction:</strong> No debt obligations or interest payments</li>
      </ul>
      <p><em>Key insight:</em> Lower leverage means less risk and potentially higher returns 
      when property appreciation and rent growth are moderate.</p>
    `;
  } else {
    recommendationType = "neutral";
    recommendation = `
      <h3>⚖️ Recommendation: Strategies Are Nearly Equal</h3>
      <p><strong>Both strategies yield similar results</strong> with your current parameters.</p>
      <ul>
        <li><strong>Net Worth Difference:</strong> Only ${utils.formatCurrency(Math.abs(netWorthDiff))}</li>
        <li><strong>Self-Financed:</strong> ${selfFinal.units} units, ${utils.formatCurrency(selfFinal.netWorth)} net worth</li>
        <li><strong>Bank-Financed:</strong> ${financedFinal.units} units, ${utils.formatCurrency(financedFinal.netWorth)} net worth</li>
      </ul>
      <p><em>Consider:</em> Personal risk tolerance, cash flow preferences, and market conditions 
      when making your final decision.</p>
    `;
  }
  
  recommendationDiv.innerHTML = recommendation;
  recommendationDiv.className = `recommendation ${recommendationType}`;
}

function updateInsightsSection(results) {
  const finalYear = results.selfFinanced.length - 1;
  const selfFinal = results.selfFinanced[finalYear];
  const financedFinal = results.financed[finalYear];
  
  const netWorthDiff = financedFinal.netWorth - selfFinal.netWorth;
  const cashFlowDiff = financedFinal.cumulativeCashFlow - selfFinal.cumulativeCashFlow;
  const unitsDiff = financedFinal.units - selfFinal.units;
  
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

function updateSummaryCards(summary) {
  // Update self-financed summary cards
  updateSummaryCard("self-net-worth", summary.self.finalNetWorth);
  updateSummaryCard("self-cash-flow", summary.self.totalCashFlow);
  updateSummaryCard("self-roi", summary.self.totalROI);

  // Update bank-financed summary cards
  updateSummaryCard("financed-net-worth", summary.financed.finalNetWorth);
  updateSummaryCard("financed-cash-flow", summary.financed.totalCashFlow);
  updateSummaryCard("financed-roi", summary.financed.totalROI);

  // Update comparison cards
  updateSummaryCard("net-worth-diff", summary.comparison.netWorthDifference);
  updateSummaryCard("cash-flow-diff", summary.comparison.cashFlowDifference);
  updateSummaryCard(
    "leverage-multiplier",
    summary.comparison.leverageMultiplier
  );
  updateSummaryCard("units-per-dollar", summary.comparison.unitsPerDollar);
}

function updateSummaryCard(elementId, value) {
  const element = document.getElementById(elementId);
  if (!element) return;

  if (typeof value === "number") {
    if (elementId.includes("roi")) {
      element.textContent = utils.formatPercentage(value);
    } else if (elementId.includes("multiplier")) {
      element.textContent = value.toFixed(2) + "x";
    } else if (elementId.includes("per-dollar")) {
      // Format as units per $1000 invested for better readability
      const unitsPerThousand = value * 1000;
      element.textContent = unitsPerThousand.toFixed(4) + " units per $1K";
    } else {
      element.textContent = utils.formatCurrency(value);
    }

    // Add color coding for positive/negative values
    if (elementId.includes("diff")) {
      element.className = value >= 0 ? "positive" : "negative";
    }
  }
}
