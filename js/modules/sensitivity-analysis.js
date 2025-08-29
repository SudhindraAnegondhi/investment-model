// Sensitivity Analysis Module
// Handles sensitivity analysis calculations

// Make functions globally available
window.sensitivityAnalysis = {
  updateSensitivityAnalysis: updateSensitivityAnalysis,
  updateBreakEvenAnalysis: updateBreakEvenAnalysis,
  performSensitivityAnalysis: performSensitivityAnalysis,
};

function updateSensitivityAnalysis() {
  if (!utils.calculationResults) return;

  const results = utils.calculationResults;
  const params = results.inputParams;

  // Perform sensitivity analysis on key parameters
  const sensitivityResults = performSensitivityAnalysis(params);

  // Update sensitivity table
  updateSensitivityTable(sensitivityResults);
}

function updateBreakEvenAnalysis() {
  if (!utils.calculationResults) return;

  const results = utils.calculationResults;
  const params = results.inputParams;

  // Perform break-even analysis
  const breakEvenResults = performBreakEvenAnalysis(params, results);

  // Update break-even display
  updateBreakEvenDisplay(breakEvenResults);
}

function performSensitivityAnalysis(params) {
  try {
    const baseResults = calculations.performCalculations(params);
    const baseNetWorth = baseResults.selfFinanced[14].netWorth;
    const baseCashFlow = baseResults.selfFinanced[14].cashFlow;

    const sensitivityParams = [
      {
        name: "Rental Rate",
        param: "rentalRate",
        change: 0.1,
        unit: "%",
        min: 0.1,
        max: 5.0,
      },
      {
        name: "Interest Rate",
        param: "interestRate",
        change: 1,
        unit: "%",
        min: 1,
        max: 15,
      },
      {
        name: "Appreciation Rate",
        param: "appreciationRate",
        change: 1,
        unit: "%",
        min: -5,
        max: 10,
      },
      {
        name: "Property Tax Rate",
        param: "taxRate",
        change: 0.5,
        unit: "%",
        min: 0.1,
        max: 5,
      },
      {
        name: "Insurance Cost",
        param: "insurance",
        change: 200,
        unit: "$",
        min: 500,
        max: 3000,
      },
      {
        name: "Maintenance Rate",
        param: "maintenanceRate",
        change: 1,
        unit: "%",
        min: 1,
        max: 10,
      },
    ];

    const results = [];

    sensitivityParams.forEach(({ name, param, change, unit, min, max }) => {
      try {
        // Test positive change
        const positiveParams = { ...params };
        if (unit === "%") {
          positiveParams[param] = Math.min(params[param] + change, max);
        } else {
          positiveParams[param] = Math.min(params[param] + change, max);
        }

        const positiveResults =
          calculations.performCalculations(positiveParams);
        const positiveNetWorth = positiveResults.selfFinanced[14].netWorth;
        const positiveImpact =
          baseNetWorth > 0
            ? ((positiveNetWorth - baseNetWorth) / baseNetWorth) * 100
            : 0;

        // Test negative change
        const negativeParams = { ...params };
        if (unit === "%") {
          negativeParams[param] = Math.max(params[param] - change, min);
        } else {
          negativeParams[param] = Math.max(params[param] - change, min);
        }

        const negativeResults =
          calculations.performCalculations(negativeParams);
        const negativeNetWorth = negativeResults.selfFinanced[14].netWorth;
        const negativeImpact =
          baseNetWorth > 0
            ? ((negativeNetWorth - baseNetWorth) / baseNetWorth) * 100
            : 0;

        results.push({
          parameter: name,
          baseValue:
            unit === "%"
              ? `${(params[param] * 100).toFixed(2)}%`
              : utils.formatCurrency(params[param]),
          positiveChange: `+${change}${unit}`,
          positiveImpact: positiveImpact,
          negativeChange: `-${change}${unit}`,
          negativeImpact: negativeImpact,
        });
      } catch (error) {
        console.error(`Error in sensitivity analysis for ${name}:`, error);
      }
    });

    return results;
  } catch (error) {
    console.error("Error in sensitivity analysis:", error);
    return [];
  }
}

function performBreakEvenAnalysis(params, results) {
  try {
    // Find cash flow break-even year for self-financed
    const selfCashFlowBreakEven = results.selfFinanced.findIndex(
      (year) => year.cashFlow >= 0
    );

    // Find cash flow break-even year for financed
    const financedCashFlowBreakEven = results.financed.findIndex(
      (year) => year.cashFlow >= 0
    );

    // Find ROI break-even (when annual ROI exceeds 10%)
    const selfROIBreakEven = results.selfFinanced.findIndex((year) => {
      if (year.netWorth <= 0) return false;
      const annualROI = (year.cashFlow / year.netWorth) * 100;
      return annualROI >= 10;
    });

    const financedROIBreakEven = results.financed.findIndex((year) => {
      if (year.netWorth <= 0) return false;
      const annualROI = (year.cashFlow / year.netWorth) * 100;
      return annualROI >= 10;
    });

    return {
      selfCashFlowBreakEven:
        selfCashFlowBreakEven >= 0 ? selfCashFlowBreakEven + 1 : null,
      financedCashFlowBreakEven:
        financedCashFlowBreakEven >= 0 ? financedCashFlowBreakEven + 1 : null,
      selfROIBreakEven: selfROIBreakEven >= 0 ? selfROIBreakEven + 1 : null,
      financedROIBreakEven:
        financedROIBreakEven >= 0 ? financedROIBreakEven + 1 : null,
    };
  } catch (error) {
    console.error("Error in break-even analysis:", error);
    return {
      selfCashFlowBreakEven: null,
      financedCashFlowBreakEven: null,
      selfROIBreakEven: null,
      financedROIBreakEven: null,
    };
  }
}

function updateSensitivityTable(results) {
  const tbody = document.getElementById("sensitivityNetWorthBody");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (results.length === 0) {
    const tr = document.createElement("tr");
    tr.innerHTML =
      '<td colspan="6" style="text-align: center; color: #666;">No sensitivity data available</td>';
    tbody.appendChild(tr);
    return;
  }

  results.forEach((result) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${result.parameter}</td>
      <td>${result.baseValue}</td>
      <td>${result.positiveChange}</td>
      <td class="${
        result.positiveImpact >= 0 ? "positive" : "negative"
      }">${utils.formatPercentage(result.positiveImpact)}</td>
      <td>${result.negativeChange}</td>
      <td class="${
        result.negativeImpact >= 0 ? "positive" : "negative"
      }">${utils.formatPercentage(result.negativeImpact)}</td>
    `;
    tbody.appendChild(tr);
  });
}

function updateBreakEvenDisplay(results) {
  // Update cash flow break-even display
  const cashFlowBreakEvenElement = document.getElementById("cashFlowBreakEven");
  if (cashFlowBreakEvenElement) {
    if (results.selfCashFlowBreakEven) {
      cashFlowBreakEvenElement.textContent = `Year ${results.selfCashFlowBreakEven}`;
    } else {
      cashFlowBreakEvenElement.textContent = "Not within 15 years";
    }
  }

  // Update ROI break-even display
  const roiBreakEvenElement = document.getElementById("roiBreakEven");
  if (roiBreakEvenElement) {
    if (results.selfROIBreakEven) {
      roiBreakEvenElement.textContent = `Year ${results.selfROIBreakEven}`;
    } else {
      roiBreakEvenElement.textContent = "Not within 15 years";
    }
  }
}
