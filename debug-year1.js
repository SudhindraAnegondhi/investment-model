// Debug Year 1 Calculation to check if annual budget is properly included

console.log("🔍 Debugging Year 1 Unit Purchase Decision");

// Test parameters from the app
const params = {
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
  landPercent: 20
};

// Year 1 scenario
const year = 1;
const propertyCost = params.initialCost; // No inflation in year 1
const downPaymentPerUnit = propertyCost * (1 - params.ltvRatio / 100) * 1.03; // 30% + 3% closing costs

console.log(`\n📊 Year ${year} Analysis:`);
console.log(`Property Cost: $${propertyCost.toLocaleString()}`);
console.log(`Down Payment per Unit: $${downPaymentPerUnit.toLocaleString()}`);

// Simulate available cash (starting with 0 + annual budget)
let availableCash = 0;
if (year <= params.financedPurchaseYears) {
  availableCash += params.annualBudget;
}

console.log(`Available Cash: $${availableCash.toLocaleString()}`);

// Calculate max affordable units
const maxAffordableUnits = Math.floor(availableCash / downPaymentPerUnit);
console.log(`Max Affordable Units: ${maxAffordableUnits}`);

// Test each unit count
for (let units = 1; units <= maxAffordableUnits + 1; units++) {
  console.log(`\n=== Testing ${units} Units ===`);
  
  // Asset price
  const assetPrice = propertyCost * units;
  const margin = assetPrice * 0.30; // 30% down payment
  const loanAmount = assetPrice * 0.70;
  
  console.log(`Asset Price: $${assetPrice.toLocaleString()}`);
  console.log(`Down Payment: $${margin.toLocaleString()}`);
  console.log(`Loan Amount: $${loanAmount.toLocaleString()}`);
  
  // Check if affordable
  if (margin > availableCash) {
    console.log(`❌ Cannot afford - Down payment ($${margin.toLocaleString()}) > Available cash ($${availableCash.toLocaleString()})`);
    continue;
  }
  
  // Rental income
  const monthlyRent = propertyCost * (params.rentalRate / 100);
  const annualRent = monthlyRent * 12 * units;
  const vacancyLoss = annualRent * (params.vacancyRate / 100);
  const egi = annualRent - vacancyLoss;
  
  // Operating expenses
  const management = egi * (params.managementRate / 100);
  const maintenance = egi * (params.maintenanceRate / 100);
  const insurance = params.insurance * units;
  const propertyTax = assetPrice * (params.taxRate / 100);
  const opEx = management + maintenance + insurance + propertyTax;
  
  // NOI
  const noi = egi - opEx;
  
  // EMI calculation
  const monthlyRate = params.interestRate / 100 / 12;
  const totalPayments = params.loanTerm * 12;
  const monthlyEMI = (loanAmount * monthlyRate * Math.pow(1 + monthlyRate, totalPayments)) /
                     (Math.pow(1 + monthlyRate, totalPayments) - 1);
  const annualEMI = monthlyEMI * 12;
  
  console.log(`Annual Rent: $${annualRent.toLocaleString()}`);
  console.log(`EGI: $${egi.toLocaleString()}`);
  console.log(`Operating Expenses: $${opEx.toLocaleString()}`);
  console.log(`NOI: $${noi.toLocaleString()}`);
  console.log(`Annual EMI: $${annualEMI.toLocaleString()}`);
  
  // Cash flow analysis (following manual logic)
  const cashBalance = 0; // Starting year
  const cashBroughtIn = params.annualBudget;
  const totalCashAvailable = cashBalance + cashBroughtIn + noi;
  const totalOutflows = margin + annualEMI;
  const cashFlowBalance = totalCashAvailable - totalOutflows;
  
  console.log(`\n💰 Cash Flow Analysis:`);
  console.log(`A. Cash Balance: $${cashBalance.toLocaleString()}`);
  console.log(`B. Cash Brought In: $${cashBroughtIn.toLocaleString()}`);  
  console.log(`C. NOI: $${noi.toLocaleString()}`);
  console.log(`Total Cash Available (A+B+C): $${totalCashAvailable.toLocaleString()}`);
  console.log(`Down Payment: $${margin.toLocaleString()}`);
  console.log(`EMI: $${annualEMI.toLocaleString()}`);
  console.log(`Total Outflows: $${totalOutflows.toLocaleString()}`);
  console.log(`Cash Flow Balance: $${cashFlowBalance.toLocaleString()}`);
  
  const decision = cashFlowBalance >= 0 ? 
    (cashFlowBalance > 50000 ? "Too much cash" : "Selected") : 
    "Rejected";
  console.log(`Decision: ${decision}`);
}

console.log(`\n🎯 Expected Result: Should be able to purchase 2 units, not just 1`);