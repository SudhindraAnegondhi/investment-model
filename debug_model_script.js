// Script to generate 15-year summary using model's core modules
const { performCalculations } = require("./js/core/calculations.node");

// Use the same parameters as testParams
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
