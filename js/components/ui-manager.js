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
  updateSummary();
  updateROIAnalysis();
  updateSensitivityAnalysis();
  updateBreakEvenAnalysis();
}

// Update the main comparison table
function updateComparisonTable() {
  const tbody = document.getElementById("comparisonBody");
  if (!tbody || !utils.calculationResults) return;

  tbody.innerHTML = "";
  const results = utils.calculationResults;

  for (let year = 1; year <= 15; year++) {
    const comparison = results.comparison[year - 1];

    const tr = document.createElement("tr");
    tr.onclick = () => showYearModal(year, year - 1);

    tr.innerHTML = `
      <td>${year}</td>
      <td>${utils.formatCurrency(comparison.propertyCost)}</td>
      <td>${comparison.selfNewUnits}</td>
      <td>${comparison.selfTotalUnits}</td>
      <td class="${
        comparison.selfCashFlow >= 0 ? "positive" : "negative"
      }">${utils.formatCurrency(comparison.selfCashFlow)}</td>
      <td>${utils.formatCurrency(comparison.selfAssetValue)}</td>
      <td>${comparison.financedNewUnits}</td>
      <td>${comparison.financedTotalUnits}</td>
      <td class="${
        comparison.financedCashFlow >= 0 ? "positive" : "negative"
      }">${utils.formatCurrency(comparison.financedCashFlow)}</td>
      <td>${utils.formatCurrency(comparison.financedAssetValue)}</td>
      <td>${utils.formatCurrency(comparison.loanBalance)}</td>
      <td>${utils.formatCurrency(comparison.netEquity)}</td>
    `;

    tbody.appendChild(tr);
  }
}

// Update the cash flow table
function updateCashFlowTable() {
  const tbody = document.getElementById("cashflowBody");
  if (!tbody || !utils.calculationResults) return;

  tbody.innerHTML = "";
  const results = utils.calculationResults;

  let selfCumulative = 0;
  let financedCumulative = 0;

  for (let year = 1; year <= 15; year++) {
    const self = results.selfFinanced[year - 1];
    const financed = results.financed[year - 1];

    selfCumulative += self.cashFlow;
    financedCumulative += financed.cashFlow;

    const tr = document.createElement("tr");
    tr.onclick = () => showYearModal(year, year - 1);

    tr.innerHTML = `
      <td>${year}</td>
      <td class="${
        self.cashFlow >= 0 ? "positive" : "negative"
      }">${utils.formatCurrency(self.cashFlow)}</td>
      <td class="${
        selfCumulative >= 0 ? "positive" : "negative"
      }">${utils.formatCurrency(selfCumulative)}</td>
      <td>${utils.formatCurrency(self.assetValue)}</td>
      <td>${utils.formatCurrency(self.netWorth)}</td>
      <td class="${
        financed.cashFlow >= 0 ? "positive" : "negative"
      }">${utils.formatCurrency(financed.cashFlow)}</td>
      <td class="${
        financedCumulative >= 0 ? "positive" : "negative"
      }">${utils.formatCurrency(financedCumulative)}</td>
      <td>${utils.formatCurrency(financed.assetValue)}</td>
      <td>${utils.formatCurrency(financed.netWorth)}</td>
      <td class="${
        financed.cashFlow - self.cashFlow >= 0 ? "positive" : "negative"
      }">${utils.formatCurrency(financed.cashFlow - self.cashFlow)}</td>
    `;

    tbody.appendChild(tr);
  }
}

