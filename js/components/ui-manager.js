// UI Manager Component
// Handles all UI updates, modal interactions, and table population

// Make functions globally available
window.uiManager = {
  updateAllTables: updateAllTables,
  updateComparisonTable: updateComparisonTable,
  updateCashFlowTable: updateCashFlowTable,
};

// Global variables for modal state
let currentModalStrategy = "self";

// Update all tables and UI components
function updateAllTables() {
  if (!utils.calculationResults) return;

  updateComparisonTable();
  updateCashFlowTable();
  // Call balance sheet module's updateSummary function
  console.log("🔄 About to call balance sheet updateSummary...");
  if (window.balanceSheet && window.balanceSheet.updateSummary) {
    console.log("✅ Calling window.balanceSheet.updateSummary()");
    window.balanceSheet.updateSummary();
    console.log("✅ Balance sheet updateSummary completed");
  } else {
    console.error(
      "❌ Balance sheet module not loaded or updateSummary function not available"
    );
    console.log("window.balanceSheet:", window.balanceSheet);
  }
  // Completely disable analysis updates to prevent infinite calculation loops
  // These functions are causing repeated calls to performCalculations
  console.log("⚠️ Analysis functions disabled to prevent infinite loops");
  
  // TODO: Re-enable these after fixing the infinite loop issue in analysis modules
  // - updateROIAnalysis();
  // - updateSensitivityAnalysis(); 
  // - updateBreakEvenAnalysis();
}

// Update the main comparison table
function updateComparisonTable() {
  const tbody = document.getElementById("comparisonBody");
  if (!tbody || !utils.calculationResults) return;

  tbody.innerHTML = "";
  const results = utils.calculationResults;

  for (let year = 1; year <= 15; year++) {
    const comparison = results.comparison[year - 1];

    // Get closing cash from centralized data instead of cash flow
    const selfData = calculations.getYearlyStrategyData(results, year, "self");
    const financedData = calculations.getYearlyStrategyData(
      results,
      year,
      "financed"
    );

    const selfClosingCash = selfData ? selfData.closingCash : 0;
    const financedClosingCash = financedData ? financedData.closingCash : 0;

    const tr = document.createElement("tr");

    // Create cells with individual click handlers
    const yearCell = document.createElement("td");
    yearCell.textContent = year;
    yearCell.onclick = () => showYearModal(year, year - 1, "self"); // Default to self for year column
    yearCell.style.cursor = "pointer";

    const costCell = document.createElement("td");
    costCell.textContent = utils.formatCurrency(comparison.propertyCost);
    costCell.onclick = () => showYearModal(year, year - 1, "self"); // Cost applies to both, default to self
    costCell.style.cursor = "pointer";

    // Self-financed columns
    const selfNewUnitsCell = document.createElement("td");
    selfNewUnitsCell.textContent = comparison.selfNewUnits;
    selfNewUnitsCell.onclick = () => showYearModal(year, year - 1, "self");
    selfNewUnitsCell.style.cursor = "pointer";

    const selfTotalUnitsCell = document.createElement("td");
    selfTotalUnitsCell.textContent = comparison.selfTotalUnits;
    selfTotalUnitsCell.onclick = () => showYearModal(year, year - 1, "self");
    selfTotalUnitsCell.style.cursor = "pointer";

    const selfClosingCashCell = document.createElement("td");
    selfClosingCashCell.className =
      selfClosingCash >= 0 ? "positive" : "negative";
    selfClosingCashCell.textContent = utils.formatCurrency(selfClosingCash);
    selfClosingCashCell.onclick = () => showYearModal(year, year - 1, "self");
    selfClosingCashCell.style.cursor = "pointer";

    const selfAssetValueCell = document.createElement("td");
    selfAssetValueCell.textContent = utils.formatCurrency(
      comparison.selfAssetValue
    );
    selfAssetValueCell.onclick = () => showYearModal(year, year - 1, "self");
    selfAssetValueCell.style.cursor = "pointer";

    // Bank-financed columns
    const financedNewUnitsCell = document.createElement("td");
    financedNewUnitsCell.textContent = comparison.financedNewUnits;
    financedNewUnitsCell.onclick = () =>
      showYearModal(year, year - 1, "financed");
    financedNewUnitsCell.style.cursor = "pointer";

    const financedTotalUnitsCell = document.createElement("td");
    financedTotalUnitsCell.textContent = comparison.financedTotalUnits;
    financedTotalUnitsCell.onclick = () =>
      showYearModal(year, year - 1, "financed");
    financedTotalUnitsCell.style.cursor = "pointer";

    const financedClosingCashCell = document.createElement("td");
    financedClosingCashCell.className =
      financedClosingCash >= 0 ? "positive" : "negative";
    financedClosingCashCell.textContent =
      utils.formatCurrency(financedClosingCash);
    financedClosingCashCell.onclick = () =>
      showYearModal(year, year - 1, "financed");
    financedClosingCashCell.style.cursor = "pointer";

    const financedAssetValueCell = document.createElement("td");
    financedAssetValueCell.textContent = utils.formatCurrency(
      comparison.financedAssetValue
    );
    financedAssetValueCell.onclick = () =>
      showYearModal(year, year - 1, "financed");
    financedAssetValueCell.style.cursor = "pointer";

    const loanBalanceCell = document.createElement("td");
    loanBalanceCell.textContent = utils.formatCurrency(comparison.loanBalance);
    loanBalanceCell.onclick = () => showYearModal(year, year - 1, "financed");
    loanBalanceCell.style.cursor = "pointer";

    const netEquityCell = document.createElement("td");
    netEquityCell.textContent = utils.formatCurrency(comparison.netEquity);
    netEquityCell.onclick = () => showYearModal(year, year - 1, "financed");
    netEquityCell.style.cursor = "pointer";

    // Append all cells to the row
    tr.appendChild(yearCell);
    tr.appendChild(costCell);
    tr.appendChild(selfNewUnitsCell);
    tr.appendChild(selfTotalUnitsCell);
    tr.appendChild(selfClosingCashCell);
    tr.appendChild(selfAssetValueCell);
    tr.appendChild(financedNewUnitsCell);
    tr.appendChild(financedTotalUnitsCell);
    tr.appendChild(financedClosingCashCell);
    tr.appendChild(financedAssetValueCell);
    tr.appendChild(loanBalanceCell);
    tr.appendChild(netEquityCell);

    tbody.appendChild(tr);
  }
}

