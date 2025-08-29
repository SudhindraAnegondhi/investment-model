// Load the actual calculation functions and test them

// Mock the required functions and objects
const utils = {
  getInputParameters: function() {
    return {
      annualBudget: 170000,
      initialCost: 160000,
      rentalRate: 1.0,
      interestRate: 7.0,
      ltvRatio: 70,
      loanTerm: 5,
      vacancyRate: 5,
      managementRate: 8,
      maintenanceRate: 1,
      insurance: 1300,
      selfPurchaseYears: 5,
      financedPurchaseYears: 5,
      passthroughLLC: "yes",
      taxRate: 1.5,
      capexRate: 5,
      landPercent: 20,
      appreciationRate: 3,
      rentGrowthRate: 3,
      costIncrease: 1,
      assessedValuePercent: 20,
      assessedGrowthRate: 2.5,
      expenseInflation: 2.5,
      insuranceInflation: 4,
      closingCostPercent: 2,
      loanOriginationPercent: 1,
      incomeTaxRate: 25,
      maxUnitsFinanced: 2,
      maxUnitsFinancedLimitYears: 3
    };
  }
};

const dataModel = {
  CalculationResults: function() {
    this.selfFinanced = [];
    this.financed = [];
    this.comparison = [];
    this.detailedData = [];
    this.inputParams = null;
  },
  YearlyMetrics: function() {
    this.units = 0;
    this.newUnits = 0;
    this.cashFlow = 0;
    this.cumulativeCashFlow = 0;
    this.assetValue = 0;
    this.netWorth = 0;
    this.gpr = 0;
    this.egi = 0;
    this.noi = 0;
    this.depreciation = 0;
    this.debtService = 0;
    this.interestExpense = 0;
    this.taxableIncome = 0;
    this.taxes = 0;
    this.netIncome = 0;
    this.capex = 0;
    this.loanBalance = 0;
  },
  validateInvestmentParameters: function(params) {
    return { isValid: true, errors: [] };
  }
};

// Load the calculation file content and execute it
const fs = require('fs');
const calculationsCode = fs.readFileSync('./js/core/calculations.js', 'utf8');

// Remove the window.calculations export line
const codeWithoutExport = calculationsCode.replace(/window\.calculations = {[\s\S]*?};/, '');

// Execute the code
eval(codeWithoutExport);

// Test the actual performCalculations function
console.log("🧪 Testing Actual performCalculations Function");

const params = utils.getInputParameters();
console.log("Parameters:", params);

try {
  const results = performCalculations(params);
  
  console.log("\n📊 Year 1 Results:");
  console.log("Self-financed units:", results.selfFinanced[0].units);
  console.log("Self-financed new units:", results.selfFinanced[0].newUnits);
  console.log("Financed units:", results.financed[0].units);
  console.log("Financed new units:", results.financed[0].newUnits);
  
  console.log("\nComparison data:");
  console.log("Self new units:", results.comparison[0].selfNewUnits);
  console.log("Financed new units:", results.comparison[0].financedNewUnits);
  
} catch (error) {
  console.error("Error in calculation:", error.message);
  console.error("Stack:", error.stack);
}