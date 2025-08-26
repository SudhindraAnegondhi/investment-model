// ROI Analysis Module
// Handles ROI calculations and comparisons

// Make functions globally available
window.roiAnalysis = {
  updateROIAnalysis: updateROIAnalysis,
};

function updateROIAnalysis() {
  if (!utils.calculationResults) return;

  try {
    const results = utils.calculationResults;
    const params = results.inputParams;

    // Calculate total cash invested for each strategy
    const selfTotalInvested = calculateTotalCashInvested(results, "self");
    const financedTotalInvested = calculateTotalCashInvested(
      results,
      "financed"
    );

    // Calculate final values including CapEx reserves
    const selfFinalValue =
      results.selfFinanced[14].assetValue +
      results.detailedData[14].selfCumulativeCapEx;
    const financedFinalValue =
      results.financed[14].assetValue +
      results.detailedData[14].financedCumulativeCapEx;

    // Calculate ROI
    const selfROI =
      selfTotalInvested > 0
        ? ((selfFinalValue - selfTotalInvested) / selfTotalInvested) * 100
        : 0;
    const financedROI =
      financedTotalInvested > 0
        ? ((financedFinalValue - financedTotalInvested) /
            financedTotalInvested) *
          100
        : 0;

    // Calculate alternative investment value (S&P 500)
    const alternativeValue = calculateAlternativeInvestmentValue(
      results,
      params
    );
    const alternativeROI =
      selfTotalInvested > 0
        ? ((alternativeValue - selfTotalInvested) / selfTotalInvested) * 100
        : 0;

    // Update ROI comparison table
    updateROIComparisonTable(
      selfTotalInvested,
      financedTotalInvested,
      selfFinalValue,
      financedFinalValue,
      selfROI,
      financedROI,
      alternativeValue,
      alternativeROI
    );

    // Update yearly comparison
    updateROIYearlyComparison(results);

    // Update ROI cards
    updateROICards(
      selfROI,
      financedROI,
      alternativeROI,
      selfTotalInvested,
      financedTotalInvested
    );
  } catch (error) {
    console.error("Error in ROI analysis:", error);
  }
}

function calculateTotalCashInvested(results, strategy) {
  try {
    let totalInvested = 0;

    for (let year = 1; year <= 5; year++) {
      // Only first 5 years of investment
      const comparison = results.comparison[year - 1];
      if (strategy === "self") {
        totalInvested +=
          comparison.selfNewUnits * comparison.propertyCost * 1.02; // Including closing costs
      } else {
        const downPayment =
          comparison.propertyCost *
          (1 - results.inputParams.ltvRatio / 100) *
          1.03;
        totalInvested += comparison.financedNewUnits * downPayment;
      }
    }

    return totalInvested;
  } catch (error) {
    console.error("Error calculating total cash invested:", error);
    return 0;
  }
}

function calculateAlternativeInvestmentValue(results, params) {
  try {
    let currentValue = 0;

    // Simulate investing the same amount in S&P 500 over the same timeline
    for (let year = 1; year <= 5; year++) {
      const comparison = results.comparison[year - 1];
      const investedThisYear =
        comparison.selfNewUnits * comparison.propertyCost * 1.02;

      // Calculate growth for this year's investment (S&P 500 at 10% annually)
      const yearsSinceInvestment = 15 - year;
      const growthFactor = Math.pow(1.1, yearsSinceInvestment);
      currentValue += investedThisYear * growthFactor;
    }

    return currentValue;
  } catch (error) {
    console.error("Error calculating alternative investment value:", error);
    return 0;
  }
}

function updateROICards(
  selfROI,
  financedROI,
  alternativeROI,
  selfTotalInvested,
  financedTotalInvested
) {
  try {
    // Update ROI summary cards
    const roiCardsContainer = document.getElementById("roiCards");
    if (!roiCardsContainer) return;

    roiCardsContainer.innerHTML = `
      <div class="roi-grid">
        <div class="roi-card">
          <h4>Self-Financed ROI</h4>
          <div class="roi-value ${
            selfROI >= 0 ? "positive" : "negative"
          }">${utils.formatPercentage(selfROI)}</div>
          <div class="roi-details">Total Invested: ${utils.formatCurrency(
            selfTotalInvested
          )}</div>
        </div>
        <div class="roi-card">
          <h4>Bank-Financed ROI</h4>
          <div class="roi-value ${
            financedROI >= 0 ? "positive" : "negative"
          }">${utils.formatPercentage(financedROI)}</div>
          <div class="roi-details">Total Invested: ${utils.formatCurrency(
            financedTotalInvested
          )}</div>
        </div>
        <div class="roi-card">
          <h4>S&P 500 Alternative</h4>
          <div class="roi-value ${
            alternativeROI >= 0 ? "positive" : "negative"
          }">${utils.formatPercentage(alternativeROI)}</div>
          <div class="roi-details">10% annual return</div>
        </div>
      </div>
    `;
  } catch (error) {
    console.error("Error updating ROI cards:", error);
  }
}