// Calculate detailed cash flow components ensuring perfect continuity
function calculateYearlyCashFlowBreakdownWithContinuity(
  year,
  index,
  strategy,
  results,
  previousClosingCash
) {
  const data =
    strategy === "self" ? results.selfFinanced[index] : results.financed[index];
  const detailedData = results.detailedData[index];
  const params = results.inputParams;

  // Opening cash = previous year's closing cash (ensures perfect continuity)
  const openingCash = previousClosingCash;

  // Annual budget (only during investment years)
  const annualBudget =
    year <= params.selfPurchaseYears ? params.annualBudget : 0;

  // Rental income (EGI)
  const rentalIncome = data.egi || 0;

  // Total inflows
  const totalInflows = annualBudget + rentalIncome;

  // Calculate outflows
  let operatingExpenses = 0;
  let debtService = 0;
  let capexOutflows = 0;
  let taxes = 0;
  let propertyAcquisitions = 0;

  if (strategy === "self") {
    operatingExpenses = (data.gpr || 0) - (data.egi || 0); // Vacancy + OpEx
    capexOutflows = data.capex || 0;
    taxes = data.taxes || 0;
    // Property acquisitions = new units * cost
    propertyAcquisitions =
      (data.newUnits || 0) *
      (params.initialCost * Math.pow(1 + params.costIncrease / 100, year - 1)) *
      1.02;
  } else {
    operatingExpenses = (data.gpr || 0) - (data.egi || 0); // Vacancy + OpEx
    debtService = data.debtService || 0;
    capexOutflows = data.capex || 0;
    taxes = data.taxes || 0;
    // Down payments for new units
    const costPerUnit =
      params.initialCost * Math.pow(1 + params.costIncrease / 100, year - 1);
    const downPaymentPercent = (100 - params.ltvRatio) / 100;
    propertyAcquisitions =
      (data.newUnits || 0) * costPerUnit * downPaymentPercent * 1.03;
  }

  const totalOutflows =
    operatingExpenses +
    debtService +
    capexOutflows +
    taxes +
    propertyAcquisitions;
  const netCashFlow = totalInflows - totalOutflows;

  // Closing cash = opening cash + net cash flow (allow negative balances)
  const closingCash = openingCash + netCashFlow;

  return {
    openingCash,
    totalInflows,
    totalOutflows,
    netCashFlow,
    closingCash,
    annualBudget,
    rentalIncome,
    operatingExpenses,
    debtService,
    capexOutflows,
    taxes,
    propertyAcquisitions,
  };
}

// Calculate detailed cash flow components for a specific year and strategy (legacy - for debugging)
function calculateYearlyCashFlowBreakdown(year, index, strategy, results) {
  const data =
    strategy === "self" ? results.selfFinanced[index] : results.financed[index];
  const detailedData = results.detailedData[index];
  const params = results.inputParams;

  // Opening cash - from previous year's actual available cash balance
  let openingCash = 0;
  if (index > 0) {
    const prevDetailedData = results.detailedData[index - 1];
    openingCash =
      strategy === "self"
        ? prevDetailedData.selfAvailableCash || 0
        : prevDetailedData.financedAvailableCash || 0;
  }

  // Annual budget (only during investment years)
  const annualBudget =
    year <= params.selfPurchaseYears ? params.annualBudget : 0;

  // Rental income (EGI)
  const rentalIncome = data.egi || 0;

  // Total inflows
  const totalInflows = annualBudget + rentalIncome;

  // Calculate outflows
  let operatingExpenses = 0;
  let debtService = 0;
  let capexOutflows = 0;
  let taxes = 0;
  let propertyAcquisitions = 0;

  if (strategy === "self") {
    operatingExpenses = (data.gpr || 0) - (data.egi || 0); // Vacancy + OpEx
    capexOutflows = data.capex || 0;
    taxes = data.taxes || 0;
    // Property acquisitions = new units * cost
    propertyAcquisitions =
      (data.newUnits || 0) *
      (params.initialCost * Math.pow(1 + params.costIncrease / 100, year - 1)) *
      1.02;
  } else {
    operatingExpenses = (data.gpr || 0) - (data.egi || 0); // Vacancy + OpEx
    debtService = data.debtService || 0;
    capexOutflows = data.capex || 0;
    taxes = data.taxes || 0;
    // Down payments for new units
    const costPerUnit =
      params.initialCost * Math.pow(1 + params.costIncrease / 100, year - 1);
    const downPaymentPercent = (100 - params.ltvRatio) / 100;
    propertyAcquisitions =
      (data.newUnits || 0) * costPerUnit * downPaymentPercent * 1.03;
  }

  const totalOutflows =
    operatingExpenses +
    debtService +
    capexOutflows +
    taxes +
    propertyAcquisitions;
  const netCashFlow = totalInflows - totalOutflows;

  // Closing cash should be the actual available cash balance after all transactions
  const currentDetailedData = results.detailedData[index];
  const closingCash =
    strategy === "self"
      ? currentDetailedData.selfAvailableCash || 0
      : currentDetailedData.financedAvailableCash || 0;

  return {
    openingCash,
    totalInflows,
    totalOutflows,
    netCashFlow,
    closingCash,
    annualBudget,
    rentalIncome,
    operatingExpenses,
    debtService,
    capexOutflows,
    taxes,
    propertyAcquisitions,
  };
}

