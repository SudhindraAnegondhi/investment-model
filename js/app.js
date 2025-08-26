// Main Application Controller
// Ties all modules together and provides the main entry point

// Initialize the application
function initApp() {
  console.log("Rental Investment Model initialized");

  // Make modules globally available for silent calculation
  window.roiAnalysis = window.roiAnalysis || {};
  window.sensitivityAnalysis = window.sensitivityAnalysis || {};
  window.balanceSheet = window.balanceSheet || {};
  window.uiManager = window.uiManager || {};

  // Set up any global event listeners
  setupEventListeners();

  // Load default parameters if needed
  loadDefaultParameters();
}

// Set up global event listeners
function setupEventListeners() {
  // Add any global event listeners here
  document.addEventListener("DOMContentLoaded", function () {
    console.log("DOM loaded, application ready");
  });
}

// Load default parameters
function loadDefaultParameters() {
  const defaults = dataModel.getDefaultParameters();

  // Set default values for inputs
  Object.keys(defaults).forEach((key) => {
    const element = document.getElementById(key);
    if (element && element.type === "number") {
      element.value = defaults[key];
    } else if (element && element.tagName === "SELECT") {
      element.value = defaults[key];
    }
  });
}

// Main calculation function (entry point)
function calculateAll() {
  try {
    const params = utils.getInputParameters();
    const validation = dataModel.validateInvestmentParameters(params);

    if (!validation.isValid) {
      alert(
        "Please fix the following errors:\n" + validation.errors.join("\n")
      );
      return;
    }

    // Perform calculations
    const results = calculations.performCalculations(params);

    // Store results globally
    utils.calculationResults = results;

    // Update all UI components
    uiManager.updateAllTables();

    console.log("Calculations completed successfully");
  } catch (error) {
    utils.handleError(error, "calculateAll");
    alert(
      "An error occurred during calculations. Please check the console for details."
    );
  }
}

// Initialize the app when the script loads
initApp();
