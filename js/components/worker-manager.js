// Web Worker Manager
// Manages calculation workers for better performance

class WorkerManager {
  constructor() {
    this.worker = null;
    this.isCalculating = false;
    this.progressCallback = null;
  }

  // Initialize worker (disabled - always use main thread)
  initWorker() {
    console.log("Worker disabled - using main thread calculations only");
    this.worker = null;
  }

  // Worker message handling disabled - using main thread only

  // Calculate scenarios using main thread only
  calculateScenarios(params) {
    if (this.isCalculating) {
      this.showWarning("Calculation already in progress");
      return;
    }

    this.isCalculating = true;
    this.showLoadingIndicator("Calculating investment scenarios...");

    console.log("🔍 USING MAIN THREAD calculations");
    this.calculateScenariosMainThread(params);
  }

  // Main thread calculation
  calculateScenariosMainThread(params) {
    try {
      // Use a small delay to allow UI to update
      setTimeout(() => {
        try {
          console.log("Running calculations with params:", params);
          const results = calculations.performCalculations(params);
          console.log("Calculation results:", results);
          
          // Ensure summary metrics are calculated
          if (results && !results.summaryMetrics?.leverageMultiplier) {
            console.log("⚠️ Summary metrics incomplete in worker, manually calling calculateSummaryMetrics...");
            try {
              calculations.calculateSummaryMetrics(results);
              console.log("✅ Manual calculateSummaryMetrics completed in worker");
            } catch (error) {
              console.error("❌ calculateSummaryMetrics failed in worker:", error);
            }
          }

          this.isCalculating = false;
          this.hideLoadingIndicator();
          utils.calculationResults = results;

          // Update UI components
          try {
            if (
              window.uiManager &&
              typeof uiManager.updateAllTables === "function"
            ) {
              uiManager.updateAllTables();
            } else if (typeof updateAllTables === "function") {
              updateAllTables();
            }
          } catch (uiError) {
            console.error("Error updating tables:", uiError);
          }

          try {
            if (
              window.chartManager &&
              typeof chartManager.initializeCharts === "function"
            ) {
              chartManager.initializeCharts(results);
            }
          } catch (chartError) {
            console.error("Error updating charts:", chartError);
          }

          this.showSuccess("Calculations completed successfully");
          
          // Navigate back to previous tab after calculations complete
          if (typeof navigateAfterCalculation === "function") {
            navigateAfterCalculation();
          }
          
          // Hide loading overlay
          if (typeof hideLoadingOverlay === "function") {
            hideLoadingOverlay();
          }
        } catch (error) {
          this.isCalculating = false;
          this.hideLoadingIndicator();
          console.error("Calculation error:", error);
          this.showError("Calculation error: " + error.message);
          
          // Hide loading overlay on error
          if (typeof hideLoadingOverlay === "function") {
            hideLoadingOverlay();
          }
        }
      }, 100);
    } catch (error) {
      this.isCalculating = false;
      this.hideLoadingIndicator();
      console.error("Calculation setup error:", error);
      this.showError("Calculation setup error: " + error.message);
      
      // Hide loading overlay on setup error
      if (typeof hideLoadingOverlay === "function") {
        hideLoadingOverlay();
      }
    }
  }

  // Perform sensitivity analysis
  performSensitivityAnalysis(baseParams) {
    if (this.isCalculating) {
      this.showWarning("Calculation already in progress");
      return;
    }

    const parameters = [
      { name: "Rental Rate", key: "rentalRate" },
      { name: "Property Appreciation", key: "appreciationRate" },
      { name: "Interest Rate", key: "interestRate" },
      { name: "Vacancy Rate", key: "vacancyRate" },
      { name: "Maintenance Rate", key: "maintenanceRate" },
      { name: "Property Tax Rate", key: "taxRate" },
      { name: "CapEx Rate", key: "capexRate" },
      { name: "Rent Growth Rate", key: "rentGrowthRate" },
    ];

    this.isCalculating = true;
    this.showLoadingIndicator("Performing sensitivity analysis...");

    if (this.worker) {
      this.worker.postMessage({
        type: "SENSITIVITY_ANALYSIS",
        data: { baseParams, parameters },
      });
    } else {
      // Fall back to simplified sensitivity analysis
      this.performSensitivityAnalysisMainThread(baseParams, parameters);
    }
  }