// Update the cash flow table with detailed breakdown - ensuring perfect continuity
function updateCashFlowTable() {
  const tbody = document.getElementById("cashflowBody");
  if (!tbody || !utils.calculationResults) return;

  tbody.innerHTML = "";
  const results = utils.calculationResults;

  // Track running cash balances to ensure continuity
  let selfRunningCash = 0;
  let financedRunningCash = 0;

  for (let year = 1; year <= 15; year++) {
    const index = year - 1;

    // Calculate detailed breakdown for both strategies
    const selfBreakdown = calculateYearlyCashFlowBreakdownWithContinuity(
      year,
      index,
      "self",
      results,
      selfRunningCash
    );
    const financedBreakdown = calculateYearlyCashFlowBreakdownWithContinuity(
      year,
      index,
      "financed",
      results,
      financedRunningCash
    );

    // Update running balances for next iteration
    selfRunningCash = selfBreakdown.closingCash;
    financedRunningCash = financedBreakdown.closingCash;

    // Get loan balances for financed strategy
    const financedData = results.financed[index];
    const openingLoan =
      index > 0 ? results.financed[index - 1].loanBalance || 0 : 0;
    const closingLoan = financedData.loanBalance || 0;

    const tr = document.createElement("tr");

    // Year column
    const yearCol = document.createElement("td");
    yearCol.innerHTML = `<strong>${year}</strong>`;
    yearCol.onclick = () => showYearModal(year, index, "self"); // Default to self for year column
    yearCol.style.cursor = "pointer";

    // Self Financed columns
    const selfOpeningCash = document.createElement("td");
    selfOpeningCash.className =
      selfBreakdown.openingCash >= 0 ? "positive" : "negative";
    selfOpeningCash.textContent = utils.formatCurrency(
      selfBreakdown.openingCash
    );
    selfOpeningCash.onclick = () => showYearModal(year, index, "self");
    selfOpeningCash.style.cursor = "pointer";

    const selfTotalInflows = document.createElement("td");
    selfTotalInflows.className = "positive";
    selfTotalInflows.textContent = utils.formatCurrency(
      selfBreakdown.totalInflows
    );
    selfTotalInflows.onclick = () => showYearModal(year, index, "self");
    selfTotalInflows.style.cursor = "pointer";

    const selfTotalOutflows = document.createElement("td");
    selfTotalOutflows.className = "negative";
    selfTotalOutflows.textContent = utils.formatCurrency(
      selfBreakdown.totalOutflows
    );
    selfTotalOutflows.onclick = () => showYearModal(year, index, "self");
    selfTotalOutflows.style.cursor = "pointer";

    const selfNetCashFlow = document.createElement("td");
    selfNetCashFlow.className =
      selfBreakdown.netCashFlow >= 0 ? "positive" : "negative";
    selfNetCashFlow.textContent = utils.formatCurrency(
      selfBreakdown.netCashFlow
    );
    selfNetCashFlow.onclick = () => showYearModal(year, index, "self");
    selfNetCashFlow.style.cursor = "pointer";

    const selfClosingCashCol = document.createElement("td");
    selfClosingCashCol.className =
      selfBreakdown.closingCash >= 0 ? "positive" : "negative";
    selfClosingCashCol.textContent = utils.formatCurrency(
      selfBreakdown.closingCash
    );
    selfClosingCashCol.onclick = () => showYearModal(year, index, "self");
    selfClosingCashCol.style.cursor = "pointer";

    // Bank Financed columns
    const financedOpeningCash = document.createElement("td");
    financedOpeningCash.className =
      financedBreakdown.openingCash >= 0 ? "positive" : "negative";
    financedOpeningCash.textContent = utils.formatCurrency(
      financedBreakdown.openingCash
    );
    financedOpeningCash.onclick = () => showYearModal(year, index, "financed");
    financedOpeningCash.style.cursor = "pointer";

    const financedTotalInflows = document.createElement("td");
    financedTotalInflows.className = "positive";
    financedTotalInflows.textContent = utils.formatCurrency(
      financedBreakdown.totalInflows
    );
    financedTotalInflows.onclick = () => showYearModal(year, index, "financed");
    financedTotalInflows.style.cursor = "pointer";

    const financedTotalOutflows = document.createElement("td");
    financedTotalOutflows.className = "negative";
    financedTotalOutflows.textContent = utils.formatCurrency(
      financedBreakdown.totalOutflows
    );
    financedTotalOutflows.onclick = () =>
      showYearModal(year, index, "financed");
    financedTotalOutflows.style.cursor = "pointer";

    const financedNetCashFlow = document.createElement("td");
    financedNetCashFlow.className =
      financedBreakdown.netCashFlow >= 0 ? "positive" : "negative";
    financedNetCashFlow.textContent = utils.formatCurrency(
      financedBreakdown.netCashFlow
    );
    financedNetCashFlow.onclick = () => showYearModal(year, index, "financed");
    financedNetCashFlow.style.cursor = "pointer";

    const financedClosingCashCol = document.createElement("td");
    financedClosingCashCol.className =
      financedBreakdown.closingCash >= 0 ? "positive" : "negative";
    financedClosingCashCol.textContent = utils.formatCurrency(
      financedBreakdown.closingCash
    );
    financedClosingCashCol.onclick = () =>
      showYearModal(year, index, "financed");
    financedClosingCashCol.style.cursor = "pointer";

    const openingLoanCol = document.createElement("td");
    openingLoanCol.className = "negative";
    openingLoanCol.textContent = utils.formatCurrency(openingLoan);
    openingLoanCol.onclick = () => showYearModal(year, index, "financed");
    openingLoanCol.style.cursor = "pointer";

    const closingLoanCol = document.createElement("td");
    closingLoanCol.className = "negative";
    closingLoanCol.textContent = utils.formatCurrency(closingLoan);
    closingLoanCol.onclick = () => showYearModal(year, index, "financed");
    closingLoanCol.style.cursor = "pointer";

    // Append all cells to the row
    tr.appendChild(yearCol);
    tr.appendChild(selfOpeningCash);
    tr.appendChild(selfTotalInflows);
    tr.appendChild(selfTotalOutflows);
    tr.appendChild(selfNetCashFlow);
    tr.appendChild(selfClosingCashCol);
    tr.appendChild(financedOpeningCash);
    tr.appendChild(financedTotalInflows);
    tr.appendChild(financedTotalOutflows);
    tr.appendChild(financedNetCashFlow);
    tr.appendChild(financedClosingCashCol);
    tr.appendChild(openingLoanCol);
    tr.appendChild(closingLoanCol);

    tbody.appendChild(tr);
  }
}

