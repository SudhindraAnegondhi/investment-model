// Debug Bank Financed Year 0 Issue
const params = {
  annualBudget: 170000,
  initialCost: 160000,
  rentalRate: 1.0,
  interestRate: 7.0,
  ltvRatio: 70,
  loanTerm: 5,
  vacancyRate: 5,
  managementRate: 10,
  maintenanceRate: 1,
  capexRate: 5,
  taxRate: 1.5,
  landPercent: 20,
  passthroughLLC: "yes"
};

// Test for Year 0 (year = 1)
const year = 1;
const propertyCost = 160000;
const availableCash = 0; // Starting with 0 cash
const annualBudget = 170000;

// Calculate down payment per unit
const downPaymentPerUnit = propertyCost * (1 - params.ltvRatio / 100); // 30%
console.log("Down payment per unit:", downPaymentPerUnit);

// Total cash available for purchases
const totalCashForPurchases = availableCash + annualBudget;
console.log("Total cash for purchases:", totalCashForPurchases);

// Max affordable units
const maxAffordableUnits = Math.floor(totalCashForPurchases / downPaymentPerUnit);
console.log("Max affordable units:", maxAffordableUnits);

// Test cash flow for 1 unit
console.log("\n=== Testing 1 Unit Purchase ===");
const newUnits = 1;
const assetPrice = propertyCost * newUnits;
const margin = assetPrice * 0.30; // 30% down payment
const loanAmount = assetPrice * 0.70; // 70% loan

console.log("Asset price:", assetPrice);
console.log("Down payment (margin):", margin);
console.log("Loan amount:", loanAmount);

// Calculate rental income
const monthlyRentPerUnit = propertyCost * (params.rentalRate / 100);
const annualRent = monthlyRentPerUnit * 12;
console.log("Monthly rent per unit:", monthlyRentPerUnit);
console.log("Annual rent:", annualRent);

// Calculate vacancy loss
const vacancyLoss = annualRent * (params.vacancyRate / 100);
const egi = annualRent - vacancyLoss;
console.log("Vacancy loss:", vacancyLoss);
console.log("EGI:", egi);

// Calculate operating expenses
const managementExpenses = egi * (params.managementRate / 100);
const maintenanceExpenses = egi * (params.maintenanceRate / 100);
const propertyTaxes = assetPrice * (params.taxRate / 100);
const insurance = 1300; // From defaults
const totalOpex = managementExpenses + maintenanceExpenses + propertyTaxes + insurance;
console.log("Management expenses:", managementExpenses);
console.log("Maintenance expenses:", maintenanceExpenses);
console.log("Property taxes:", propertyTaxes);
console.log("Insurance:", insurance);
console.log("Total OpEx:", totalOpex);

// Calculate NOI
const noi = egi - totalOpex;
console.log("NOI:", noi);

// Calculate EMI
const monthlyRate = params.interestRate / 100 / 12;
const numPayments = params.loanTerm * 12;
const monthlyEMI = (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, numPayments)) / 
                   (Math.pow(1 + monthlyRate, numPayments) - 1);
const annualEMI = monthlyEMI * 12;
console.log("Monthly EMI:", monthlyEMI);
console.log("Annual EMI:", annualEMI);

// Total cash available = available cash + annual budget + NOI (from new units)
const totalCashAvailable = availableCash + annualBudget + noi;
console.log("Total cash available:", totalCashAvailable);

// Total outflows = down payment + EMI
const totalOutflows = margin + annualEMI;
console.log("Total outflows:", totalOutflows);

// Cash flow balance
const cashFlowBalance = totalCashAvailable - totalOutflows;
console.log("Cash flow balance:", cashFlowBalance);
console.log("Is sustainable?", cashFlowBalance >= 0);

// Additional analysis - what if we don't count NOI from new units in Year 0?
console.log("\n=== Analysis without Year 0 NOI (more conservative) ===");
const conservativeCashAvailable = availableCash + annualBudget;
const conservativeCashFlowBalance = conservativeCashAvailable - totalOutflows;
console.log("Conservative cash available:", conservativeCashAvailable);
console.log("Conservative cash flow balance:", conservativeCashFlowBalance);
console.log("Is conservative sustainable?", conservativeCashFlowBalance >= 0);