  // Main thread sensitivity analysis fallback
  performSensitivityAnalysisMainThread(baseParams, parameters) {
    setTimeout(() => {
      try {
        const results = this.performSimplifiedSensitivityAnalysis(
          baseParams,
          parameters
        );
        this.isCalculating = false;
        this.hideLoadingIndicator();
        this.handleSensitivityResults(results);
      } catch (error) {
        this.isCalculating = false;
        this.hideLoadingIndicator();
        console.error("Sensitivity analysis error:", error);
        this.showError("Sensitivity analysis error: " + error.message);
      }
    }, 100);
  }

  // Simplified sensitivity analysis for main thread
  performSimplifiedSensitivityAnalysis(baseParams, parameters) {
    const results = [];

    parameters.forEach((param) => {
      const result = {
        parameter: param.name,
        key: param.key,
        baseValue: baseParams[param.key],
        scenarios: [],
      };

      // Test smaller set of variations for performance
      const variations = [-0.2, -0.1, 0.1, 0.2];

      variations.forEach((variation) => {
        const testParams = { ...baseParams };
        testParams[param.key] = baseParams[param.key] * (1 + variation);

        const testResults = calculations.performCalculations(testParams);
        const finalYear = testResults.selfFinanced[14];

        result.scenarios.push({
          variation: variation,
          newValue: testParams[param.key],
          netWorth: finalYear.netWorth,
          cashFlow: finalYear.cumulativeCashFlow,
          roi: this.calculateROI(testResults.selfFinanced, testParams),
        });
      });

      results.push(result);
    });

    return results;
  }

  // Perform Monte Carlo simulation
  performMonteCarloSimulation(baseParams, numSimulations = 100) {
    if (this.isCalculating) {
      this.showWarning("Calculation already in progress");
      return;
    }

    // Reduce simulation count for main thread to prevent freezing
    if (!this.worker && numSimulations > 100) {
      numSimulations = 100;
    }

    // Define variable parameters with their distributions
    const variableParams = [
      {
        key: "appreciationRate",
        mean: baseParams.appreciationRate,
        stdDev: 1.0,
      },
      { key: "rentGrowthRate", mean: baseParams.rentGrowthRate, stdDev: 0.5 },
      { key: "vacancyRate", mean: baseParams.vacancyRate, stdDev: 1.0 },
      { key: "interestRate", mean: baseParams.interestRate, stdDev: 0.5 },
      { key: "maintenanceRate", mean: baseParams.maintenanceRate, stdDev: 0.2 },
      { key: "capexRate", mean: baseParams.capexRate, stdDev: 1.0 },
    ];

    this.isCalculating = true;
    this.showLoadingIndicator(
      `Running Monte Carlo simulation (${numSimulations} runs)...`,
      true
    );

    if (this.worker) {
      this.worker.postMessage({
        type: "MONTE_CARLO",
        data: { baseParams, numSimulations, variableParams },
      });
    } else {
      // Simplified Monte Carlo for main thread
      this.performMonteCarloMainThread(
        baseParams,
        numSimulations,
        variableParams
      );
    }
  }

  // Main thread Monte Carlo fallback
  performMonteCarloMainThread(baseParams, numSimulations, variableParams) {
    setTimeout(() => {
      try {
        const results = this.performSimplifiedMonteCarloSimulation(
          baseParams,
          numSimulations,
          variableParams
        );
        this.isCalculating = false;
        this.hideLoadingIndicator();
        this.handleMonteCarloResults(results);
      } catch (error) {
        this.isCalculating = false;
        this.hideLoadingIndicator();
        console.error("Monte Carlo simulation error:", error);
        this.showError("Monte Carlo simulation error: " + error.message);
      }
    }, 100);
  }