// Show year detail modal
function showYearModal(year, index, strategy = "self") {
  utils.currentModalYear = year;
  utils.currentModalIndex = index;
  currentModalStrategy = strategy; // Set strategy based on clicked column group

  document.getElementById("modalYear").textContent = year;
  const modal = document.getElementById("yearModal");

  // Debug logging
  console.log("Opening modal for year:", year);
  console.log("Modal element:", modal);

  modal.classList.add("show");

  // Debug: Check computed styles
  const computedStyle = window.getComputedStyle(modal);
  console.log("Modal display:", computedStyle.display);
  console.log("Modal position:", computedStyle.position);
  console.log("Modal width:", computedStyle.width);
  console.log("Modal height:", computedStyle.height);

  // Set initial dropdown values and subtitle based on strategy
  document.getElementById("strategySelect").value = strategy;
  document.getElementById("statementSelect").value = "pl";
  const strategyText = strategy === "self" ? "Self-Financed" : "Bank-Financed";
  document.getElementById("selectedStrategy").textContent = strategyText;
  document.getElementById("selectedStatement").textContent = "P&L Statement";

  populateYearDetails(year, index);

  // Debug: Check table after population
  setTimeout(() => {
    const plTable = document.getElementById("plTable");
    const balanceTable = document.getElementById("balanceTable");
    console.log("P&L Table:", plTable);
    console.log("Balance Table:", balanceTable);

    if (plTable) {
      const tableStyle = window.getComputedStyle(plTable);
      console.log("P&L Table width:", tableStyle.width);
      console.log("P&L Table display:", tableStyle.display);
      console.log("P&L Table visibility:", tableStyle.visibility);
    }

    if (balanceTable) {
      const tableStyle = window.getComputedStyle(balanceTable);
      console.log("Balance Table width:", tableStyle.width);
      console.log("Balance Table display:", tableStyle.display);
    }
  }, 100);

  // Set initial navigation button states
  const prevBtn = document.getElementById("prevYearBtn");
  const nextBtn = document.getElementById("nextYearBtn");
  prevBtn.disabled = index <= 0;
  nextBtn.disabled = index >= 14;

  addSwipeListeners();
}

// Add swipe listeners for modal navigation
function addSwipeListeners() {
  const modal = document.getElementById("yearModal");
  let startX = 0;
  let startY = 0;
  let endX = 0;
  let endY = 0;
  let isSwiping = false;

  // Touch start
  modal.addEventListener(
    "touchstart",
    (e) => {
      startX = e.touches[0].clientX;
      startY = e.touches[0].clientY;
      isSwiping = true;
    },
    { passive: true }
  );

  // Touch move - add visual feedback
  modal.addEventListener(
    "touchmove",
    (e) => {
      if (!isSwiping) return;

      const currentX = e.touches[0].clientX;
      const currentY = e.touches[0].clientY;
      const diffX = currentX - startX;
      const diffY = currentY - startY;

      // Only allow horizontal swipes (prevent vertical scrolling interference)
      if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 10) {
        e.preventDefault();

        // Add visual feedback
        const modalContent = modal.querySelector(".modal-content");
        const transform = Math.min(Math.abs(diffX) / 100, 0.1);
        modalContent.style.transform = `translateX(${diffX * 0.3}px)`;
        modalContent.style.opacity = 1 - transform;
      }
    },
    { passive: false }
  );

  // Touch end
  modal.addEventListener(
    "touchend",
    (e) => {
      if (!isSwiping) return;

      endX = e.changedTouches[0].clientX;
      endY = e.changedTouches[0].clientY;

      handleSwipe();

      // Reset visual feedback
      const modalContent = modal.querySelector(".modal-content");
      modalContent.style.transform = "";
      modalContent.style.opacity = "";

      isSwiping = false;
    },
    { passive: true }
  );

  // Mouse events for desktop testing
  modal.addEventListener("mousedown", (e) => {
    startX = e.clientX;
    startY = e.clientY;
    isSwiping = true;
  });

  modal.addEventListener("mousemove", (e) => {
    if (!isSwiping) return;

    const currentX = e.clientX;
    const currentY = e.clientY;
    const diffX = currentX - startX;
    const diffY = currentY - startY;

    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > 10) {
      const modalContent = modal.querySelector(".modal-content");
      const transform = Math.min(Math.abs(diffX) / 100, 0.1);
      modalContent.style.transform = `translateX(${diffX * 0.3}px)`;
      modalContent.style.opacity = 1 - transform;
    }
  });

  modal.addEventListener("mouseup", (e) => {
    if (!isSwiping) return;

    endX = e.clientX;
    endY = e.clientY;

    handleSwipe();

    // Reset visual feedback
    const modalContent = modal.querySelector(".modal-content");
    modalContent.style.transform = "";
    modalContent.style.opacity = "";

    isSwiping = false;
  });

  function handleSwipe() {
    const threshold = 30; // Reduced threshold for better responsiveness
    const diffX = startX - endX;
    const diffY = startY - endY;

    // Only trigger if horizontal swipe is dominant and meets threshold
    if (Math.abs(diffX) > Math.abs(diffY) && Math.abs(diffX) > threshold) {
      if (diffX > 0) {
        // Swipe left - go to next year
        console.log("Swipe left detected - navigating to next year");
        navigateToYear(utils.currentModalIndex + 1);
      } else {
        // Swipe right - go to previous year
        console.log("Swipe right detected - navigating to previous year");
        navigateToYear(utils.currentModalIndex - 1);
      }
    }
  }
}

// Navigate to a specific year in the modal
function navigateToYear(newIndex) {
  if (newIndex < 0 || newIndex > 14) return;

  utils.currentModalIndex = newIndex;
  utils.currentModalYear = newIndex + 1;

  document.getElementById("modalYear").textContent = utils.currentModalYear;
  populateYearDetails(utils.currentModalYear, newIndex);

  // Update navigation button states
  const prevBtn = document.getElementById("prevYearBtn");
  const nextBtn = document.getElementById("nextYearBtn");

  prevBtn.disabled = newIndex <= 0;
  nextBtn.disabled = newIndex >= 14;
}

// Close modal
function closeModal() {
  const modal = document.getElementById("yearModal");
  modal.classList.remove("show");
}

// Switch between self-financed and bank-financed strategies
function switchStrategy(strategy) {
  console.log(
    "🔄 Switching to strategy:",
    strategy,
    "for Year",
    utils.currentModalYear
  );

  currentModalStrategy = strategy;

  // Update dropdown selection
  document.getElementById("strategySelect").value = strategy;

  // Update subtitle
  const strategyText = strategy === "self" ? "Self-Financed" : "Bank-Financed";
  document.getElementById("selectedStrategy").textContent = strategyText;

  // Repopulate the current view
  populateYearDetails(utils.currentModalYear, utils.currentModalIndex);

  console.log("✅ Strategy switch completed for", strategyText);
}

