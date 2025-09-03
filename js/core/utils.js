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
  // Safety check for undefined/null values
  if (value === undefined || value === null || value === "") {
    console.warn("⚠️ validateInput: undefined/null value, using default:", min);
    return min;
  }

  const num = parseFloat(value);
  if (isNaN(num) || num < min) {
    return min;
  }
  if (max !== null && num > max) {
    return max;
  }
  return num;
}

// Safe helper function to get element value with fallback
function safeGetElementValue(id, defaultValue = 0, min = null, max = null) {
  try {
    const element = document.getElementById(id);
    if (!element) {
      console.warn(`⚠️ Element ${id} not found, using default:`, defaultValue);
      return defaultValue;
    }
    return validateInput(element.value, min, max);
  } catch (error) {
    console.error(`❌ Error getting value for ${id}:`, error);
    return defaultValue;
  }
}

// Safe helper function to get checkbox state
function safeGetElementChecked(id, defaultValue = false) {
  try {
    const element = document.getElementById(id);
    if (!element) {
      console.warn(`⚠️ Checkbox ${id} not found, using default:`, defaultValue);
      return defaultValue;
    }
    return element.checked;
  } catch (error) {
    console.error(`❌ Error getting checkbox state for ${id}:`, error);
    return defaultValue;
  }
}

// Safe budget mode helper
function safeBudgetMode() {
  try {
    if (typeof getBudgetMode === 'function') {
      return getBudgetMode();
    }
    const budgetModeRadio = document.querySelector('input[name="budgetMode"]:checked');
    return budgetModeRadio ? budgetModeRadio.value : "predetermined";
  } catch (error) {
    console.warn("⚠️ Could not get budget mode, using predetermined:", error);
    return "predetermined";
  }
}

// Get input parameters from form (safe version with error handling)
function getInputParameters() {
  console.log("🔥 UTILS.JS: getInputParameters() CALLED - Starting safely");
  
  try {
    return {
      // Core parameters using safe helper function
      annualBudget: safeGetElementValue("annualBudget", 170000),
      selfPurchaseYears: safeGetElementValue("selfPurchaseYears", 5, 0, 30),
      initialCost: safeGetElementValue("initialCost", 400000),
      rentalRate: safeGetElementValue("rentalRate", 1.25),
      interestRate: safeGetElementValue("interestRate", 7),
      ltvRatio: safeGetElementValue("ltvRatio", 80, 0, 100),
      loanTerm: safeGetElementValue("loanTerm", 30, 1, 30),
      insurance: safeGetElementValue("insurance", 2000),
      landPercent: safeGetElementValue("landPercent", 30, 0, 100),
      maintenanceRate: safeGetElementValue("maintenanceRate", 5),
      costIncrease: safeGetElementValue("costIncrease", 3),
      taxRate: safeGetElementValue("taxRate", 1.25, 0, 10),
      incomeTaxRate: safeGetElementValue("incomeTaxRate", 25, 0, 50),
      passthroughLLC: safeGetElementValue("passthroughLLC", "yes") === "yes" ? "yes" : "no",
      assessedValuePercent: safeGetElementValue("assessedValuePercent", 85, 0, 100),
      appreciationRate: safeGetElementValue("appreciationRate", 3),
      financedPurchaseYears: safeGetElementValue("financedPurchaseYears", 5, 0, 30),
      maxUnitsFinanced: safeGetElementValue("maxUnitsFinanced", 5, 1, 10),
      maxUnitsFinancedLimitYears: safeGetElementValue("maxUnitsFinancedLimitYears", 5, 1, 10),
      rentGrowthRate: safeGetElementValue("rentGrowthRate", 3),
      vacancyRate: safeGetElementValue("vacancyRate", 8, 0, 100),
      managementRate: safeGetElementValue("managementRate", 8, 0, 100),
      capexRate: safeGetElementValue("capexRate", 6, 0, 100),
      expenseInflation: safeGetElementValue("expenseInflation", 3, 0, 100),
      insuranceInflation: safeGetElementValue("insuranceInflation", 3, 0, 100),
      closingCostPercent: safeGetElementValue("closingCostPercent", 2, 0, 100),
      loanOriginationPercent: safeGetElementValue("loanOriginationPercent", 1, 0, 100),
      assessedGrowthRate: safeGetElementValue("assessedGrowthRate", 2, 0, 100),

      // Budget Mode Parameters with safe access
      budgetMode: safeBudgetMode(),
      investmentObjective: safeGetElementValue("investmentObjective", "balanced"),
      maxSingleInvestment: safeGetElementValue("maxSingleInvestment", 500000),
      totalInvestmentLimit: safeGetElementValue("totalInvestmentLimit", 2000000),
      minROIThreshold: safeGetElementValue("minROIThreshold", 8),
      targetAnnualCashFlow: safeGetElementValue("targetAnnualCashFlow", 50000),
      riskTolerance: safeGetElementValue("riskTolerance", "moderate"),

      // Additional parameters
      cashReservePercent: safeGetElementValue("cashReservePercent", 20, 0, 100),

      // Auto-sale settings
      autoSaleEnabled: safeGetElementChecked("autoSaleEnabled", false),
      autoSaleThreshold: safeGetElementValue("autoSaleThreshold", 25, 0, 100),
      autoSaleStrategy: safeGetElementValue("autoSaleStrategy", "highestAppreciation"),
    };
  } catch (error) {
    console.error("❌ Critical error in getInputParameters:", error);
    // Return basic defaults to prevent complete failure
    return {
      annualBudget: 170000,
      selfPurchaseYears: 5,
      initialCost: 400000,
      rentalRate: 1.25,
      interestRate: 7,
      ltvRatio: 80,
      loanTerm: 30,
      insurance: 2000,
      landPercent: 30,
      maintenanceRate: 5,
      costIncrease: 3,
      taxRate: 1.25,
      incomeTaxRate: 25,
      passthroughLLC: "yes",
      assessedValuePercent: 85,
      appreciationRate: 3,
      financedPurchaseYears: 5,
      maxUnitsFinanced: 5,
      maxUnitsFinancedLimitYears: 5,
      rentGrowthRate: 3,
      vacancyRate: 8,
      managementRate: 8,
      capexRate: 6,
      expenseInflation: 3,
      insuranceInflation: 3,
      closingCostPercent: 2,
      loanOriginationPercent: 1,
      assessedGrowthRate: 2,
      budgetMode: "predetermined",
      investmentObjective: "balanced",
      maxSingleInvestment: 500000,
      totalInvestmentLimit: 2000000,
      minROIThreshold: 8,
      targetAnnualCashFlow: 50000,
      riskTolerance: "moderate",
      cashReservePercent: 20,
      autoSaleEnabled: false,
      autoSaleThreshold: 25,
      autoSaleStrategy: "highestAppreciation",
    };
  }
}

// Tab switching function
function activateTab(btn, tabName) {
  // DISABLED: Silent calculations on tab switch to prevent infinite loops
  // Users must manually click Calculate button
  console.log("📋 Switching to tab:", tabName, "- Silent calculations disabled");
  
  // Show message if no calculations have been run yet
  if (tabName !== "inputs" && !utils.calculationResults) {
    console.log("💡 No calculations available - user needs to run calculations manually");
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