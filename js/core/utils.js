// Utility Functions
// Core helper functions for the rental investment model

// Global variables
let calculationResults = null;
let currentModalYear = 0;
let currentModalIndex = 0;

// Currency formatting
function formatCurrency(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) {
    return "$0";
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// Percentage formatting
function formatPercentage(value) {
  if (value === null || value === undefined || isNaN(value)) {
    return "0.0%";
  }
  return new Intl.NumberFormat("en-US", {
    style: "percent",
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
  }).format(value / 100);
}

// Number formatting for display
function formatNumber(value, decimals = 0) {
  if (value === null || value === undefined || isNaN(value)) {
    return "0";
  }
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  }).format(value);
}

// Input parameter validation
function validateInput(value, min = 0, max = null) {
  const num = parseFloat(value);
  if (isNaN(num) || num < min) {
    return min;
  }
  if (max !== null && num > max) {
    return max;
  }
  return num;
}

// Get input parameters from form
function getInputParameters() {
  return {
    annualBudget: validateInput(document.getElementById("annualBudget").value),
    selfPurchaseYears: validateInput(
      document.getElementById("selfPurchaseYears").value,
      0,
      30
    ),
    initialCost: validateInput(document.getElementById("initialCost").value),
    rentalRate: validateInput(document.getElementById("rentalRate").value),
    interestRate: validateInput(document.getElementById("interestRate").value),
    ltvRatio: validateInput(document.getElementById("ltvRatio").value, 0, 100),
    loanTerm: validateInput(document.getElementById("loanTerm").value, 1, 30),
    insurance: validateInput(document.getElementById("insurance").value),
    landPercent: validateInput(
      document.getElementById("landPercent").value,
      0,
      100
    ),
    maintenanceRate: validateInput(
      document.getElementById("maintenanceRate").value
    ),
    costIncrease: validateInput(document.getElementById("costIncrease").value),
    taxRate: validateInput(document.getElementById("taxRate").value, 0, 10),
    incomeTaxRate: validateInput(
      document.getElementById("incomeTaxRate").value,
      0,
      50
    ),
    passthroughLLC: document.getElementById("passthroughLLC").value,
    assessedValuePercent: validateInput(
      document.getElementById("assessedValuePercent").value,
      0,
      100
    ),
    appreciationRate: validateInput(
      document.getElementById("appreciationRate").value
    ),
    financedPurchaseYears: validateInput(
      document.getElementById("financedPurchaseYears").value,
      0,
      30
    ),
    maxUnitsFinanced: validateInput(
      document.getElementById("maxUnitsFinanced").value,
      1,
      10
    ),
    maxUnitsFinancedLimitYears: validateInput(
      document.getElementById("maxUnitsFinancedLimitYears").value,
      1,
      10
    ),
    rentGrowthRate: validateInput(
      document.getElementById("rentGrowthRate").value
    ),
    vacancyRate: validateInput(
      document.getElementById("vacancyRate").value,
      0,
      100
    ),
    managementRate: validateInput(
      document.getElementById("managementRate").value,
      0,
      100
    ),
    capexRate: validateInput(
      document.getElementById("capexRate").value,
      0,
      100
    ),
    expenseInflation: validateInput(
      document.getElementById("expenseInflation").value,
      0,
      100
    ),
    insuranceInflation: validateInput(
      document.getElementById("insuranceInflation").value,
      0,
      100
    ),
    closingCostPercent: validateInput(
      document.getElementById("closingCostPercent").value,
      0,
      100
    ),
    loanOriginationPercent: validateInput(
      document.getElementById("loanOriginationPercent").value,
      0,
      100
    ),
    assessedGrowthRate: validateInput(
      document.getElementById("assessedGrowthRate").value,
      0,
      100
    ),
  };
}

// Tab switching function
function activateTab(btn, tabName) {
  // If switching to a non-input tab and calculations haven't been run, run them silently
  if (tabName !== "inputs" && !utils.calculationResults) {
    console.log("Silently calculating scenarios for tab switch...");
    try {
      const params = utils.getInputParameters();
      const results = calculations.performCalculations(params);
      utils.calculationResults = results;

      // Update all modules that depend on calculations
      if (window.roiAnalysis) {
        window.roiAnalysis.updateROIAnalysis();
      }
      if (window.sensitivityAnalysis) {
        window.sensitivityAnalysis.performSensitivityAnalysis(params);
      }
      if (window.balanceSheet) {
        window.balanceSheet.calculateSummaryMetrics();
      }
      if (window.uiManager) {
        window.uiManager.updateAllTables();
      }
    } catch (error) {
      console.error("Error in silent calculation:", error);
    }
  }

  // Remove active class from all tabs and contents
  const tabs = document.querySelectorAll(".tab");
  const contents = document.querySelectorAll(".tab-content");

  tabs.forEach((tab) => tab.classList.remove("active"));
  contents.forEach((content) => content.classList.remove("active"));

  // Add active class to clicked tab and corresponding content
  btn.classList.add("active");
  document.getElementById(tabName).classList.add("active");
}

// Error handling utility
function handleError(error, context = "") {
  console.error(`Error in ${context}:`, error);
  // Could add user notification here
  return null;
}

// Debounce function for performance
function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

// Deep clone utility
function deepClone(obj) {
  if (obj === null || typeof obj !== "object") return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map((item) => deepClone(item));
  if (typeof obj === "object") {
    const clonedObj = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }
}

// Export utilities for use in other modules
window.utils = {
  formatCurrency,
  formatPercentage,
  formatNumber,
  validateInput,
  getInputParameters,
  activateTab,
  handleError,
  debounce,
  deepClone,
  calculationResults,
  currentModalYear,
  currentModalIndex,
};