// Show different modal tabs (P&L or Balance Sheet)
function showModalTab(tabName) {
  console.log("🔄 showModalTab called with:", tabName);

  // Hide all tab contents
  const tabContents = document.querySelectorAll(".modal-tab-content");
  console.log("📋 Found tab contents:", tabContents.length);

  tabContents.forEach((content) => {
    content.classList.remove("active");
  });

  // Show selected tab content
  if (tabName === "pl") {
    document.getElementById("plContent").classList.add("active");
    document.getElementById("selectedStatement").textContent = "P&L Statement";
  } else if (tabName === "balance") {
    document.getElementById("balanceContent").classList.add("active");
    document.getElementById("selectedStatement").textContent = "Balance Sheet";
  } else if (tabName === "cashflow") {
    const cashflowElement = document.getElementById("cashflowContent");
    if (cashflowElement) {
      cashflowElement.classList.add("active");
      document.getElementById("selectedStatement").textContent = "Cash Flow";

      // Force population immediately
      populateCashFlowData(utils.currentModalYear, utils.currentModalIndex);
    } else {
      console.error("❌ Cash flow element not found!");
    }
  }

  // Update dropdown selection
  document.getElementById("statementSelect").value = tabName;

  // Repopulate the current view
  populateYearDetails(utils.currentModalYear, utils.currentModalIndex);
}

// Populate year details in modal
function populateYearDetails(year, index) {
  if (!utils.calculationResults) return;

  const results = utils.calculationResults;

  // Use centralized data accessor functions instead of old arrays
  const strategy = currentModalStrategy === "self" ? "self" : "financed";
  console.log(
    "📊 Populating year details - Year:",
    year,
    "Strategy:",
    strategy
  );

  // Debug: Check if calculations module is available
  if (!window.calculations) {
    console.error("❌ calculations module not available!");
    return;
  }

  const yearData = window.calculations.getYearlyStrategyData(
    results,
    year,
    strategy
  );
  const plData = window.calculations.getPLData(results, year, strategy);
  const cashFlowData = window.calculations.getCashFlowStatementData(
    results,
    year,
    strategy
  );

  console.log("🔍 Data access results:", {
    yearData: yearData,
    plData: plData,
    cashFlowData: cashFlowData,
    strategy: strategy,
    year: year,
  });

  console.log("📈 Year data:", {
    newUnits: yearData?.newUnits,
    totalUnits: yearData?.totalUnits,
    assetValue: yearData?.assetValue,
    closingCash: yearData?.closingCash,
  });

  // Fallback to old data structure if centralized data is not available
  const data =
    yearData ||
    (currentModalStrategy === "self"
      ? results.selfFinanced[index]
      : results.financed[index]);
  const detailedData = results.detailedData[index];

  // Populate P&L Statement using centralized data
  const plBody = document.getElementById("plBody");
  const plDataToUse = plData || data; // Use centralized P&L data if available, fallback to old data

  plBody.innerHTML = `
    <tr><td>Gross Potential Rent</td><td>${utils.formatCurrency(
      plDataToUse.gpr || 0
    )}</td></tr>
    <tr><td>Vacancy Loss</td><td>${utils.formatCurrency(
      (plDataToUse.gpr || 0) - (plDataToUse.egi || 0)
    )}</td></tr>
    <tr><td><strong>Effective Gross Income</strong></td><td><strong>${utils.formatCurrency(
      plDataToUse.egi || 0
    )}</strong></td></tr>
    <tr><td>Management Fee</td><td>${utils.formatCurrency(
      (plDataToUse.egi || 0) * (results.inputParams.managementRate / 100)
    )}</td></tr>
    <tr><td>Maintenance</td><td>${utils.formatCurrency(
      (plDataToUse.egi || 0) * (results.inputParams.maintenanceRate / 100)
    )}</td></tr>
    <tr><td>Property Tax</td><td>${utils.formatCurrency(
      (plDataToUse.egi || 0) -
        (plDataToUse.noi || 0) -
        (plDataToUse.capex || 0) -
        (plDataToUse.egi || 0) * (results.inputParams.managementRate / 100) -
        (plDataToUse.egi || 0) * (results.inputParams.maintenanceRate / 100)
    )}</td></tr>
    <tr><td>Insurance</td><td>${utils.formatCurrency(
      (plDataToUse.egi || 0) -
        (plDataToUse.noi || 0) -
        (plDataToUse.egi || 0) * (results.inputParams.managementRate / 100) -
        (plDataToUse.egi || 0) * (results.inputParams.maintenanceRate / 100)
    )}</td></tr>
    <tr><td><strong>Net Operating Income</strong></td><td><strong>${utils.formatCurrency(
      plDataToUse.noi || 0
    )}</strong></td></tr>
    <tr><td>Depreciation</td><td>${utils.formatCurrency(
      plDataToUse.depreciation || 0
    )}</td></tr>
    <tr><td>Interest Expense</td><td>${utils.formatCurrency(
      plDataToUse.interestExpense || 0
    )}</td></tr>
    <tr><td><strong>Taxable Income</strong></td><td><strong>${utils.formatCurrency(
      plDataToUse.taxableIncome || 0
    )}</strong></td></tr>
    <tr><td>Taxes</td><td>${utils.formatCurrency(
      plDataToUse.taxes || 0
    )}</td></tr>
    <tr><td><strong>Net Income</strong></td><td><strong>${utils.formatCurrency(
      plDataToUse.netIncome || 0
    )}</strong></td></tr>
    <tr><td colspan="2" style="background: #f8f9fa; font-weight: bold;">CASH FLOW ITEMS</td></tr>
    <tr><td>Principal Payments</td><td>${utils.formatCurrency(
      (plDataToUse.debtService || 0) - (plDataToUse.interestExpense || 0)
    )}</td></tr>
    <tr><td>CapEx Reserves</td><td>${utils.formatCurrency(
      plDataToUse.capex || 0
    )}</td></tr>
    <tr><td><strong>Net Cash Flow</strong></td><td><strong>${utils.formatCurrency(
      (yearData && yearData.netCashFlow) || (data && data.cashFlow) || 0
    )}</strong></td></tr>
  `;

  // Populate Balance Sheet using centralized data
  const balanceBody = document.getElementById("balanceBody");
  const balanceDataToUse = yearData || data;
  const cumulativeCapEx =
    (yearData && yearData.cumulativeCapEx) ||
    (currentModalStrategy === "self"
      ? detailedData.selfCumulativeCapEx
      : detailedData.financedCumulativeCapEx);

  balanceBody.innerHTML = `
    <tr><td colspan="2" style="background: #f8f9fa; font-weight: bold;">ASSETS</td></tr>
    <tr><td>Real Estate Properties (New ${data.newUnits || 0}, Total ${
    balanceDataToUse.totalUnits || 0
  })</td><td>${utils.formatCurrency(balanceDataToUse.assetValue || 0)}</td></tr>
    <tr><td>CapEx Reserves</td><td>${utils.formatCurrency(
      cumulativeCapEx || 0
    )}</td></tr>
    <tr><td><strong>TOTAL ASSETS</strong></td><td><strong>${utils.formatCurrency(
      (balanceDataToUse.assetValue || 0) + (cumulativeCapEx || 0)
    )}</strong></td></tr>
    <tr><td colspan="2" style="background: #f8f9fa; font-weight: bold;">LIABILITIES</td></tr>
    <tr><td>Mortgage Debt</td><td>${utils.formatCurrency(
      balanceDataToUse.loanBalance || 0
    )}</td></tr>
    <tr><td><strong>TOTAL LIABILITIES</strong></td><td><strong>${utils.formatCurrency(
      balanceDataToUse.loanBalance || 0
    )}</strong></td></tr>
    <tr><td colspan="2" style="background: #f8f9fa; font-weight: bold;">EQUITY</td></tr>
    <tr><td>Property Equity</td><td>${utils.formatCurrency(
      (balanceDataToUse.assetValue || 0) - (balanceDataToUse.loanBalance || 0)
    )}</td></tr>
    <tr><td>Reserves</td><td>${utils.formatCurrency(
      cumulativeCapEx || 0
    )}</td></tr>
    <tr><td><strong>TOTAL EQUITY</strong></td><td><strong>${utils.formatCurrency(
      (balanceDataToUse.assetValue || 0) -
        (balanceDataToUse.loanBalance || 0) +
        (cumulativeCapEx || 0)
    )}</strong></td></tr>
  `;

  // Check if Cash Flow tab is currently active and update it
  const cashflowElement = document.getElementById("cashflowContent");
  if (cashflowElement && cashflowElement.classList.contains("active")) {
    populateCashFlowData(year, index);
  }
}

