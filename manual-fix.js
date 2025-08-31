// Manual fix for dashboard values
function manuallyFixDashboard() {
  console.log("🔧 Manual dashboard fix started...");
  
  try {
    // Get the calculation results
    const params = dataModel.getDefaultParameters();
    const results = calculations.performCalculations(params);
    
    console.log("📊 Manual fix - got results:", !!results);
    console.log("📊 Manual fix - summaryMetrics:", results.summaryMetrics);
    
    if (results && results.summaryMetrics) {
      const summary = results.summaryMetrics;
      
      // Get the DOM elements
      const leverageEl = document.getElementById('leverage-multiplier');
      const unitsEl = document.getElementById('units-per-dollar');
      
      console.log("🎯 Manual fix - found elements:", {
        leverage: !!leverageEl,
        units: !!unitsEl
      });
      
      // Set leverage multiplier
      if (leverageEl && summary.leverageMultiplier) {
        const leverageValue = summary.leverageMultiplier;
        const formattedValue = leverageValue.toFixed(2) + "x";
        leverageEl.textContent = formattedValue;
        console.log("✅ Manual fix - set leverage:", leverageValue, "->", formattedValue);
      }
      
      // Set units per dollar
      if (unitsEl && summary.unitsPerDollar && summary.unitsPerDollar.financed) {
        const unitsValue = summary.unitsPerDollar.financed;
        const formattedValue = unitsValue.toFixed(4) + " units per $1K";
        unitsEl.textContent = formattedValue;
        console.log("✅ Manual fix - set units:", unitsValue, "->", formattedValue);
      }
      
      console.log("🎯 Manual fix completed successfully");
      return true;
    }
  } catch (error) {
    console.error("❌ Manual fix failed:", error);
  }
  
  return false;
}

// Try to fix after DOM is loaded
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setTimeout(manuallyFixDashboard, 1000); // Wait 1 second after DOM loaded
  });
} else {
  setTimeout(manuallyFixDashboard, 1000); // Wait 1 second if already loaded
}