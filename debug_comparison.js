// Debug comparison to find exact differences
const { performCalculations } = require("./js/core/calculations.node");

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

// Manual calculation for Year 1, 3 units to match debug_unit_purchase.js logic
console.log("=== MANUAL YEAR 1 CALCULATION (3 units) ===");

const propertyCost = 160000;
const units = 3;

// NOI calculation
const monthlyRent = propertyCost * (params.rentalRate / 100);
const annualRent = monthlyRent * 12 * units;
const vacancyLoss = annualRent * (params.vacancyRate / 100);
const egi = annualRent - vacancyLoss;
const management = egi * (params.managementRate / 100);
const maintenance = egi * (params.maintenanceRate / 100);
const insurance = params.insurance * units;
const propertyTax = propertyCost * (params.taxRate / 100) * units;
const noi = egi - management - maintenance - insurance - propertyTax;

console.log(`Monthly rent per unit: $${monthlyRent}`);
console.log(`Annual rent: $${annualRent}`);
console.log(`Vacancy loss: $${vacancyLoss}`);
console.log(`EGI: $${egi}`);
console.log(`Management: $${management}`);
console.log(`Maintenance: $${maintenance}`);
console.log(`Insurance: $${insurance}`);
console.log(`Property tax: $${propertyTax}`);
console.log(`NOI: $${noi}`);

// Debt service calculation
const loanAmount = propertyCost * (params.ltvRatio / 100) * units;
const downPayment = propertyCost * (1 - params.ltvRatio / 100) * units;
const monthlyRate = params.interestRate / 100 / 12;
const totalPayments = params.loanTerm * 12;
const monthlyEMI = (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, totalPayments)) / (Math.pow(1 + monthlyRate, totalPayments) - 1);
const debtService = monthlyEMI * 12;

console.log(`Loan amount: $${loanAmount}`);
console.log(`Down payment: $${downPayment}`);
console.log(`Monthly EMI: $${monthlyEMI}`);
console.log(`Annual debt service: $${debtService}`);

// Cash flow
const cashBalance = 0; // Starting cash
const annualBudget = params.annualBudget;
const totalCashAvailable = cashBalance + annualBudget + noi;
const totalOutflows = downPayment + debtService;
const cashFlowBalance = totalCashAvailable - totalOutflows;

console.log(`\nCash flow summary:`);
console.log(`Starting cash: $${cashBalance}`);
console.log(`Annual budget: $${annualBudget}`);
console.log(`NOI: $${noi}`);
console.log(`Total cash available: $${totalCashAvailable}`);
console.log(`Down payment: $${downPayment}`);
console.log(`Debt service: $${debtService}`);
console.log(`Total outflows: $${totalOutflows}`);
console.log(`Cash flow balance: $${cashFlowBalance}`);

console.log("\n=== MODEL CALCULATION ===");
const results = performCalculations(params);
console.log(`Year 1 - Units: ${results.financed[0].units}, New Units: ${results.financed[0].newUnits}, Cash Flow: $${Math.round(results.financed[0].cashFlow)}`);