// Calculate cash flow using single source of truth
window.calculateTrueCashFlow = function calculateTrueCashFlow(
  year,
  index,
  data,
  results,
  strategy
) {
  const isFinanced = strategy === "financed";
  const currentYearBudget =
    year <=
    (isFinanced
      ? results.inputParams.financedPurchaseYears
      : results.inputParams.selfPurchaseYears)
      ? results.inputParams.annualBudget
      : 0;

  // Cash flow components with fallbacks
  const annualBudget = currentYearBudget || 0;
  const rentalIncome = data.egi || 0;
  const operatingExpenses = (data.egi || 0) - (data.noi || 0);
  const interestPaid = data.interestExpense || 0;
  const principalPayments = Math.max(
    0,
    (data.debtService || 0) - (data.interestExpense || 0)
  );
  const capexOutflows = data.capex || 0;
  const taxes = data.taxes || 0;

  // Property acquisition calculation
  const costPerUnit =
    (results.inputParams?.initialCost || 160000) *
    Math.pow(1 + (results.inputParams?.costIncrease || 1) / 100, year - 1);
  const downPaymentPercent = isFinanced
    ? 1 - (results.inputParams?.ltvRatio || 70) / 100
    : 1.0;
  const acquisitionCostPerUnit = costPerUnit * downPaymentPercent;
  const downPaymentOutflows = (data.newUnits || 0) * acquisitionCostPerUnit;

  // Calculate totals
  const totalInflows = annualBudget + rentalIncome;
  const totalOutflows =
    operatingExpenses +
    interestPaid +
    principalPayments +
    capexOutflows +
    taxes +
    downPaymentOutflows;
  const netCashFlow = totalInflows - totalOutflows;

  return {
    netCashFlow,
    totalInflows,
    totalOutflows,
    annualBudget,
    rentalIncome,
    operatingExpenses,
    interestPaid,
    principalPayments,
    capexOutflows,
    taxes,
    downPaymentOutflows,
  };
};

