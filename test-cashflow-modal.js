// Simple test to verify cash flow modal data
console.log("🧪 Testing Cash Flow Modal Data");

// Mock the required objects
const utils = {
  formatCurrency: function(value) {
    return '$' + (value || 0).toLocaleString('en-US', { 
      minimumFractionDigits: 0, 
      maximumFractionDigits: 0 
    });
  }
};

// Mock calculation results data
const mockResults = {
  inputParams: {
    annualBudget: 170000,
    initialCost: 160000,
    financedPurchaseYears: 5,
    selfPurchaseYears: 5,
    ltvRatio: 70,
    costIncrease: 1
  },
  financed: [{
    // Year 1 data
    units: 2,
    newUnits: 2,
    gpr: 38400,
    egi: 36480,
    noi: 25797,
    debtService: 53226,
    interestExpense: 15680,
    capex: 1824,
    taxes: 0,
    cashFlow: 46571,
    cumulativeCashFlow: 46571
  }],
  detailedData: [{}]
};

// Test the cash flow calculation logic
function testCashFlowCalculation(year, index, data, results, strategy) {
  console.log(`\n=== Testing Year ${year} - ${strategy} ===`);
  
  const isFinanced = strategy === "financed";
  const currentYearBudget = year <= (isFinanced ? results.inputParams.financedPurchaseYears : results.inputParams.selfPurchaseYears) ? results.inputParams.annualBudget : 0;
  
  // Simplified cash flow calculation with fallbacks
  const annualBudget = currentYearBudget || 0;
  const rentalIncome = data.egi || 0;
  const operatingExpenses = (data.egi || 0) - (data.noi || 0);
  const interestPaid = data.interestExpense || 0;
  const principalPayments = Math.max(0, (data.debtService || 0) - (data.interestExpense || 0));
  const capexOutflows = data.capex || 0;
  const taxes = data.taxes || 0;
  
  // Simple property acquisition calculation
  const costPerUnit = (results.inputParams?.initialCost || 160000) * Math.pow(1 + ((results.inputParams?.costIncrease || 1) / 100), year - 1);
  const downPaymentPercent = isFinanced ? (1 - (results.inputParams?.ltvRatio || 70) / 100) : 1.0;
  const acquisitionCostPerUnit = costPerUnit * downPaymentPercent;
  const downPaymentOutflows = (data.newUnits || 0) * acquisitionCostPerUnit;
  
  // Calculate opening cash (simplified)
  const openingCash = index === 0 ? 0 : Math.max(0, data.cumulativeCashFlow || 0) - (data.cashFlow || 0);
  
  // Calculate totals
  const totalInflows = annualBudget + rentalIncome;
  const totalOutflows = operatingExpenses + interestPaid + principalPayments + capexOutflows + taxes + downPaymentOutflows;
  const netCashFlow = totalInflows - totalOutflows;
  const closingCash = Math.max(0, openingCash + netCashFlow);
  
  console.log("💰 Calculated Cash Flow:");
  console.log(`  Annual Budget: ${utils.formatCurrency(annualBudget)}`);
  console.log(`  Rental Income: ${utils.formatCurrency(rentalIncome)}`);
  console.log(`  Total Inflows: ${utils.formatCurrency(totalInflows)}`);
  console.log(`  Operating Expenses: ${utils.formatCurrency(operatingExpenses)}`);
  console.log(`  Interest Paid: ${utils.formatCurrency(interestPaid)}`);
  console.log(`  Principal Payments: ${utils.formatCurrency(principalPayments)}`);
  console.log(`  CapEx: ${utils.formatCurrency(capexOutflows)}`);
  console.log(`  Taxes: ${utils.formatCurrency(taxes)}`);
  console.log(`  Property Acquisitions: ${utils.formatCurrency(downPaymentOutflows)}`);
  console.log(`  Total Outflows: ${utils.formatCurrency(totalOutflows)}`);
  console.log(`  Net Cash Flow: ${utils.formatCurrency(netCashFlow)}`);
  console.log(`  Opening Cash: ${utils.formatCurrency(openingCash)}`);
  console.log(`  Closing Cash: ${utils.formatCurrency(closingCash)}`);
}

// Test with our mock data
testCashFlowCalculation(1, 0, mockResults.financed[0], mockResults, "financed");

console.log("\n✅ Cash flow calculation test completed!");
console.log("🎯 Check the browser console when opening the modal to see debug output");