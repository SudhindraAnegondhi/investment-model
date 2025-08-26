// Data Model
// Data structures and validation for the rental investment model

// Data structures
class InvestmentCohort {
  constructor(year, units, costPerUnit, loanAmount = 0) {
    this.year = year;
    this.units = units;
    this.costPerUnit = costPerUnit;
    this.loanAmount = loanAmount;
    this.monthlyEMI = 0;
    this.annualEMI = 0;
  }
}

class YearlyMetrics {
  constructor() {
    this.units = 0;
    this.newUnits = 0;
    this.cashFlow = 0;
    this.cumulativeCashFlow = 0;
    this.assetValue = 0;
    this.netWorth = 0;
    this.loanBalance = 0;
    this.netEquity = 0;
    this.gpr = 0;
    this.egi = 0;
    this.noi = 0;
    this.depreciation = 0;
    this.debtService = 0;
    this.taxableIncome = 0;
    this.taxes = 0;
    this.netIncome = 0;
    this.capex = 0;
  }
}

class CalculationResults {
  constructor() {
    this.selfFinanced = [];
    this.financed = [];
    this.comparison = [];
    this.detailedData = [];
    this.inputParams = null;
    this.sensitivityResults = null;
    this.breakEvenResults = null;
  }
}

// Validation functions
function validateInvestmentParameters(params) {
  const errors = [];

  if (params.annualBudget <= 0) {
    errors.push("Annual budget must be greater than 0");
  }

  if (params.initialCost <= 0) {
    errors.push("Initial property cost must be greater than 0");
  }

  if (params.rentalRate <= 0) {
    errors.push("Rental rate must be greater than 0");
  }

  if (params.interestRate < 0) {
    errors.push("Interest rate cannot be negative");
  }

  if (params.ltvRatio < 0 || params.ltvRatio > 100) {
    errors.push("LTV ratio must be between 0 and 100");
  }

  if (params.selfPurchaseYears < 0 || params.selfPurchaseYears > 30) {
    errors.push("Self purchase years must be between 0 and 30");
  }

  if (params.financedPurchaseYears < 0 || params.financedPurchaseYears > 30) {
    errors.push("Financed purchase years must be between 0 and 30");
  }

  return {
    isValid: errors.length === 0,
    errors: errors,
  };
}

// Default parameters
function getDefaultParameters() {
  return {
    annualBudget: 170000,
    selfPurchaseYears: 5,
    initialCost: 160000,
    rentalRate: 1.0,
    interestRate: 7.0,
    ltvRatio: 70,
    loanTerm: 30,
    insurance: 1300,
    landPercent: 20,
    maintenanceRate: 1,
    costIncrease: 1,
    taxRate: 1.5,
    incomeTaxRate: 25,
    passthroughLLC: "yes",
    assessedValuePercent: 20,
    appreciationRate: 3,
    financedPurchaseYears: 5,
    maxUnitsFinanced: 2,
    maxUnitsFinancedLimitYears: 3,
    rentGrowthRate: 3,
    vacancyRate: 5,
    managementRate: 8,
    capexRate: 5,
    expenseInflation: 2.5,
    insuranceInflation: 4,
    closingCostPercent: 2,
    loanOriginationPercent: 1,
    assessedGrowthRate: 2.5,
  };
}

// Parameter presets for different scenarios
const parameterPresets = {
  conservative: {
    appreciationRate: 2,
    rentGrowthRate: 2,
    interestRate: 6.5,
    vacancyRate: 7,
    maintenanceRate: 1.2,
  },
  moderate: {
    appreciationRate: 3,
    rentGrowthRate: 3,
    interestRate: 7.0,
    vacancyRate: 5,
    maintenanceRate: 1.0,
  },
  aggressive: {
    appreciationRate: 5,
    rentGrowthRate: 4,
    interestRate: 7.5,
    vacancyRate: 3,
    maintenanceRate: 0.8,
  },
};

// Market cycle scenarios
const marketCycles = {
  recession: {
    appreciationRate: -0.05,
    rentGrowth: 0.01,
    vacancyIncrease: 0.03,
    interestRate: 8.5,
  },
  recovery: {
    appreciationRate: 0.02,
    rentGrowth: 0.025,
    vacancyIncrease: 0.01,
    interestRate: 7.0,
  },
  expansion: {
    appreciationRate: 0.06,
    rentGrowth: 0.04,
    vacancyIncrease: -0.01,
    interestRate: 6.0,
  },
};

// Export data model for use in other modules
window.dataModel = {
  InvestmentCohort,
  YearlyMetrics,
  CalculationResults,
  validateInvestmentParameters,
  getDefaultParameters,
  parameterPresets,
  marketCycles,
};