// Show year detail modal
function showYearModal(year, index) {
  utils.currentModalYear = year;
  utils.currentModalIndex = index;
  currentModalStrategy = "self"; // Set initial strategy

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

  // Set initial dropdown values and subtitle
  document.getElementById("strategySelect").value = "self";
  document.getElementById("statementSelect").value = "pl";
  document.getElementById("selectedStrategy").textContent = "Self-Financed";
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
  currentModalStrategy = strategy;

  // Update dropdown selection
  document.getElementById("strategySelect").value = strategy;

  // Update subtitle
  const strategyText = strategy === "self" ? "Self-Financed" : "Bank-Financed";
  document.getElementById("selectedStrategy").textContent = strategyText;

  // Repopulate the current view
  populateYearDetails(utils.currentModalYear, utils.currentModalIndex);
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
    console.log("✅ P&L tab activated");
  } else if (tabName === "balance") {
    document.getElementById("balanceContent").classList.add("active");
    document.getElementById("selectedStatement").textContent = "Balance Sheet";
    console.log("✅ Balance tab activated");
  } else if (tabName === "cashflow") {
    console.log("💰 Attempting to show cash flow tab...");
    const cashflowElement = document.getElementById("cashflowContent");
    console.log("💰 Cash flow element found:", cashflowElement);
    if (cashflowElement) {
      cashflowElement.classList.add("active");
      document.getElementById("selectedStatement").textContent = "Cash Flow";
      console.log("✅ Cash Flow tab activated");
      
      // Force population immediately
      console.log("💰 Forcing cash flow population...");
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
  const data =
    currentModalStrategy === "self"
      ? results.selfFinanced[index]
      : results.financed[index];
  const detailedData = results.detailedData[index];

  // Populate P&L Statement
  const plBody = document.getElementById("plBody");
  plBody.innerHTML = `
    <tr><td>Gross Potential Rent</td><td>${utils.formatCurrency(
      data.gpr
    )}</td></tr>
    <tr><td>Vacancy Loss</td><td>${utils.formatCurrency(
      data.gpr - data.egi
    )}</td></tr>
    <tr><td><strong>Effective Gross Income</strong></td><td><strong>${utils.formatCurrency(
      data.egi
    )}</strong></td></tr>
    <tr><td>Management Fee</td><td>${utils.formatCurrency(
      data.egi * (results.inputParams.managementRate / 100)
    )}</td></tr>
    <tr><td>Maintenance</td><td>${utils.formatCurrency(
      data.egi * (results.inputParams.maintenanceRate / 100)
    )}</td></tr>
    <tr><td>Property Tax</td><td>${utils.formatCurrency(
      data.egi -
        data.noi -
        data.capex -
        data.egi * (results.inputParams.managementRate / 100) -
        data.egi * (results.inputParams.maintenanceRate / 100)
    )}</td></tr>
    <tr><td>Insurance</td><td>${utils.formatCurrency(
      data.egi -
        data.noi -
        data.egi * (results.inputParams.managementRate / 100) -
        data.egi * (results.inputParams.maintenanceRate / 100)
    )}</td></tr>
    <tr><td><strong>Net Operating Income</strong></td><td><strong>${utils.formatCurrency(
      data.noi
    )}</strong></td></tr>
    <tr><td>Depreciation</td><td>${utils.formatCurrency(
      data.depreciation
    )}</td></tr>
    <tr><td>Interest Expense</td><td>${utils.formatCurrency(
      data.interestExpense || 0
    )}</td></tr>
    <tr><td><strong>Taxable Income</strong></td><td><strong>${utils.formatCurrency(
      data.taxableIncome
    )}</strong></td></tr>
    <tr><td>Taxes</td><td>${utils.formatCurrency(data.taxes)}</td></tr>
    <tr><td><strong>Net Income</strong></td><td><strong>${utils.formatCurrency(
      data.netIncome
    )}</strong></td></tr>
    <tr><td colspan="2" style="background: #f8f9fa; font-weight: bold;">CASH FLOW ITEMS</td></tr>
    <tr><td>Principal Payments</td><td>${utils.formatCurrency(
      (data.debtService || 0) - (data.interestExpense || 0)
    )}</td></tr>
    <tr><td>CapEx Reserves</td><td>${utils.formatCurrency(data.capex)}</td></tr>
    <tr><td><strong>Net Cash Flow</strong></td><td><strong>${utils.formatCurrency(
      data.cashFlow
    )}</strong></td></tr>
  `;

  // Populate Balance Sheet
  const balanceBody = document.getElementById("balanceBody");
  const cumulativeCapEx =
    currentModalStrategy === "self"
      ? detailedData.selfCumulativeCapEx
      : detailedData.financedCumulativeCapEx;

  balanceBody.innerHTML = `
    <tr><td colspan="2" style="background: #f8f9fa; font-weight: bold;">ASSETS</td></tr>
    <tr><td>Real Estate Properties</td><td>${utils.formatCurrency(
      data.assetValue
    )}</td></tr>
    <tr><td>CapEx Reserves</td><td>${utils.formatCurrency(
      cumulativeCapEx
    )}</td></tr>
    <tr><td><strong>TOTAL ASSETS</strong></td><td><strong>${utils.formatCurrency(
      data.assetValue + cumulativeCapEx
    )}</strong></td></tr>
    <tr><td colspan="2" style="background: #f8f9fa; font-weight: bold;">LIABILITIES</td></tr>
    <tr><td>Mortgage Debt</td><td>${utils.formatCurrency(
      data.loanBalance || 0
    )}</td></tr>
    <tr><td><strong>TOTAL LIABILITIES</strong></td><td><strong>${utils.formatCurrency(
      data.loanBalance || 0
    )}</strong></td></tr>
    <tr><td colspan="2" style="background: #f8f9fa; font-weight: bold;">EQUITY</td></tr>
    <tr><td>Property Equity</td><td>${utils.formatCurrency(
      data.assetValue - (data.loanBalance || 0)
    )}</td></tr>
    <tr><td>Reserves</td><td>${utils.formatCurrency(cumulativeCapEx)}</td></tr>
    <tr><td><strong>TOTAL EQUITY</strong></td><td><strong>${utils.formatCurrency(
      data.assetValue - (data.loanBalance || 0) + cumulativeCapEx
    )}</strong></td></tr>
  `;

}

// Calculate cash flow using single source of truth
window.calculateTrueCashFlow = function calculateTrueCashFlow(year, index, data, results, strategy) {
  const isFinanced = strategy === "financed";
  const currentYearBudget = year <= (isFinanced ? results.inputParams.financedPurchaseYears : results.inputParams.selfPurchaseYears) ? results.inputParams.annualBudget : 0;
  
  // Cash flow components with fallbacks
  const annualBudget = currentYearBudget || 0;
  const rentalIncome = data.egi || 0;
  const operatingExpenses = (data.egi || 0) - (data.noi || 0);
  const interestPaid = data.interestExpense || 0;
  const principalPayments = Math.max(0, (data.debtService || 0) - (data.interestExpense || 0));
  const capexOutflows = data.capex || 0;
  const taxes = data.taxes || 0;
  
  // Property acquisition calculation
  const costPerUnit = (results.inputParams?.initialCost || 160000) * Math.pow(1 + ((results.inputParams?.costIncrease || 1) / 100), year - 1);
  const downPaymentPercent = isFinanced ? (1 - (results.inputParams?.ltvRatio || 70) / 100) : 1.0;
  const acquisitionCostPerUnit = costPerUnit * downPaymentPercent;
  const downPaymentOutflows = (data.newUnits || 0) * acquisitionCostPerUnit;
  
  // Calculate totals
  const totalInflows = annualBudget + rentalIncome;
  const totalOutflows = operatingExpenses + interestPaid + principalPayments + capexOutflows + taxes + downPaymentOutflows;
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
    downPaymentOutflows
  };
}

