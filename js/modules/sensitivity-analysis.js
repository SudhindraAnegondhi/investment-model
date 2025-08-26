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

  // Update break-even table
  updateBreakEvenTable(breakEvenResults);
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
    const breakEvenPoints = [];

    // Rental rate break-even for positive cash flow
    let rentalRate = params.rentalRate;
    let testParams = { ...params };
    let foundBreakEven = false;

    while (rentalRate >= 0.1 && rentalRate <= 5.0 && !foundBreakEven) {
      testParams.rentalRate = rentalRate;
      try {
        const testResults = calculations.performCalculations(testParams);
        if (testResults.selfFinanced[14].cashFlow >= 0) {
          breakEvenPoints.push({
            metric: "Rental Rate for Positive Cash Flow",
            value: `${(rentalRate * 100).toFixed(2)}%`,
            description: "Minimum rental rate needed for positive cash flow",
          });
          foundBreakEven = true;
        }
      } catch (error) {
        console.error("Error in rental rate break-even:", error);
      }
      rentalRate -= 0.01;
    }

    // Interest rate break-even for financed strategy
    let interestRate = params.interestRate;
    testParams = { ...params };
    foundBreakEven = false;

    while (interestRate <= 15 && interestRate >= 1 && !foundBreakEven) {
      testParams.interestRate = interestRate;
      try {
        const testResults = calculations.performCalculations(testParams);
        if (testResults.financed[14].cashFlow < 0) {
          breakEvenPoints.push({
            metric: "Maximum Interest Rate (Financed)",
            value: `${(interestRate - 0.5).toFixed(2)}%`,
            description: "Maximum interest rate before negative cash flow",
          });
          foundBreakEven = true;
        }
      } catch (error) {
        console.error("Error in interest rate break-even:", error);
      }
      interestRate += 0.5;
    }

    // Property tax break-even
    let taxRate = params.taxRate;
    testParams = { ...params };
    foundBreakEven = false;

    while (taxRate <= 5 && taxRate >= 0.1 && !foundBreakEven) {
      testParams.taxRate = taxRate;
      try {
        const testResults = calculations.performCalculations(testParams);
        if (testResults.selfFinanced[14].cashFlow < 0) {
          breakEvenPoints.push({
            metric: "Maximum Property Tax Rate",
            value: `${(taxRate - 0.1).toFixed(1)}%`,
            description: "Maximum property tax rate before negative cash flow",
          });
          foundBreakEven = true;
        }
      } catch (error) {
        console.error("Error in tax rate break-even:", error);
      }
      taxRate += 0.1;
    }

    // Insurance cost break-even
    let insurance = params.insurance;
    testParams = { ...params };
    foundBreakEven = false;

    while (insurance <= 3000 && insurance >= 500 && !foundBreakEven) {
      testParams.insurance = insurance;
      try {
        const testResults = calculations.performCalculations(testParams);
        if (testResults.selfFinanced[14].cashFlow < 0) {
          breakEvenPoints.push({
            metric: "Maximum Insurance Cost",
            value: utils.formatCurrency(insurance - 100),
            description: "Maximum insurance cost before negative cash flow",
          });
          foundBreakEven = true;
        }
      } catch (error) {
        console.error("Error in insurance break-even:", error);
      }
      insurance += 100;
    }

    return breakEvenPoints;
  } catch (error) {
    console.error("Error in break-even analysis:", error);
    return [];
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

function updateBreakEvenTable(results) {
  const tbody = document.getElementById("breakEvenBody");
  if (!tbody) return;

  tbody.innerHTML = "";

  if (results.length === 0) {
    const tr = document.createElement("tr");
    tr.innerHTML =
      '<td colspan="3" style="text-align: center; color: #666;">No break-even data available</td>';
    tbody.appendChild(tr);
    return;
  }

  results.forEach((result) => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${result.metric}</td>
      <td>${result.value}</td>
      <td>${result.description}</td>
    `;
    tbody.appendChild(tr);
  });
}
