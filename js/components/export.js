// Export Component
// Handles Excel export functionality

function downloadExcel() {
  if (!utils.calculationResults) {
    alert("Please run calculations first");
    return;
  }

  try {
    const results = utils.calculationResults;

    // Create workbook
    const wb = XLSX.utils.book_new();

    // Create comparison sheet
    const comparisonData = [];
    comparisonData.push([
      "Year",
      "Property Cost",
      "Self - New Units",
      "Self - Total Units",
      "Self - Cash Flow",
      "Self - Asset Value",
      "Financed - New Units",
      "Financed - Total Units",
      "Financed - Cash Flow",
      "Financed - Asset Value",
      "Financed - Loan Balance",
      "Financed - Net Equity",
    ]);

    for (let year = 1; year <= 15; year++) {
      const self = results.selfFinanced[year - 1];
      const financed = results.financed[year - 1];
      const propertyCost =
        results.inputParams.initialCost *
        Math.pow(1 + results.inputParams.costIncrease / 100, year - 1);

      comparisonData.push([
        year,
        propertyCost,
        self.newUnits,
        self.units,
        self.cashFlow,
        self.assetValue,
        financed.newUnits,
        financed.units,
        financed.cashFlow,
        financed.assetValue,
        financed.loanBalance,
        financed.netEquity,
      ]);
    }

    const comparisonSheet = XLSX.utils.aoa_to_sheet(comparisonData);
    XLSX.utils.book_append_sheet(wb, comparisonSheet, "Strategy Comparison");

    // Create cash flow sheet
    const cashFlowData = [];
    cashFlowData.push([
      "Year",
      "Self - Cash Flow",
      "Self - Cumulative",
      "Self - Asset Value",
      "Self - Net Worth",
      "Financed - Cash Flow",
      "Financed - Cumulative",
      "Financed - Asset Value",
      "Financed - Net Worth",
      "Cash Flow Difference",
    ]);

    let selfCumulative = 0;
    let financedCumulative = 0;

    for (let year = 1; year <= 15; year++) {
      const self = results.selfFinanced[year - 1];
      const financed = results.financed[year - 1];

      selfCumulative += self.cashFlow;
      financedCumulative += financed.cashFlow;

      cashFlowData.push([
        year,
        self.cashFlow,
        selfCumulative,
        self.assetValue,
        self.netWorth,
        financed.cashFlow,
        financedCumulative,
        financed.assetValue,
        financed.netWorth,
        financed.cashFlow - self.cashFlow,
      ]);
    }

    const cashFlowSheet = XLSX.utils.aoa_to_sheet(cashFlowData);
    XLSX.utils.book_append_sheet(wb, cashFlowSheet, "Cash Flow Analysis");

    // Create parameters sheet
    const paramsData = [];
    paramsData.push(["Parameter", "Value"]);

    Object.entries(results.inputParams).forEach(([key, value]) => {
      paramsData.push([key, value]);
    });

    const paramsSheet = XLSX.utils.aoa_to_sheet(paramsData);
    XLSX.utils.book_append_sheet(wb, paramsSheet, "Input Parameters");

    // Download the file
    const fileName = `rental_investment_analysis_${
      new Date().toISOString().split("T")[0]
    }.xlsx`;
    XLSX.writeFile(wb, fileName);

    console.log("Excel file downloaded successfully");
  } catch (error) {
    utils.handleError(error, "downloadExcel");
    alert("Error creating Excel file. Please check the console for details.");
  }
}

// Export the function
window.downloadExcel = downloadExcel;