// Separate function to populate cash flow data
function populateCashFlowData(year, index) {
  console.log("🔄 populateCashFlowData called with:", year, index);
  
  if (!utils.calculationResults) {
    console.error("❌ No calculation results available");
    return;
  }

  const results = utils.calculationResults;
  const data = currentModalStrategy === "self" ? results.selfFinanced[index] : results.financed[index];
  const detailedData = results.detailedData[index];
  const isFinanced = currentModalStrategy === "financed";
  const costPerUnit = (results.inputParams?.initialCost || 160000) * Math.pow(1 + ((results.inputParams?.costIncrease || 1) / 100), year - 1);

  // Populate Cash Flow Statement
  const cashflowBody = document.getElementById("modalCashflowBody");
  
  // First, let's check if we can even write to the cash flow body
  if (!cashflowBody) {
    console.error("❌ Cash flow body element not found!");
    return;
  }
  
  console.log("✅ Cash flow body element found, populating...");
  
  // Clear any previous content
  cashflowBody.innerHTML = "";
  
  // Debug: Log available data
  console.log("🔍 Cash Flow Debug - Year:", year, "Index:", index);
  console.log("🔍 Data object:", data);
  console.log("🔍 Detailed data:", detailedData);
  console.log("🔍 Input params:", results.inputParams);
  console.log("🔍 Current strategy:", currentModalStrategy);
  
  // If we see the test content, then continue with the real calculation
  if (!data) {
    console.error("❌ No data available for cash flow calculation");
    cashflowBody.innerHTML += `<tr><td colspan="2" style="color: red;">ERROR: No data available</td></tr>`;
    return;
  }
  
  // Use the unified cash flow calculation function
  let cashFlowData;
  try {
    console.log("💰 About to call calculateTrueCashFlow with:", {year, index, currentModalStrategy});
    cashFlowData = calculateTrueCashFlow(year, index, data, results, currentModalStrategy);
    console.log("💰 calculateTrueCashFlow returned:", cashFlowData);
  } catch (error) {
    console.error("❌ Error in calculateTrueCashFlow:", error);
    cashflowBody.innerHTML += `<tr><td colspan="2" style="color: red;">ERROR in calculation: ${error.message}</td></tr>`;
    return;
  }
  
  if (!cashFlowData) {
    console.error("❌ calculateTrueCashFlow returned null/undefined");
    cashflowBody.innerHTML += `<tr><td colspan="2" style="color: red;">ERROR: Calculation returned no data</td></tr>`;
    return;
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
    downPaymentOutflows
  } = cashFlowData;
  
  // Calculate opening cash (simplified)
  const openingCash = index === 0 ? 0 : Math.max(0, data.cumulativeCashFlow || 0) - (data.cashFlow || 0);
  const closingCash = Math.max(0, openingCash + netCashFlow);
  
  console.log("🔍 Using unified calculation - values:", {
    annualBudget, rentalIncome, operatingExpenses, interestPaid, 
    principalPayments, capexOutflows, taxes, downPaymentOutflows,
    totalInflows, totalOutflows, netCashFlow, openingCash, closingCash
  });
  
  // Helper function for currency formatting
  const formatCurrency = (value) => {
    try {
      if (utils && utils.formatCurrency) {
        return utils.formatCurrency(value);
      }
      // Fallback formatting
      return '$' + (value || 0).toLocaleString('en-US', { 
        minimumFractionDigits: 0, 
        maximumFractionDigits: 0 
      });
    } catch (error) {
      console.error("❌ Error in formatCurrency:", error);
      return `$${value || 0}`;
    }
  };
  
  console.log("💰 About to populate cash flow table...");
  
  try {
    const htmlContent = `
    <tr><td colspan="2" style="background: #e8f5e8; font-weight: bold; color: #2e7d32;">OPENING BALANCE</td></tr>
    <tr><td>Opening Cash Balance</td><td>${formatCurrency(openingCash)}</td></tr>
    
    <tr><td colspan="2" style="background: #e3f2fd; font-weight: bold; color: #1976d2;">CASH INFLOWS</td></tr>
    <tr><td>Annual Investment Budget</td><td>${formatCurrency(annualBudget)}</td></tr>
    <tr><td>Rental Income (EGI)</td><td>${formatCurrency(rentalIncome)}</td></tr>
    <tr><td><strong>Total Cash Inflows</strong></td><td><strong>${formatCurrency(totalInflows)}</strong></td></tr>
    
    <tr><td colspan="2" style="background: #ffebee; font-weight: bold; color: #d32f2f;">CASH OUTFLOWS</td></tr>
    <tr><td>Operating Expenses</td><td>${formatCurrency(operatingExpenses)}</td></tr>
    ${isFinanced ? `<tr><td>Interest Payments</td><td>${formatCurrency(interestPaid)}</td></tr>` : ''}
    ${isFinanced ? `<tr><td>Principal Payments</td><td>${formatCurrency(principalPayments)}</td></tr>` : ''}
    <tr><td>CapEx Reserves</td><td>${formatCurrency(capexOutflows)}</td></tr>
    <tr><td>Income Taxes</td><td>${formatCurrency(taxes)}</td></tr>
    ${downPaymentOutflows > 0 ? `<tr><td>Property Acquisitions${isFinanced ? ' (Down Payments)' : ''}</td><td>${formatCurrency(downPaymentOutflows)}</td></tr>` : ''}
    <tr><td><strong>Total Cash Outflows</strong></td><td><strong>${formatCurrency(totalOutflows)}</strong></td></tr>
    
    <tr><td colspan="2" style="background: #f3e5f5; font-weight: bold; color: #7b1fa2;">NET CASH FLOW</td></tr>
    <tr><td><strong>Net Cash Flow (Inflows - Outflows)</strong></td><td><strong>${formatCurrency(netCashFlow)}</strong></td></tr>
    
    <tr><td colspan="2" style="background: #e8f5e8; font-weight: bold; color: #2e7d32;">CLOSING BALANCE</td></tr>
    <tr><td><strong>Closing Cash Balance</strong></td><td><strong>${formatCurrency(closingCash)}</strong></td></tr>
    
    <tr><td colspan="2" style="background: #fff3e0; font-weight: bold; color: #f57c00;">VALIDATION</td></tr>
    <tr><td>Manual Check: Opening + Net Flow</td><td>${formatCurrency(openingCash + netCashFlow)}</td></tr>
    <tr><td>Units Purchased This Year</td><td>${data.newUnits || 0}</td></tr>
    <tr><td>Cost Per Unit</td><td>${formatCurrency(costPerUnit)}</td></tr>
  `;
    
    console.log("💰 Generated HTML content length:", htmlContent.length);
    console.log("💰 Setting innerHTML...");
    cashflowBody.innerHTML = htmlContent;
    console.log("💰 HTML set successfully, current innerHTML length:", cashflowBody.innerHTML.length);
    
  } catch (error) {
    console.error("❌ Error generating or setting HTML:", error);
    cashflowBody.innerHTML = `<tr><td colspan="2" style="color: red;">ERROR: ${error.message}</td></tr>`;
  }
}

// Close modal when clicking outside
window.onclick = function (event) {
  const modal = document.getElementById("yearModal");
  if (event.target === modal) {
    closeModal();
  }
};