  // Simplified Monte Carlo simulation
  performSimplifiedMonteCarloSimulation(
    baseParams,
    numSimulations,
    variableParams
  ) {
    const results = {
      simulations: [],
      statistics: {},
    };

    for (let i = 0; i < numSimulations; i++) {
      // Generate random parameters based on distributions
      const randomParams = { ...baseParams };

      variableParams.forEach((param) => {
        // Simple normal distribution approximation
        const randomValue = this.generateNormalRandom(param.mean, param.stdDev);
        randomParams[param.key] = Math.max(0, randomValue);
      });

      const simulationResult = calculations.performCalculations(randomParams);
      const finalYear = simulationResult.selfFinanced[14];

      results.simulations.push({
        parameters: randomParams,
        finalNetWorth: finalYear.netWorth,
        finalCashFlow: finalYear.cumulativeCashFlow,
        roi: this.calculateROI(simulationResult.selfFinanced, randomParams),
      });

      // Update progress periodically
      if (i % 10 === 0) {
        this.updateProgressIndicator((i / numSimulations) * 100);
      }
    }

    // Calculate statistics
    const netWorths = results.simulations.map((s) => s.finalNetWorth);
    const cashFlows = results.simulations.map((s) => s.finalCashFlow);
    const rois = results.simulations.map((s) => s.roi);

    results.statistics = {
      netWorth: this.calculateStatistics(netWorths),
      cashFlow: this.calculateStatistics(cashFlows),
      roi: this.calculateStatistics(rois),
    };

    return results;
  }

  // Handle sensitivity analysis results
  handleSensitivityResults(results) {
    // Create sensitivity results table
    this.displaySensitivityResults(results);

    // Update sensitivity chart if chart manager is available
    if (window.chartManager && window.chartManager.updateSensitivityChart) {
      chartManager.updateSensitivityChart(results);
    }

    this.showSuccess("Sensitivity analysis completed");
  }

  // Handle Monte Carlo results
  handleMonteCarloResults(results) {
    // Display Monte Carlo results
    this.displayMonteCarloResults(results);

    // Create distribution charts
    this.createDistributionCharts(results);

    this.showSuccess(
      `Monte Carlo simulation completed (${results.simulations.length} simulations)`
    );
  }

  // Display sensitivity results
  displaySensitivityResults(results) {
    const container = document.getElementById("sensitivity-results");
    if (!container) return;

    let html = `
      <div class="sensitivity-results-container">
        <h3>Sensitivity Analysis Results</h3>
        <div class="table-container">
          <table class="sensitivity-table">
            <thead>
              <tr>
                <th>Parameter</th>
                <th>Base Value</th>
                <th>-20%</th>
                <th>-10%</th>
                <th>-5%</th>
                <th>+5%</th>
                <th>+10%</th>
                <th>+20%</th>
              </tr>
            </thead>
            <tbody>
    `;

    results.forEach((result) => {
      html += `<tr>
        <td><strong>${result.parameter}</strong></td>
        <td>${result.baseValue.toFixed(2)}</td>`;

      result.scenarios.forEach((scenario) => {
        const impactClass =
          scenario.netWorth > 0
            ? "positive"
            : scenario.netWorth < 0
            ? "negative"
            : "neutral";
        html += `<td class="${impactClass}">$${(
          scenario.netWorth / 1000
        ).toFixed(0)}K</td>`;
      });

      html += `</tr>`;
    });

    html += `
            </tbody>
          </table>
        </div>
      </div>
    `;

    container.innerHTML = html;
  }

  // Display Monte Carlo results
  displayMonteCarloResults(results) {
    const container = document.getElementById("monte-carlo-results");
    if (!container) return;

    const { statistics } = results;

    const html = `
      <div class="monte-carlo-results-container">
        <h3>Monte Carlo Simulation Results</h3>
        <div class="statistics-grid">
          <div class="stat-card">
            <h4>Net Worth Distribution</h4>
            <div class="stat-row">
              <span>Mean:</span>
              <span>$${(statistics.netWorth.mean / 1000).toFixed(0)}K</span>
            </div>
            <div class="stat-row">
              <span>Median:</span>
              <span>$${(statistics.netWorth.median / 1000).toFixed(0)}K</span>
            </div>
            <div class="stat-row">
              <span>5th Percentile:</span>
              <span>$${(statistics.netWorth.percentile5 / 1000).toFixed(
                0
              )}K</span>
            </div>
            <div class="stat-row">
              <span>95th Percentile:</span>
              <span>$${(statistics.netWorth.percentile95 / 1000).toFixed(
                0
              )}K</span>
            </div>
          </div>
          
          <div class="stat-card">
            <h4>Cash Flow Distribution</h4>
            <div class="stat-row">
              <span>Mean:</span>
              <span>$${(statistics.cashFlow.mean / 1000).toFixed(0)}K</span>
            </div>
            <div class="stat-row">
              <span>Median:</span>
              <span>$${(statistics.cashFlow.median / 1000).toFixed(0)}K</span>
            </div>
            <div class="stat-row">
              <span>5th Percentile:</span>
              <span>$${(statistics.cashFlow.percentile5 / 1000).toFixed(
                0
              )}K</span>
            </div>
            <div class="stat-row">
              <span>95th Percentile:</span>
              <span>$${(statistics.cashFlow.percentile95 / 1000).toFixed(
                0
              )}K</span>
            </div>
          </div>

          <div class="stat-card">
            <h4>ROI Distribution</h4>
            <div class="stat-row">
              <span>Mean:</span>
              <span>${statistics.roi.mean.toFixed(1)}%</span>
            </div>
            <div class="stat-row">
              <span>Median:</span>
              <span>${statistics.roi.median.toFixed(1)}%</span>
            </div>
            <div class="stat-row">
              <span>5th Percentile:</span>
              <span>${statistics.roi.percentile5.toFixed(1)}%</span>
            </div>
            <div class="stat-row">
              <span>95th Percentile:</span>
              <span>${statistics.roi.percentile95.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </div>
    `;

    container.innerHTML = html;
  }

