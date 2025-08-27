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
  // Hide all tab contents
  const tabContents = document.querySelectorAll(".modal-tab-content");
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
        data.capex -
        data.egi * (results.inputParams.managementRate / 100) -
        data.egi * (results.inputParams.maintenanceRate / 100)
    )}</td></tr>
    <tr><td>CapEx Reserves</td><td>${utils.formatCurrency(data.capex)}</td></tr>
    <tr><td><strong>Net Operating Income</strong></td><td><strong>${utils.formatCurrency(
      data.noi
    )}</strong></td></tr>
    <tr><td>Depreciation</td><td>${utils.formatCurrency(
      data.depreciation
    )}</td></tr>
    <tr><td>Debt Service</td><td>${utils.formatCurrency(
      data.debtService
    )}</td></tr>
    <tr><td><strong>Taxable Income</strong></td><td><strong>${utils.formatCurrency(
      data.taxableIncome
    )}</strong></td></tr>
    <tr><td>Taxes</td><td>${utils.formatCurrency(data.taxes)}</td></tr>
    <tr><td><strong>Net Income</strong></td><td><strong>${utils.formatCurrency(
      data.netIncome
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

// Close modal when clicking outside
window.onclick = function (event) {
  const modal = document.getElementById("yearModal");
  if (event.target === modal) {
    closeModal();
  }
};
