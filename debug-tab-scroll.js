// Debug script to check tab scrolling behavior
console.log("🧪 Tab Scroll Debug Test - Root cause found: responsive.css conflicting with main.css");
console.log("✅ Fixed: Removed flex-wrap: wrap override in mobile breakpoints");

// Function to check tab container properties with more details
function checkTabContainerStyles() {
  const tabContainer = document.querySelector('.tab-container');
  const tabs = document.querySelector('.tabs');
  const allTabButtons = document.querySelectorAll('.tab');
  
  console.log("=== TAB CONTAINER ANALYSIS ===");
  
  if (tabContainer) {
    const containerStyles = window.getComputedStyle(tabContainer);
    console.log("📦 Tab Container Properties:");
    console.log("  Element:", tabContainer);
    console.log("  overflow-x:", containerStyles.overflowX);
    console.log("  white-space:", containerStyles.whiteSpace);
    console.log("  display:", containerStyles.display);
    console.log("  width:", containerStyles.width);
    console.log("  scrollWidth:", tabContainer.scrollWidth);
    console.log("  clientWidth:", tabContainer.clientWidth);
    console.log("  offsetWidth:", tabContainer.offsetWidth);
    console.log("  scrollable:", tabContainer.scrollWidth > tabContainer.clientWidth);
    console.log("  scrollLeft:", tabContainer.scrollLeft);
    console.log("  maxScrollLeft:", tabContainer.scrollWidth - tabContainer.clientWidth);
  } else {
    console.error("❌ Tab container not found!");
  }
  
  if (tabs) {
    const tabsStyles = window.getComputedStyle(tabs);
    console.log("📋 Tabs Element Properties:");
    console.log("  Element:", tabs);
    console.log("  display:", tabsStyles.display);
    console.log("  width:", tabsStyles.width);
    console.log("  min-width:", tabsStyles.minWidth);
    console.log("  max-width:", tabsStyles.maxWidth);
    console.log("  flex-shrink:", tabsStyles.flexShrink);
    console.log("  flex-wrap:", tabsStyles.flexWrap);
    console.log("  scrollWidth:", tabs.scrollWidth);
    console.log("  clientWidth:", tabs.clientWidth);
    console.log("  offsetWidth:", tabs.offsetWidth);
  } else {
    console.error("❌ Tabs element not found!");
  }
  
  console.log("📑 Tab Buttons Count:", allTabButtons.length);
  allTabButtons.forEach((tab, index) => {
    console.log(`  Tab ${index}: ${tab.textContent.trim()}, width: ${tab.offsetWidth}px`);
  });
  
  // Test if we can actually scroll
  if (tabContainer && tabContainer.scrollWidth > tabContainer.clientWidth) {
    const originalScrollLeft = tabContainer.scrollLeft;
    tabContainer.scrollLeft = 50;
    const newScrollLeft = tabContainer.scrollLeft;
    tabContainer.scrollLeft = originalScrollLeft;
    console.log("🔄 Scroll Test - Can scroll:", newScrollLeft !== originalScrollLeft);
  }
  
  console.log("=== END TAB ANALYSIS ===\n");
}

// Set up mutation observer to watch for DOM changes
function setupMutationObserver() {
  const tabContainer = document.querySelector('.tab-container');
  if (!tabContainer) return;
  
  const observer = new MutationObserver(function(mutations) {
    mutations.forEach(function(mutation) {
      if (mutation.type === 'attributes' && mutation.attributeName === 'style') {
        console.log("🔄 Style change detected on:", mutation.target);
        console.log("  New style:", mutation.target.getAttribute('style'));
      }
      if (mutation.type === 'childList') {
        console.log("🔄 Child elements changed in:", mutation.target);
      }
    });
  });
  
  // Observe the tab container and its children
  observer.observe(document.body, {
    attributes: true,
    childList: true,
    subtree: true,
    attributeFilter: ['style', 'class']
  });
  
  console.log("👀 Mutation observer set up");
}

// Check initial state
document.addEventListener('DOMContentLoaded', function() {
  console.log("📋 DOM loaded, checking initial tab styles...");
  checkTabContainerStyles();
  setupMutationObserver();
});

// Override calculateAll to check styles before and after
const originalCalculateAll = window.calculateAll;
if (originalCalculateAll) {
  window.calculateAll = function() {
    console.log("🔍 BEFORE calculateAll:");
    checkTabContainerStyles();
    
    // Call original function
    originalCalculateAll.apply(this, arguments);
    
    // Check styles after calculation (with small delay)
    setTimeout(() => {
      console.log("🔍 AFTER calculateAll:");
      checkTabContainerStyles();
    }, 100);
  };
}

// Add window resize listener to check if that affects scrolling
window.addEventListener('resize', function() {
  console.log("🔄 Window resized, checking tab styles:");
  checkTabContainerStyles();
});

// Function to force tab scrolling to work
function forceTabScrolling() {
  const tabContainer = document.querySelector('.tab-container');
  const tabs = document.querySelector('.tabs');
  
  if (tabContainer && tabs) {
    // Force the styles
    tabContainer.style.overflowX = 'auto';
    tabContainer.style.whiteSpace = 'nowrap';
    tabs.style.display = 'inline-flex';
    tabs.style.minWidth = 'max-content';
    tabs.style.flexWrap = 'nowrap';
    
    // Force layout recalculation
    tabContainer.offsetHeight;
    
    console.log("🔧 Forced tab scrolling styles");
  }
}

// Call force function after a delay when calculations complete
const originalHideLoadingIndicator = window.workerManager?.hideLoadingIndicator;
if (originalHideLoadingIndicator && window.workerManager) {
  window.workerManager.hideLoadingIndicator = function() {
    originalHideLoadingIndicator.call(this);
    setTimeout(forceTabScrolling, 50);
  };
}