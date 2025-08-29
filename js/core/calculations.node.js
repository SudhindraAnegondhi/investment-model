// Node.js wrapper for calculations.js
const dataModel = require("./data-model");

function performCalculations(params) {
  // Inline the performCalculations logic from calculations.js
  const results = new dataModel.CalculationResults();
  results.inputParams = params;

  for (let year = 1; year <= 15; year++) {
    results.selfFinanced.push(new dataModel.YearlyMetrics());
    results.financed.push(new dataModel.YearlyMetrics());
    results.comparison.push({});
    results.detailedData.push({
      selfCumulativeCapEx: 0,
      financedCumulativeCapEx: 0,
    });
  }
  // Track cohorts for each strategy
  const financedCohorts = [];
  const financedLoans = [];
  let financedCashBalance = 0;
  for (let year = 1; year <= 15; year++) {
    const financedMetrics = results.financed[year - 1];
    const propertyCost =
      params.initialCost * Math.pow(1 + params.costIncrease / 100, year - 1);
    const annualBudget =
      year <= params.selfPurchaseYears ? params.annualBudget : 0;
    const availableFunds = financedCashBalance + annualBudget;
    const downPaymentPerUnit = propertyCost * (1 - params.ltvRatio / 100);
    const maxAffordableUnits = Math.floor(availableFunds / downPaymentPerUnit);

    // Find the maximum sustainable units by simulating cash flow for each possible purchase
    let bestUnits = 0;
    let bestCashFlow = -Infinity;
    
    // Test each unit count from 1 to maxAffordableUnits to find the maximum sustainable
    for (let units = 1; units <= maxAffordableUnits; units++) {
      // Calculate NOI for new units
      let noiNew = 0;
      if (units > 0) {
        const monthlyRent = propertyCost * (params.rentalRate / 100);
        const annualRent = monthlyRent * 12 * units;
        const vacancyLoss = annualRent * (params.vacancyRate / 100);
        const egi = annualRent - vacancyLoss;
        const management = egi * (params.managementRate / 100);
        const maintenance = egi * (params.maintenanceRate / 100);
        const insurance = params.insurance * units;
        const propertyTax = propertyCost * (params.taxRate / 100) * units;
        noiNew = egi - management - maintenance - insurance - propertyTax;
      }

      // Calculate NOI and debt service from existing properties
      let noiExisting = 0;
      let debtServiceExisting = 0;
      if (financedCohorts.length > 0) {
        financedCohorts.forEach((cohort) => {
          const yearsOwned = year - cohort.yearOriginated;
          const monthlyRent = cohort.costPerUnit * (params.rentalRate / 100);
          const annualRent = monthlyRent * 12 * cohort.units;
          const adjustedRent =
            annualRent *
            Math.pow(1 + params.rentGrowthRate / 100, Math.max(0, yearsOwned));
          const vacancyLoss = adjustedRent * (params.vacancyRate / 100);
          const egi = adjustedRent - vacancyLoss;
          const management = egi * (params.managementRate / 100);
          const maintenance = egi * (params.maintenanceRate / 100);
          const insurance = params.insurance * cohort.units;
          const propertyTax =
            cohort.costPerUnit * (params.taxRate / 100) * cohort.units;
          noiExisting +=
            egi - management - maintenance - insurance - propertyTax;
        });
        financedLoans.forEach((loan) => {
          const yearsElapsed = year - loan.yearOriginated;
          const totalPayments = loan.term * 12;
          const remainingPayments = Math.max(
            0,
            totalPayments - yearsElapsed * 12
          );
          const monthlyRate = loan.interestRate / 12;
          if (remainingPayments > 0) {
            const monthlyEMI =
              (loan.loanAmountPerUnit *
                monthlyRate *
                Math.pow(1 + monthlyRate, totalPayments)) /
              (Math.pow(1 + monthlyRate, totalPayments) - 1);
            debtServiceExisting += monthlyEMI * 12 * loan.units;
          }
        });
      }

      // Calculate debt service for new units
      let debtServiceNew = 0;
      if (units > 0) {
        const loanAmount = propertyCost * (params.ltvRatio / 100) * units;
        const monthlyRate = params.interestRate / 100 / 12;
        const totalPayments = params.loanTerm * 12;
        const monthlyEMI =
          (loanAmount *
            monthlyRate *
            Math.pow(1 + monthlyRate, totalPayments)) /
          (Math.pow(1 + monthlyRate, totalPayments) - 1);
        debtServiceNew = monthlyEMI * 12;
      }

      // Calculate cash flow balance
      const totalCashAvailable =
        financedCashBalance + annualBudget + noiNew + noiExisting;
      const totalOutflows =
        units * downPaymentPerUnit + debtServiceNew + debtServiceExisting;
      const cashFlowBalance = totalCashAvailable - totalOutflows;

      // Update best if this is sustainable and better than previous
      if (cashFlowBalance >= 0) {
        bestUnits = units;
        bestCashFlow = cashFlowBalance;
      }
    }
    // Update state for next year using bestUnits
    if (bestUnits > 0) {
      financedCohorts.push({
        yearOriginated: year,
        units: bestUnits,
        costPerUnit: propertyCost,
      });
      financedLoans.push({
        units: bestUnits,
        loanAmountPerUnit: propertyCost * (params.ltvRatio / 100),
        yearOriginated: year,
        interestRate: params.interestRate / 100,
        term: params.loanTerm,
      });
    }
    // Update cash balance and populate results
    if (bestCashFlow > -Infinity) {
      financedCashBalance = bestCashFlow;
    } else {
      // If no units can be purchased, calculate cash flow with existing properties only
      let noiExisting = 0;
      let debtServiceExisting = 0;
      if (financedCohorts.length > 0) {
        financedCohorts.forEach((cohort) => {
          const yearsOwned = year - cohort.yearOriginated;
          const monthlyRent = cohort.costPerUnit * (params.rentalRate / 100);
          const annualRent = monthlyRent * 12 * cohort.units;
          const adjustedRent =
            annualRent *
            Math.pow(1 + params.rentGrowthRate / 100, Math.max(0, yearsOwned));
          const vacancyLoss = adjustedRent * (params.vacancyRate / 100);
          const egi = adjustedRent - vacancyLoss;
          const management = egi * (params.managementRate / 100);
          const maintenance = egi * (params.maintenanceRate / 100);
          const insurance = params.insurance * cohort.units;
          const propertyTax =
            cohort.costPerUnit * (params.taxRate / 100) * cohort.units;
          noiExisting +=
            egi - management - maintenance - insurance - propertyTax;
        });
        financedLoans.forEach((loan) => {
          const yearsElapsed = year - loan.yearOriginated;
          const totalPayments = loan.term * 12;
          const remainingPayments = Math.max(
            0,
            totalPayments - yearsElapsed * 12
          );
          const monthlyRate = loan.interestRate / 12;
          if (remainingPayments > 0) {
            const monthlyEMI =
              (loan.loanAmountPerUnit *
                monthlyRate *
                Math.pow(1 + monthlyRate, totalPayments)) /
              (Math.pow(1 + monthlyRate, totalPayments) - 1);
            debtServiceExisting += monthlyEMI * 12 * loan.units;
          }
        });
      }
      financedCashBalance = financedCashBalance + annualBudget + noiExisting - debtServiceExisting;
    }

    // Populate results for this year
    results.financed[year - 1].units = financedCohorts.reduce((total, c) => total + c.units, 0);
    results.financed[year - 1].cashFlow = financedCashBalance;
    results.financed[year - 1].newUnits = bestUnits;
  }
  return results;
}

module.exports = { performCalculations };
