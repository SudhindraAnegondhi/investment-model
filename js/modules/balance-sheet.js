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

  // Calculate summary metrics
  const summary = calculateSummaryMetrics(results);

  // Update summary cards
  updateSummaryCards(summary);
}

function calculateSummaryMetrics(results) {
  const year15 = results.selfFinanced[14];
  const financedYear15 = results.financed[14];
  const detailedYear15 = results.detailedData[14];

  // Debug: Log the actual data structure
  console.log("Year 15 Self-Financed:", year15);
  console.log("Year 15 Financed:", financedYear15);

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

  // Debug: Log the calculated summaries
  console.log("Self Summary:", selfSummary);
  console.log("Financed Summary:", financedSummary);

  // Comparison metrics
  const comparison = {
    netWorthDifference:
      financedSummary.finalNetWorth - selfSummary.finalNetWorth,
    cashFlowDifference:
      financedSummary.totalCashFlow - selfSummary.totalCashFlow,
    unitsDifference: financedSummary.totalUnits - selfSummary.totalUnits,
    leverageMultiplier:
      financedSummary.finalAssetValue /
      (financedSummary.finalAssetValue - financedSummary.finalLoanBalance),
    unitsPerDollar:
      financedSummary.totalUnits /
      calculateTotalCashInvested(results, "financed"),
  };

  console.log("Comparison:", comparison);

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
    if (
      elementId.includes("roi") ||
      elementId.includes("multiplier") ||
      elementId.includes("per-dollar")
    ) {
      element.textContent = utils.formatPercentage(value);
    } else {
      element.textContent = utils.formatCurrency(value);
    }

    // Add color coding for positive/negative values
    if (elementId.includes("diff")) {
      element.className = value >= 0 ? "positive" : "negative";
    }
  }
}