// Separate function to populate cash flow data
function populateCashFlowData(year, index) {
  if (!utils.calculationResults) {
    console.error("❌ No calculation results available");
    return;
  }

  const results = utils.calculationResults;
  const params = results.inputParams;

  // Use centralized data accessor functions
  const strategy = currentModalStrategy === "self" ? "self" : "financed";

  // Debug: Check if calculations module is available
  if (!window.calculations) {
    console.error("❌ calculations module not available for cash flow!");
    return;
  }

  const cashFlowData = window.calculations.getCashFlowStatementData(
    results,
    year,
    strategy
  );

  // Fallback to old data structure if needed
  const data =
    cashFlowData ||
    (currentModalStrategy === "self"
      ? results.selfFinanced[index]
      : results.financed[index]);
  const detailedData = results.detailedData[index];
  const isFinanced = currentModalStrategy === "financed";
  const costPerUnit =
    cashFlowData?.costPerUnit ||
    (results.inputParams?.initialCost || 160000) *
      Math.pow(1 + (results.inputParams?.costIncrease || 1) / 100, year - 1);

  // Populate Cash Flow Statement
  const cashflowBody = document.getElementById("modalCashflowBody");

  // First, let's check if we can even write to the cash flow body
  if (!cashflowBody) {
    console.error("❌ Cash flow body element not found!");
    return;
  }

  // Clear any previous content
  cashflowBody.innerHTML = "";

  // Debug: Log available data

  // If we see the test content, then continue with the real calculation
  if (!data) {
    console.error("❌ No data available for cash flow calculation");
    cashflowBody.innerHTML += `<tr><td colspan="2" style="color: red;">ERROR: No data available</td></tr>`;
    return;
  }

  // Use centralized cash flow data if available, otherwise fall back to old calculation
  let cashFlowDataFromCentral = cashFlowData;
  let calculatedCashFlowData = null;

  if (cashFlowDataFromCentral) {
    // Use centralized data - convert to format expected by the modal
    calculatedCashFlowData = {
      netCashFlow: cashFlowDataFromCentral.netCashFlow || 0,
      totalInflows: cashFlowDataFromCentral.totalInflows || 0,
      totalOutflows: cashFlowDataFromCentral.totalOutflows || 0,
      annualBudget: cashFlowDataFromCentral.annualBudget || 0,
      rentalIncome: cashFlowDataFromCentral.rentalIncome || 0,
      operatingExpenses: cashFlowDataFromCentral.operatingExpenses || 0,
      interestPaid: (data && data.interestExpense) || 0,
      principalPayments:
        ((data && data.debtService) || 0) -
        ((data && data.interestExpense) || 0),
      capexOutflows: cashFlowDataFromCentral.capex || 0,
      taxes: cashFlowDataFromCentral.taxes || 0,
      downPaymentOutflows:
        ((strategy === "financed" &&
          cashFlowDataFromCentral.propertyPurchases) ||
          0) *
        ((100 - (params.ltvRatio || 70)) / 100), // Use actual LTV ratio
    };
  } else {
    // Fall back to old calculation
    try {
      calculatedCashFlowData = calculateTrueCashFlow(
        year,
        index,
        data,
        results,
        currentModalStrategy
      );
    } catch (error) {
      console.error("❌ Error in calculateTrueCashFlow:", error);
      cashflowBody.innerHTML += `<tr><td colspan="2" style="color: red;">ERROR in calculation: ${error.message}</td></tr>`;
      return;
    }

    if (!calculatedCashFlowData) {
      console.error("❌ calculateTrueCashFlow returned null/undefined");
      cashflowBody.innerHTML += `<tr><td colspan="2" style="color: red;">ERROR: Calculation returned no data</td></tr>`;
      return;
    }
  }

  const {
    netCashFlow,
    totalInflows,
    totalOutflows,
    annualBudget,
    rentalIncome,
    operatingExpenses,
    interestPaid,
    principalPayments,
    capexOutflows,
    taxes,
    downPaymentOutflows,
  } = calculatedCashFlowData;

  // Use centralized cash flow data for opening and closing cash if available
  let openingCash = 0;
  let closingCash = 0;

  if (cashFlowDataFromCentral) {
    openingCash = cashFlowDataFromCentral.openingCash || 0;
    closingCash = cashFlowDataFromCentral.closingCash || 0;
  } else {
    // Fallback to old calculation
    if (index > 0) {
      const prevYearIndex = index - 1;
      const prevDetailedData = results.detailedData[prevYearIndex];

      // Opening cash = Previous year's actual available cash balance
      openingCash = isFinanced
        ? prevDetailedData.financedAvailableCash || 0
        : prevDetailedData.selfAvailableCash || 0;
    }
    // Closing cash should be the actual available cash balance after all transactions
    const currentDetailedData = results.detailedData[index];
    closingCash = isFinanced
      ? currentDetailedData.financedAvailableCash || 0
      : currentDetailedData.selfAvailableCash || 0;
  }

  // Get auto-sale data from centralized calculations
  const autoSaleData = {
    unitsSold: data.autoSaleUnits || 0,
    saleProceeds: data.autoSaleProceeds || 0,
    loansClosed: data.autoSaleLoansClosed || 0,
    netProceeds: data.autoSaleNetProceeds || 0,
  };

  // Helper function for currency formatting
  const formatCurrency = (value) => {
    try {
      if (utils && utils.formatCurrency) {
        return utils.formatCurrency(value);
      }
      // Fallback formatting
      return (
        "$" +
        (value || 0).toLocaleString("en-US", {
          minimumFractionDigits: 0,
          maximumFractionDigits: 0,
        })
      );
    } catch (error) {
      console.error("❌ Error in formatCurrency:", error);
      return `$${value || 0}`;
    }
  };

  try {
    const htmlContent = `
    <tr><td colspan="2" style="background: #e8f5e8; font-weight: bold; color: #2e7d32;">OPENING BALANCE</td></tr>
    <tr><td>Opening Cash Balance</td><td>${formatCurrency(
      openingCash
    )}</td></tr>
    
    <tr><td colspan="2" style="background: #e3f2fd; font-weight: bold; color: #1976d2;">CASH INFLOWS</td></tr>
    <tr><td>Annual Investment Budget</td><td>${formatCurrency(
      annualBudget
    )}</td></tr>
    <tr><td>Rental Income (EGI)</td><td>${formatCurrency(
      rentalIncome
    )}</td></tr>
    ${
      autoSaleData.unitsSold > 0
        ? `<tr><td>Unit Sales Proceeds</td><td style="color: #2e7d32; font-weight: 600;">${formatCurrency(
            autoSaleData.saleProceeds
          )}</td></tr>`
        : ""
    }
    <tr><td><strong>Total Cash Inflows</strong></td><td><strong>${formatCurrency(
      annualBudget + rentalIncome + autoSaleData.saleProceeds
    )}</strong></td></tr>
    
    <tr><td colspan="2" style="background: #ffebee; font-weight: bold; color: #d32f2f;">CASH OUTFLOWS</td></tr>
    <tr><td>Operating Expenses</td><td>${formatCurrency(
      operatingExpenses
    )}</td></tr>
    ${
      isFinanced
        ? `<tr><td>Interest Payments</td><td>${formatCurrency(
            interestPaid
          )}</td></tr>`
        : ""
    }
    ${
      isFinanced
        ? `<tr><td>Principal Payments</td><td>${formatCurrency(
            principalPayments
          )}</td></tr>`
        : ""
    }
    <tr><td>CapEx Reserves</td><td>${formatCurrency(capexOutflows)}</td></tr>
    <tr><td>Income Taxes</td><td>${formatCurrency(taxes)}</td></tr>
    ${
      downPaymentOutflows > 0
        ? `<tr><td>Property Acquisitions${
            isFinanced ? " (Down Payments)" : ""
          }</td><td>${formatCurrency(downPaymentOutflows)}</td></tr>`
        : ""
    }
    ${
      autoSaleData.loansClosed > 0
        ? `<tr><td>Loan Closures (Unit Sales)</td><td style="color: #d32f2f; font-weight: 600;">${formatCurrency(
            autoSaleData.loanClosures
          )}</td></tr>`
        : ""
    }
    <tr><td><strong>Total Cash Outflows</strong></td><td><strong>${formatCurrency(
      operatingExpenses +
        (isFinanced ? interestPaid + principalPayments : 0) +
        capexOutflows +
        taxes +
        downPaymentOutflows +
        autoSaleData.loanClosures
    )}</strong></td></tr>
    
    <tr><td colspan="2" style="background: #f3e5f5; font-weight: bold; color: #7b1fa2;">NET CASH FLOW</td></tr>
    <tr><td><strong>Net Cash Flow (Inflows - Outflows)</strong></td><td><strong>${formatCurrency(
      annualBudget +
        rentalIncome +
        autoSaleData.saleProceeds -
        (operatingExpenses +
          (isFinanced ? interestPaid + principalPayments : 0) +
          capexOutflows +
          taxes +
          downPaymentOutflows +
          autoSaleData.loanClosures)
    )}</strong></td></tr>
    
    ${
      autoSaleData.unitsSold > 0
        ? `
    <tr><td colspan="2" style="background: #fff3e0; font-weight: bold; color: #f57c00;">AUTO-SALE ACTIVITY</td></tr>
    <tr><td>Units Sold</td><td>${autoSaleData.unitsSold} units</td></tr>
    <tr><td>Sale Proceeds</td><td style="color: #2e7d32;">${formatCurrency(
      autoSaleData.saleProceeds
    )}</td></tr>
    <tr><td>Outstanding Loans Closed</td><td style="color: #d32f2f;">${formatCurrency(
      autoSaleData.loanClosures
    )}</td></tr>
    <tr><td>Net Proceeds Available</td><td style="color: #2e7d32; font-weight: 600;">${formatCurrency(
      autoSaleData.netProceeds
    )}</td></tr>
    `
        : ""
    }
    
    <tr><td colspan="2" style="background: #e8f5e8; font-weight: bold; color: #2e7d32;">CLOSING BALANCE</td></tr>
    <tr><td><strong>Closing Cash Balance</strong></td><td><strong>${formatCurrency(
      closingCash
    )}</strong></td></tr>
    
    <tr><td colspan="2" style="background: #fff3e0; font-weight: bold; color: #f57c00;">VALIDATION</td></tr>
    <tr><td>Manual Check: Opening + Net Flow</td><td>${formatCurrency(
      openingCash +
        (annualBudget +
          rentalIncome +
          autoSaleData.saleProceeds -
          (operatingExpenses +
            (isFinanced ? interestPaid + principalPayments : 0) +
            capexOutflows +
            taxes +
            downPaymentOutflows +
            autoSaleData.loanClosures))
    )}</td></tr>
    <tr><td>Units Purchased This Year</td><td>${data.newUnits || 0}</td></tr>
    <tr><td>Cost Per Unit</td><td>${formatCurrency(costPerUnit)}</td></tr>
  `;

    console.log("💰 Generated HTML content length:", htmlContent.length);
    console.log("💰 Setting innerHTML...");
    cashflowBody.innerHTML = htmlContent;
  } catch (error) {
    console.error("❌ Error generating or setting HTML:", error);
    cashflowBody.innerHTML = `<tr><td colspan="2" style="color: red;">ERROR: ${error.message}</td></tr>`;
  }
}

