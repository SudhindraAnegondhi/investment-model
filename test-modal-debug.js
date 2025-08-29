// Test script to debug modal cash flow functionality
console.log("🧪 Modal Cash Flow Debug Test");

// Test if elements exist after DOM loads
document.addEventListener('DOMContentLoaded', function() {
  console.log("📋 DOM loaded, checking elements...");
  
  // Check for modal elements
  const modal = document.getElementById("yearModal");
  const cashflowContent = document.getElementById("cashflowContent");
  const modalCashflowBody = document.getElementById("modalCashflowBody");
  const statementSelect = document.getElementById("statementSelect");
  
  console.log("Modal element:", modal);
  console.log("Cashflow content element:", cashflowContent);
  console.log("Modal cashflow body element:", modalCashflowBody);
  console.log("Statement select element:", statementSelect);
  
  if (statementSelect) {
    const options = statementSelect.querySelectorAll('option');
    console.log("Available statement options:", Array.from(options).map(opt => opt.value));
    
    // Check if cashflow option exists
    const cashflowOption = Array.from(options).find(opt => opt.value === 'cashflow');
    console.log("Cashflow option found:", cashflowOption);
  }
  
  // Add click handler to test the tab functionality
  if (modal) {
    console.log("✅ Modal found, setting up test click handler");
    
    // Test the dropdown change
    if (statementSelect) {
      statementSelect.addEventListener('change', function(e) {
        console.log("🔄 Statement select changed to:", e.target.value);
        if (e.target.value === 'cashflow') {
          console.log("💰 Cash flow selected - should trigger showModalTab");
        }
      });
    }
  } else {
    console.error("❌ Modal not found!");
  }
});

// Test the showModalTab function directly if available
setTimeout(() => {
  console.log("🔍 Testing showModalTab function availability");
  if (typeof showModalTab === 'function') {
    console.log("✅ showModalTab function is available");
  } else {
    console.log("❌ showModalTab function not found");
  }
  
  if (typeof populateCashFlowData === 'function') {
    console.log("✅ populateCashFlowData function is available");
  } else {
    console.log("❌ populateCashFlowData function not found");
  }
}, 1000);