function updateROIComparisonTable(
  selfTotalInvested,
  financedTotalInvested,
  selfFinalValue,
  financedFinalValue,
  selfROI,
  financedROI,
  alternativeValue,
  alternativeROI
) {
  try {
    const tbody = document.getElementById("roiComparisonBody");
    if (!tbody) return;

    tbody.innerHTML = `
      <tr>
        <td>Self-Financed</td>
        <td>${utils.formatCurrency(selfTotalInvested)}</td>
        <td>${utils.formatCurrency(selfFinalValue)}</td>
        <td class="${
          selfROI >= 0 ? "positive" : "negative"
        }">${utils.formatPercentage(selfROI)}</td>
      </tr>
      <tr>
        <td>Bank-Financed</td>
        <td>${utils.formatCurrency(financedTotalInvested)}</td>
        <td>${utils.formatCurrency(financedFinalValue)}</td>
        <td class="${
          financedROI >= 0 ? "positive" : "negative"
        }">${utils.formatPercentage(financedROI)}</td>
      </tr>
      <tr>
        <td>S&P 500 Alternative</td>
        <td>${utils.formatCurrency(selfTotalInvested)}</td>
        <td>${utils.formatCurrency(alternativeValue)}</td>
        <td class="${
          alternativeROI >= 0 ? "positive" : "negative"
        }">${utils.formatPercentage(alternativeROI)}</td>
      </tr>
    `;
  } catch (error) {
    console.error("Error updating ROI comparison table:", error);
  }
}

function updateROIYearlyComparison(results) {
  try {
    const tbody = document.getElementById("roiYearlyBody");
    if (!tbody) return;

    tbody.innerHTML = "";

    for (let year = 1; year <= 15; year++) {
      const self = results.selfFinanced[year - 1];
      const financed = results.financed[year - 1];
      const detailed = results.detailedData[year - 1];

      // Calculate cumulative investment up to this year
      let selfTotalInvested = 0;
      let financedTotalInvested = 0;

      for (let y = 1; y <= Math.min(year, 5); y++) {
        const comparison = results.comparison[y - 1];
        selfTotalInvested +=
          comparison.selfNewUnits * comparison.propertyCost * 1.02;
        const downPayment =
          comparison.propertyCost *
          (1 - results.inputParams.ltvRatio / 100) *
          1.03;
        financedTotalInvested += comparison.financedNewUnits * downPayment;
      }

      // Calculate current values
      const selfCurrentValue = self.assetValue + detailed.selfCumulativeCapEx;
      const financedCurrentValue =
        financed.assetValue + detailed.financedCumulativeCapEx;

      // Calculate ROI
      const selfROI =
        selfTotalInvested > 0
          ? ((selfCurrentValue - selfTotalInvested) / selfTotalInvested) * 100
          : 0;
      const financedROI =
        financedTotalInvested > 0
          ? ((financedCurrentValue - financedTotalInvested) /
              financedTotalInvested) *
            100
          : 0;

      const tr = document.createElement("tr");
      tr.innerHTML = `
        <td>${year}</td>
        <td>${utils.formatCurrency(selfTotalInvested)}</td>
        <td>${utils.formatCurrency(selfCurrentValue)}</td>
        <td class="${
          selfROI >= 0 ? "positive" : "negative"
        }">${utils.formatPercentage(selfROI)}</td>
        <td>${utils.formatCurrency(financedTotalInvested)}</td>
        <td>${utils.formatCurrency(financedCurrentValue)}</td>
        <td class="${
          financedROI >= 0 ? "positive" : "negative"
        }">${utils.formatPercentage(financedROI)}</td>
      `;

      tbody.appendChild(tr);
    }
  } catch (error) {
    console.error("Error updating ROI yearly comparison:", error);
  }
}

// Export ROI functions
window.roiAnalysis = {
  updateROIAnalysis,
  updateROIComparisonTable,
  updateROIYearlyComparison,
};
