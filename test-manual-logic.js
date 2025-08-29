// Test script to verify the manual calculation logic
console.log("🧪 Testing Manual Cash Flow Logic");

// Mock parameters matching your PDF example
const testParams = {
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
  passthroughLLC: "yes"
};

// Test function that mimics your manual calculation
function testManualLogic(units, availableCash, annualBudget) {
  console.log(`\n=== Testing ${units} Units ===`);
  
  // A. Cash Balance
  const cashBalance = availableCash;
  console.log(`A. Cash Balance: $${cashBalance.toLocaleString()}`);
  
  // B. Cash brought in
  const cashBroughtIn = annualBudget;
  console.log(`B. Cash Brought In: $${cashBroughtIn.toLocaleString()}`);
  
  // Asset Price
  const assetPrice = testParams.initialCost * units;
  console.log(`Asset Price: $${assetPrice.toLocaleString()}`);
  
  // Margin (30%)
  const margin = assetPrice * 0.30;
  console.log(`Margin (30%): $${margin.toLocaleString()}`);
  
  // Loan
  const loan = assetPrice * 0.70;
  console.log(`Loan: $${loan.toLocaleString()}`);
  
  // Rental Income
  const rentalIncome = units * testParams.initialCost * (testParams.rentalRate / 100) * 12;
  console.log(`Rental Income: $${rentalIncome.toLocaleString()}`);
  
  // Vacancy Loss
  const vacancyLoss = rentalIncome * (testParams.vacancyRate / 100);
  console.log(`Vacancy Loss: $${vacancyLoss.toLocaleString()}`);
  
  // EGI
  const egi = rentalIncome - vacancyLoss;
  console.log(`EGI: $${egi.toLocaleString()}`);
  
  // Operating Expenses
  const managementExpenses = egi * (testParams.managementRate / 100);
  const maintenanceExpenses = egi * (testParams.maintenanceRate / 100);
  const insurance = testParams.insurance * units;
  const opEx = managementExpenses + maintenanceExpenses + insurance;
  
  console.log(`Property Management: $${managementExpenses.toLocaleString()}`);
  console.log(`Maintenance: $${maintenanceExpenses.toLocaleString()}`);
  console.log(`Insurance: $${insurance.toLocaleString()}`);
  console.log(`Total OpEx: $${opEx.toLocaleString()}`);
  
  // NOI
  const noi = egi - opEx;
  console.log(`C. Net Operating Income: $${noi.toLocaleString()}`);
  
  // Total Cash Available
  const totalCashAvailable = cashBalance + cashBroughtIn + noi;
  console.log(`Total Cash Available (A+B+C): $${totalCashAvailable.toLocaleString()}`);
  
  // Bank EMI
  const monthlyRate = testParams.interestRate / 100 / 12;
  const totalPayments = testParams.loanTerm * 12;
  const monthlyEMI = (loan * monthlyRate * Math.pow(1 + monthlyRate, totalPayments)) /
                     (Math.pow(1 + monthlyRate, totalPayments) - 1);
  const bankEMI = monthlyEMI * 12;
  
  console.log(`Bank EMI: $${bankEMI.toLocaleString()}`);
  
  // Total Outflows
  const totalOutflows = margin + bankEMI;
  console.log(`Total Outflows: $${totalOutflows.toLocaleString()}`);
  
  // Cash Flow Balance
  const cashFlowBalance = totalCashAvailable - totalOutflows;
  console.log(`Cash Flow Balance: $${cashFlowBalance.toLocaleString()}`);
  
  // Decision
  const decision = cashFlowBalance >= 0 ? 
    (cashFlowBalance > 100000 ? "Too much cash" : "Selected") : 
    "Rejected";
  console.log(`Decision: ${decision}`);
  
  return { units, cashFlowBalance, decision };
}

// Test all scenarios like in your PDF
console.log("🔍 Replicating your manual calculations:");

const results = [
  testManualLogic(1, 0, 170000),
  testManualLogic(2, 0, 170000),
  testManualLogic(3, 0, 170000)
];

console.log("\n📊 Summary:");
results.forEach(result => {
  console.log(`${result.units} Units: $${result.cashFlowBalance.toLocaleString()} - ${result.decision}`);
});