// Auto-sale data is now calculated in calculations.js and accessed via centralized data

// Auto-sale calculations moved to calculations.js

// Function to get units owned at the start of a year
function getUnitsOwnedAtYearStart(year, strategy, results) {
  const units = [];

  // This is a simplified implementation - in a real system, you'd track individual units
  // For now, we'll estimate based on the total units and average values

  if (year <= 1) return units;

  const yearData = calculations.getYearlyStrategyData(
    results,
    year - 1,
    strategy
  );
  if (!yearData) return units;

  const totalUnits = yearData.totalUnits || 0;
  const costPerUnit = results.inputParams.initialCost || 160000;
  const appreciationRate = results.inputParams.appreciationRate || 3.5;

  for (let i = 0; i < totalUnits; i++) {
    // Estimate purchase year based on unit index and purchase pattern
    const estimatedPurchaseYear = Math.max(1, year - Math.floor(i / 2));
    const yearsOwned = year - estimatedPurchaseYear;

    units.push({
      purchaseYear: estimatedPurchaseYear,
      purchasePrice:
        costPerUnit *
        Math.pow(
          1 + (results.inputParams.costIncrease || 1) / 100,
          estimatedPurchaseYear - 1
        ),
      currentValue:
        costPerUnit * Math.pow(1 + appreciationRate / 100, yearsOwned),
      outstandingLoan:
        strategy === "financed"
          ? estimateOutstandingLoan(
              costPerUnit,
              estimatedPurchaseYear,
              year,
              results
            )
          : 0,
      roi: calculateUnitROI(estimatedPurchaseYear, year, results),
    });
  }

  return units;
}

// Helper function to estimate outstanding loan balance
function estimateOutstandingLoan(
  purchasePrice,
  purchaseYear,
  currentYear,
  results
) {
  const ltvRatio = results.inputParams.ltvRatio || 70;
  const loanAmount = purchasePrice * (ltvRatio / 100);
  const loanTerm = results.inputParams.loanTerm || 5;
  const interestRate = results.inputParams.interestRate || 7;

  const yearsRemaining = Math.max(0, loanTerm - (currentYear - purchaseYear));
  if (yearsRemaining <= 0) return 0;

  // Simplified loan balance calculation
  const monthlyRate = interestRate / 100 / 12;
  const totalPayments = loanTerm * 12;
  const paymentsMade = (currentYear - purchaseYear) * 12;

  const monthlyPayment =
    (loanAmount * (monthlyRate * Math.pow(1 + monthlyRate, totalPayments))) /
    (Math.pow(1 + monthlyRate, totalPayments) - 1);

  let balance = loanAmount;
  for (let i = 0; i < paymentsMade; i++) {
    const interest = balance * monthlyRate;
    const principal = monthlyPayment - interest;
    balance -= principal;
  }

  return Math.max(0, balance);
}

// Helper function to calculate unit ROI
function calculateUnitROI(purchaseYear, currentYear, results) {
  const costPerUnit = results.inputParams.initialCost || 160000;
  const appreciationRate = results.inputParams.appreciationRate || 3.5;
  const rentalRate = results.inputParams.rentalRate || 1.0;

  const yearsOwned = currentYear - purchaseYear;
  const currentValue =
    costPerUnit * Math.pow(1 + appreciationRate / 100, yearsOwned);
  const annualRent = costPerUnit * (rentalRate / 100) * 12;

  // Simplified ROI calculation
  const totalReturn = currentValue - costPerUnit + annualRent * yearsOwned;
  return (totalReturn / costPerUnit) * 100;
}

// Close modal when clicking outside
window.onclick = function (event) {
  const modal = document.getElementById("yearModal");
  if (event.target === modal) {
    closeModal();
  }
};
