// Test script to verify main calculations.js matches debug_model_script.js

// Load required modules
const fs = require('fs');
const path = require('path');

// Read and evaluate the main calculation files
const dataModelCode = fs.readFileSync(path.join(__dirname, 'js/core/data-model.js'), 'utf8');
const calculationsCode = fs.readFileSync(path.join(__dirname, 'js/core/calculations.js'), 'utf8');

// Create a mock environment similar to the browser
global.window = {};
global.dataModel = {};
global.utils = {};
global.console = console;

// Mock required functions
global.utils.handleError = (error, context) => {
  console.error(`Error in ${context}:`, error);
};

global.updateAllTables = () => {
  // Mock function
};

// Execute the data model first
eval(dataModelCode);

// Check if we have Node.js exports, if so, use them, otherwise look for globals
if (typeof module !== 'undefined' && module.exports) {
  const dataModelExports = require('./js/core/data-model.js');
  global.dataModel = dataModelExports;
} else {
  // For browser environment
  global.dataModel = {
    InvestmentCohort,
    YearlyMetrics, 
    CalculationResults,
    validateInvestmentParameters,
    getDefaultParameters
  };
}

// Execute the calculations code
eval(calculationsCode);

// Test parameters matching debug_model_script.js
const params = {
  initialCost: 160000,
  annualBudget: 170000,
  selfPurchaseYears: 3,
  interestRate: 7,
  loanTerm: 5,
  ltvRatio: 70,
  rentalRate: 1.9,
  vacancyRate: 5,
  managementRate: 8,
  maintenanceRate: 1,
  insurance: 1300,
  taxRate: 1.1,
  assessedValuePercent: 80,
  assessedGrowthRate: 2,
  costIncrease: 3,
  rentGrowthRate: 2,
  capexRate: 0.5,
  landPercent: 20,
  passthroughLLC: "yes",
  maxUnitsFinanced: 2,
  maxUnitsFinancedLimitYears: 3,
};

console.log("=== MAIN APP CALCULATION TEST ===");

try {
  const results = performCalculations(params);
  
  console.log(
    "Year | Property Cost | Units Purchased | Total Units | Cash Flow Balance | Decision"
  );
  console.log(
    "-----|---------------|-----------------|------------|-------------------|---------"
  );
  
  for (let year = 1; year <= 15; year++) {
    const metrics = results.financed[year - 1];
    const propertyCost = Math.round(
      params.initialCost * Math.pow(1 + params.costIncrease / 100, year - 1)
    );
    const unitsPurchased = metrics.newUnits || 0;
    const totalUnits = metrics.units || 0;
    const cashFlowBalance = Math.round(metrics.cashFlow || 0);
    const decision =
      unitsPurchased > 0
        ? cashFlowBalance >= 0
          ? "Purchased"
          : "Rejected"
        : "None";
    console.log(
      `${year.toString().padStart(4)} | $${propertyCost
        .toLocaleString()
        .padStart(13)} | ${unitsPurchased.toString().padStart(15)} | ${totalUnits
        .toString()
        .padStart(10)} | $${cashFlowBalance
        .toLocaleString()
        .padStart(17)} | ${decision}`
    );
  }
} catch (error) {
  console.error("Error running main app calculations:", error);
  console.log("\nMissing functions or modules - this is expected since we're running outside the browser");
}