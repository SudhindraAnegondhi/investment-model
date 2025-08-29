// Debug Year 2 calculation
const testParams = {
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

console.log("=== YEAR 2 MANUAL CALCULATION ===");

// Starting state after Year 1
const startingCash = 31592; // From Year 1 calculation
const year = 2;
const propertyCost = 160000 * Math.pow(1 + testParams.costIncrease / 100, year - 1);
const units = 4; // New units to purchase

console.log(`Starting cash: $${startingCash}`);
console.log(`Property cost in Year 2: $${propertyCost}`);
console.log(`Units to purchase: ${units}`);

// Existing cohort from Year 1
const existingCohorts = [{
  yearOriginated: 1,
  units: 3,
  costPerUnit: 160000,
}];

const existingLoans = [{
  units: 3,
  loanAmountPerUnit: 160000 * 0.7,
  yearOriginated: 1,
  interestRate: 0.07,
  term: 5,
}];

// Calculate existing NOI for Year 2
console.log("\n--- Existing Properties NOI ---");
const yearsOwned = year - 1; // 1 year owned
const monthlyRent = 160000 * (testParams.rentalRate / 100);
const annualRent = monthlyRent * 12 * 3; // 3 units from Year 1
const adjustedRent = annualRent * Math.pow(1 + testParams.rentGrowthRate / 100, yearsOwned);
console.log(`Base annual rent: $${annualRent}`);
console.log(`Adjusted rent (${yearsOwned} years): $${adjustedRent}`);

const vacancyLoss = adjustedRent * (testParams.vacancyRate / 100);
const egi = adjustedRent - vacancyLoss;
const management = egi * (testParams.managementRate / 100);
const maintenance = egi * (testParams.maintenanceRate / 100);
const insurance = testParams.insurance * 3;
const propertyTax = 160000 * (testParams.taxRate / 100) * 3;
const existingNOI = egi - management - maintenance - insurance - propertyTax;

console.log(`EGI: $${egi}`);
console.log(`Operating expenses: $${management + maintenance + insurance + propertyTax}`);
console.log(`Existing NOI: $${existingNOI}`);

// Calculate existing debt service
console.log("\n--- Existing Debt Service ---");
const loanAmount = 160000 * 0.7 * 3;
const monthlyRate = testParams.interestRate / 100 / 12;
const totalPayments = testParams.loanTerm * 12;
const monthlyEMI = (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, totalPayments)) / (Math.pow(1 + monthlyRate, totalPayments) - 1);
const existingDebtService = monthlyEMI * 12;

console.log(`Loan amount: $${loanAmount}`);
console.log(`Monthly EMI: $${monthlyEMI}`);
console.log(`Existing debt service: $${existingDebtService}`);

// Calculate new units NOI
console.log("\n--- New Units NOI ---");
const newMonthlyRent = propertyCost * (testParams.rentalRate / 100);
const newAnnualRent = newMonthlyRent * 12 * units;
const newVacancyLoss = newAnnualRent * (testParams.vacancyRate / 100);
const newEgi = newAnnualRent - newVacancyLoss;
const newManagement = newEgi * (testParams.managementRate / 100);
const newMaintenance = newEgi * (testParams.maintenanceRate / 100);
const newInsurance = testParams.insurance * units;
const newPropertyTax = propertyCost * (testParams.taxRate / 100) * units;
const newNOI = newEgi - newManagement - newMaintenance - newInsurance - newPropertyTax;

console.log(`New annual rent: $${newAnnualRent}`);
console.log(`New EGI: $${newEgi}`);
console.log(`New operating expenses: $${newManagement + newMaintenance + newInsurance + newPropertyTax}`);
console.log(`New NOI: $${newNOI}`);

// Calculate new debt service
console.log("\n--- New Debt Service ---");
const newLoanAmount = propertyCost * 0.7 * units;
const newMonthlyEMI = (newLoanAmount * monthlyRate * Math.pow(1 + monthlyRate, totalPayments)) / (Math.pow(1 + monthlyRate, totalPayments) - 1);
const newDebtService = newMonthlyEMI * 12;

console.log(`New loan amount: $${newLoanAmount}`);
console.log(`New monthly EMI: $${newMonthlyEMI}`);
console.log(`New debt service: $${newDebtService}`);

// Final calculation
console.log("\n--- Final Cash Flow ---");
const annualBudget = testParams.annualBudget; // Year 2 is within selfPurchaseYears
const downPayment = propertyCost * (1 - testParams.ltvRatio / 100) * units;
const totalCashAvailable = startingCash + annualBudget + existingNOI + newNOI;
const totalOutflows = downPayment + existingDebtService + newDebtService;
const finalCashBalance = totalCashAvailable - totalOutflows;

console.log(`Starting cash: $${startingCash}`);
console.log(`Annual budget: $${annualBudget}`);
console.log(`Existing NOI: $${existingNOI}`);
console.log(`New NOI: $${newNOI}`);
console.log(`Total cash available: $${totalCashAvailable}`);
console.log(`Down payment: $${downPayment}`);
console.log(`Existing debt service: $${existingDebtService}`);
console.log(`New debt service: $${newDebtService}`);
console.log(`Total outflows: $${totalOutflows}`);
console.log(`Final cash balance: $${finalCashBalance}`);