// Interactive Charts Module
// Provides data visualization capabilities using Chart.js

class ChartManager {
  constructor() {
    this.charts = {};
    this.colors = {
      selfFinanced: "#4CAF50",
      financed: "#2196F3",
      comparison: "#FF9800",
      positive: "#4CAF50",
      negative: "#F44336",
      neutral: "#9E9E9E",
      background: "rgba(76, 175, 80, 0.2)",
      border: "rgba(76, 175, 80, 1)",
    };
  }

  // Initialize all charts after calculations
  initializeCharts(results) {
    if (!results || !results.selfFinanced || !results.financed) {
      console.error("Invalid results data for charts");
      return;
    }

    this.createCashFlowWaterfall(results);
    this.createNetWorthProgression(results);
    this.createSensitivityTornado(results);
    this.updateKPITiles(results);
  }

  // Cash Flow Waterfall Chart
  createCashFlowWaterfall(results) {
    const ctx = document.getElementById("cashFlowWaterfallChart");
    if (!ctx) return;

    // Destroy existing chart
    if (this.charts.waterfall) {
      this.charts.waterfall.destroy();
    }

    // Prepare waterfall data for both strategies
    const years = results.selfFinanced.map((_, index) => `Year ${index + 1}`);
    const selfCashFlow = results.selfFinanced.map((year) => year.cashFlow);
    const financedCashFlow = results.financed.map((year) => year.cashFlow);

    this.charts.waterfall = new Chart(ctx, {
      type: "bar",
      data: {
        labels: years,
        datasets: [
          {
            label: "Self-Financed Cash Flow",
            data: selfCashFlow,
            backgroundColor: selfCashFlow.map((val) =>
              val >= 0 ? this.colors.positive : this.colors.negative
            ),
            borderColor: this.colors.selfFinanced,
            borderWidth: 2,
          },
          {
            label: "Bank-Financed Cash Flow",
            data: financedCashFlow,
            backgroundColor: financedCashFlow.map((val) =>
              val >= 0 ? "rgba(33, 150, 243, 0.6)" : "rgba(244, 67, 54, 0.6)"
            ),
            borderColor: this.colors.financed,
            borderWidth: 2,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: function (value) {
                return "$" + value.toLocaleString();
              },
            },
          },
        },
        plugins: {
          title: {
            display: true,
            text: "Cash Flow Waterfall Analysis",
            font: { size: 16, weight: "bold" },
          },
          legend: {
            display: true,
            position: "top",
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                return (
                  context.dataset.label + ": $" + context.raw.toLocaleString()
                );
              },
            },
          },
        },
      },
    });
  }

  // Net Worth Progression Chart
  createNetWorthProgression(results) {
    const ctx = document.getElementById("netWorthChart");
    if (!ctx) return;

    if (this.charts.netWorth) {
      this.charts.netWorth.destroy();
    }

    const years = results.selfFinanced.map((_, index) => index + 1);
    const selfNetWorth = results.selfFinanced.map((year) => year.netWorth);
    const financedNetWorth = results.financed.map((year) => year.netWorth);
    const cumulativeSelfCF = results.selfFinanced.map(
      (year) => year.cumulativeCashFlow
    );
    const cumulativeFinancedCF = results.financed.map(
      (year) => year.cumulativeCashFlow
    );

    this.charts.netWorth = new Chart(ctx, {
      type: "line",
      data: {
        labels: years,
        datasets: [
          {
            label: "Self-Financed Net Worth",
            data: selfNetWorth,
            borderColor: this.colors.selfFinanced,
            backgroundColor: "rgba(76, 175, 80, 0.1)",
            borderWidth: 3,
            fill: false,
            tension: 0.1,
          },
          {
            label: "Bank-Financed Net Worth",
            data: financedNetWorth,
            borderColor: this.colors.financed,
            backgroundColor: "rgba(33, 150, 243, 0.1)",
            borderWidth: 3,
            fill: false,
            tension: 0.1,
          },
          {
            label: "Self-Financed Cumulative Cash Flow",
            data: cumulativeSelfCF,
            borderColor: this.colors.comparison,
            backgroundColor: "rgba(255, 152, 0, 0.1)",
            borderWidth: 2,
            borderDash: [5, 5],
            fill: false,
            tension: 0.1,
          },
          {
            label: "Bank-Financed Cumulative Cash Flow",
            data: cumulativeFinancedCF,
            borderColor: "#E91E63",
            backgroundColor: "rgba(233, 30, 99, 0.1)",
            borderWidth: 2,
            borderDash: [5, 5],
            fill: false,
            tension: 0.1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: {
            title: {
              display: true,
              text: "Years",
            },
          },
          y: {
            title: {
              display: true,
              text: "Value ($)",
            },
            ticks: {
              callback: function (value) {
                return "$" + (value / 1000).toFixed(0) + "K";
              },
            },
          },
        },
        plugins: {
          title: {
            display: true,
            text: "Net Worth & Cash Flow Progression",
            font: { size: 16, weight: "bold" },
          },
          legend: {
            display: true,
            position: "top",
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                return (
                  context.dataset.label + ": $" + context.raw.toLocaleString()
                );
              },
            },
          },
        },
      },
    });
  }

  // Sensitivity Tornado Diagram
  createSensitivityTornado(results) {
    const ctx = document.getElementById("sensitivityChart");
    if (!ctx) return;

    if (this.charts.sensitivity) {
      this.charts.sensitivity.destroy();
    }

    // Generate sensitivity analysis data
    const sensitivityData = this.generateSensitivityData(results);

    this.charts.sensitivity = new Chart(ctx, {
      type: "bar",
      data: {
        labels: sensitivityData.labels,
        datasets: [
          {
            label: "Impact on Net Worth (Negative)",
            data: sensitivityData.negative,
            backgroundColor: "rgba(244, 67, 54, 0.7)",
            borderColor: this.colors.negative,
            borderWidth: 1,
          },
          {
            label: "Impact on Net Worth (Positive)",
            data: sensitivityData.positive,
            backgroundColor: "rgba(76, 175, 80, 0.7)",
            borderColor: this.colors.positive,
            borderWidth: 1,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: "y",
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: "Parameters",
            },
          },
          x: {
            title: {
              display: true,
              text: "Net Worth Impact ($000s)",
            },
            ticks: {
              callback: function (value) {
                return "$" + (value / 1000).toFixed(0) + "K";
              },
            },
          },
        },
        plugins: {
          title: {
            display: true,
            text: "Sensitivity Tornado Diagram",
            font: { size: 16, weight: "bold" },
          },
          legend: {
            display: true,
            position: "top",
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                return (
                  context.dataset.label + ": $" + context.raw.toLocaleString()
                );
              },
            },
          },
        },
      },
    });
  }

  // Generate sensitivity analysis data
  generateSensitivityData(baseResults) {
    // Use the real sensitivity analysis module instead of simplified calculations
    if (
      window.sensitivityAnalysis &&
      window.sensitivityAnalysis.performSensitivityAnalysis
    ) {
      const sensitivityResults =
        window.sensitivityAnalysis.performSensitivityAnalysis(
          baseResults.inputParams
        );

      const chartData = {
        labels: [],
        positive: [],
        negative: [],
      };

      sensitivityResults.forEach((result) => {
        chartData.labels.push(result.parameter);
        // Convert percentage impacts to dollar amounts based on base net worth
        const baseNetWorth = baseResults.selfFinanced[14].netWorth;
        const positiveDollarImpact =
          (result.positiveImpact / 100) * baseNetWorth;
        const negativeDollarImpact =
          (result.negativeImpact / 100) * baseNetWorth;

        chartData.positive.push(Math.max(positiveDollarImpact, 0));
        chartData.negative.push(Math.min(negativeDollarImpact, 0));
      });

      return chartData;
    }

    // Fallback to original method if sensitivity analysis module not available
    const baseParams = baseResults.inputParams;
    const baseNetWorth = baseResults.selfFinanced[14].netWorth;

    const parameters = [
      { name: "Rental Rate", key: "rentalRate", variation: 0.1 },
      {
        name: "Property Appreciation",
        key: "appreciationRate",
        variation: 0.01,
      },
      { name: "Interest Rate", key: "interestRate", variation: 0.005 },
      { name: "Vacancy Rate", key: "vacancyRate", variation: 0.02 },
      { name: "Maintenance Rate", key: "maintenanceRate", variation: 0.2 },
      { name: "Property Tax Rate", key: "taxRate", variation: 0.002 },
    ];

    const sensitivityResults = {
      labels: [],
      positive: [],
      negative: [],
    };

    parameters.forEach((param) => {
      // Calculate high scenario
      const highParams = { ...baseParams };
      highParams[param.key] = baseParams[param.key] * (1 + param.variation);
      const highResults = this.performQuickCalculation(highParams);
      const highNetWorth = highResults[14].netWorth;

      // Calculate low scenario
      const lowParams = { ...baseParams };
      lowParams[param.key] = baseParams[param.key] * (1 - param.variation);
      const lowResults = this.performQuickCalculation(lowParams);
      const lowNetWorth = lowResults[14].netWorth;

      sensitivityResults.labels.push(param.name);
      sensitivityResults.positive.push(
        Math.max(highNetWorth - baseNetWorth, lowNetWorth - baseNetWorth, 0)
      );
      sensitivityResults.negative.push(
        Math.min(highNetWorth - baseNetWorth, lowNetWorth - baseNetWorth, 0)
      );
    });

    return sensitivityResults;
  }

  // Quick calculation for sensitivity analysis
  performQuickCalculation(params) {
    // Simplified calculation for sensitivity analysis
    const results = [];
    let cumulativeCF = 0;

    for (let year = 1; year <= 15; year++) {
      const rental =
        params.initialCost *
        (params.rentalRate / 100) *
        Math.pow(1 + (params.appreciationRate || 3) / 100, year - 1);
      const expenses = params.initialCost * 0.02 * Math.pow(1.025, year - 1);
      const cashFlow = rental - expenses;
      cumulativeCF += cashFlow;

      results.push({
        cashFlow: cashFlow,
        cumulativeCashFlow: cumulativeCF,
        netWorth:
          params.initialCost *
          Math.pow(1 + (params.appreciationRate || 3) / 100, year),
      });
    }

    return results;
  }

  // Calculate NPV for sensitivity analysis
  calculateNPV(cashFlows, discountRate = 0.08) {
    return cashFlows.reduce((npv, year, index) => {
      return npv + year.cashFlow / Math.pow(1 + discountRate, index + 1);
    }, 0);
  }

  // Update KPI tiles with current results
  updateKPITiles(results) {
    if (!results) return;

    const finalYear = results.selfFinanced.length - 1;
    const selfFinal = results.selfFinanced[finalYear];
    const financedFinal = results.financed[finalYear];

    // Update self-financed KPIs
    this.updateKPI("self-net-worth", selfFinal.netWorth);
    this.updateKPI("self-cash-flow", selfFinal.cumulativeCashFlow);
    this.updateKPI(
      "self-roi",
      this.calculateROI(results.selfFinanced, results.inputParams)
    );

    // Update financed KPIs
    this.updateKPI("financed-net-worth", financedFinal.netWorth);
    this.updateKPI("financed-cash-flow", financedFinal.cumulativeCashFlow);
    this.updateKPI(
      "financed-roi",
      this.calculateROI(results.financed, results.inputParams)
    );

    // Update comparison metrics
    const netWorthDiff = selfFinal.netWorth - financedFinal.netWorth;
    const cashFlowDiff =
      selfFinal.cumulativeCashFlow - financedFinal.cumulativeCashFlow;

    this.updateKPI("net-worth-diff", netWorthDiff);
    this.updateKPI("cash-flow-diff", cashFlowDiff);

    // Update alerts
    this.updateAlerts(results);
  }

  // Update individual KPI element
  updateKPI(elementId, value) {
    const element = document.getElementById(elementId);
    if (element) {
      element.textContent = this.formatCurrency(value);

      // Add trend indicator
      const trendClass = value >= 0 ? "positive" : "negative";
      element.className = `kpi-value ${trendClass}`;
    }
  }

  // Calculate ROI
  calculateROI(yearlyData, params) {
    const totalInvested = params.annualBudget * params.selfPurchaseYears;
    const finalNetWorth = yearlyData[yearlyData.length - 1].netWorth;
    return ((finalNetWorth - totalInvested) / totalInvested) * 100;
  }

  // Update alert system
  updateAlerts(results) {
    const alertContainer = document.getElementById("alert-container");
    if (!alertContainer) return;

    alertContainer.innerHTML = "";

    const alerts = [];

    // Check for negative cash flow periods
    const negativeYears = results.selfFinanced.filter(
      (year) => year.cashFlow < 0
    ).length;
    if (negativeYears > 0) {
      alerts.push({
        type: "warning",
        message: `${negativeYears} years of negative cash flow in self-financed strategy`,
      });
    }

    const financedNegativeYears = results.financed.filter(
      (year) => year.cashFlow < 0
    ).length;
    if (financedNegativeYears > 0) {
      alerts.push({
        type: "warning",
        message: `${financedNegativeYears} years of negative cash flow in financed strategy`,
      });
    }

    // Check break-even point
    const selfBreakEven = results.selfFinanced.findIndex(
      (year) => year.cumulativeCashFlow > 0
    );
    if (selfBreakEven > 10) {
      alerts.push({
        type: "info",
        message: `Self-financed strategy breaks even after year ${
          selfBreakEven + 1
        }`,
      });
    }

    // Display alerts
    alerts.forEach((alert) => {
      const alertElement = document.createElement("div");
      alertElement.className = `alert alert-${alert.type}`;
      alertElement.innerHTML = `
        <span class="alert-icon">${
          alert.type === "warning" ? "⚠️" : "ℹ️"
        }</span>
        <span class="alert-message">${alert.message}</span>
      `;
      alertContainer.appendChild(alertElement);
    });
  }

  // Format currency values
  formatCurrency(value) {
    if (Math.abs(value) >= 1000000) {
      return "$" + (value / 1000000).toFixed(1) + "M";
    } else if (Math.abs(value) >= 1000) {
      return "$" + (value / 1000).toFixed(0) + "K";
    } else {
      return "$" + value.toLocaleString();
    }
  }

  // Destroy all charts (cleanup)
  destroyAllCharts() {
    Object.keys(this.charts).forEach((key) => {
      if (this.charts[key]) {
        this.charts[key].destroy();
        delete this.charts[key];
      }
    });
  }

  // Resize all charts
  resizeCharts() {
    Object.keys(this.charts).forEach((key) => {
      if (this.charts[key]) {
        this.charts[key].resize();
      }
    });
  }
}

// Export chart manager for use in other modules
window.chartManager = new ChartManager();