  // Create distribution charts for Monte Carlo results
  createDistributionCharts(results) {
    // This would create histogram charts showing distributions
    // Implementation depends on Chart.js setup
    console.log(
      "Distribution charts would be created here",
      results.statistics
    );
  }

  // UI Helper Methods
  showLoadingIndicator(message = "Calculating...", showProgress = false) {
    let indicator = document.getElementById("loading-indicator");
    if (!indicator) {
      indicator = document.createElement("div");
      indicator.id = "loading-indicator";
      indicator.className = "loading-indicator";
      document.body.appendChild(indicator);
    }

    indicator.innerHTML = `
      <div class="loading-content">
        <div class="loading-spinner"></div>
        <div class="loading-message">${message}</div>
        ${
          showProgress
            ? '<div class="progress-bar"><div class="progress-fill" id="progress-fill"></div></div>'
            : ""
        }
      </div>
    `;

    indicator.style.display = "flex";
  }

  hideLoadingIndicator() {
    const indicator = document.getElementById("loading-indicator");
    if (indicator) {
      indicator.style.display = "none";
    }
  }

  updateProgressIndicator(progress) {
    const progressFill = document.getElementById("progress-fill");
    if (progressFill) {
      progressFill.style.width = `${progress}%`;
    }
  }

  showSuccess(message) {
    this.showNotification(message, "success");
  }

  showWarning(message) {
    this.showNotification(message, "warning");
  }

  showError(message) {
    this.showNotification(message, "error");
  }

  showNotification(message, type = "info") {
    const notification = document.createElement("div");
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
      <span class="notification-message">${message}</span>
      <button class="notification-close" onclick="this.parentElement.remove()">&times;</button>
    `;

    document.body.appendChild(notification);

    // Auto remove after 5 seconds
    setTimeout(() => {
      if (notification.parentElement) {
        notification.remove();
      }
    }, 5000);
  }

  // Utility functions for main thread calculations
  calculateROI(yearlyData, params) {
    const totalInvested = params.annualBudget * params.selfPurchaseYears;
    const finalNetWorth = yearlyData[yearlyData.length - 1].netWorth;
    return ((finalNetWorth - totalInvested) / totalInvested) * 100;
  }

  // Generate normal random numbers (Box-Muller transform)
  generateNormalRandom(mean, stdDev) {
    let u = 0,
      v = 0;
    while (u === 0) u = Math.random(); // Converting [0,1) to (0,1)
    while (v === 0) v = Math.random();

    const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    return mean + stdDev * z;
  }

  // Calculate statistics for arrays
  calculateStatistics(values) {
    values.sort((a, b) => a - b);
    const n = values.length;

    return {
      min: values[0],
      max: values[n - 1],
      mean: values.reduce((a, b) => a + b, 0) / n,
      median:
        n % 2 === 0
          ? (values[n / 2 - 1] + values[n / 2]) / 2
          : values[Math.floor(n / 2)],
      percentile5: values[Math.floor(n * 0.05)],
      percentile95: values[Math.floor(n * 0.95)],
      stdDev: Math.sqrt(
        values.reduce(
          (sq, v) =>
            sq + Math.pow(v - values.reduce((a, b) => a + b, 0) / n, 2),
          0
        ) /
          (n - 1)
      ),
    };
  }

  // Cleanup
  terminate() {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.isCalculating = false;
  }
}

// Global worker manager instance
window.workerManager = new WorkerManager();
