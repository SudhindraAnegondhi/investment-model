// Scenario Manager
// Handles saving, loading, and managing investment scenarios

class ScenarioManager {
  constructor() {
    this.scenarios = new Map();
    this.currentScenario = null;
    this.storageKey = 'rental-investment-scenarios';
    this.loadScenariosFromStorage();
  }

  // Save current scenario
  saveScenario(name, description = '') {
    if (!name || name.trim() === '') {
      throw new Error('Scenario name is required');
    }

    const params = utils.getInputParameters();
    const results = utils.calculationResults;

    if (!results) {
      throw new Error('No calculation results to save. Please run calculations first.');
    }

    const scenario = {
      id: this.generateId(),
      name: name.trim(),
      description: description.trim(),
      parameters: { ...params },
      results: this.serializeResults(results),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.scenarios.set(scenario.id, scenario);
    this.saveToStorage();
    this.updateScenariosList();

    return scenario.id;
  }

  // Load scenario by ID
  loadScenario(scenarioId) {
    const scenario = this.scenarios.get(scenarioId);
    if (!scenario) {
      throw new Error('Scenario not found');
    }

    // Load parameters into form
    this.loadParametersIntoForm(scenario.parameters);

    // Store results
    utils.calculationResults = this.deserializeResults(scenario.results);

    // Update UI
    uiManager.updateAllTables();
    
    // Update charts if available
    if (window.chartManager) {
      chartManager.initializeCharts(utils.calculationResults);
    }

    this.currentScenario = scenario;
    this.updateCurrentScenarioDisplay();

    return scenario;
  }

  // Update existing scenario
  updateScenario(scenarioId, name, description = '') {
    const scenario = this.scenarios.get(scenarioId);
    if (!scenario) {
      throw new Error('Scenario not found');
    }

    const params = utils.getInputParameters();
    const results = utils.calculationResults;

    if (!results) {
      throw new Error('No calculation results to save. Please run calculations first.');
    }

    scenario.name = name.trim();
    scenario.description = description.trim();
    scenario.parameters = { ...params };
    scenario.results = this.serializeResults(results);
    scenario.updatedAt = new Date().toISOString();

    this.scenarios.set(scenarioId, scenario);
    this.saveToStorage();
    this.updateScenariosList();

    return scenario;
  }

  // Delete scenario
  deleteScenario(scenarioId) {
    const scenario = this.scenarios.get(scenarioId);
    if (!scenario) {
      throw new Error('Scenario not found');
    }

    this.scenarios.delete(scenarioId);
    this.saveToStorage();
    this.updateScenariosList();

    if (this.currentScenario && this.currentScenario.id === scenarioId) {
      this.currentScenario = null;
      this.updateCurrentScenarioDisplay();
    }

    return true;
  }

  // Duplicate scenario
  duplicateScenario(scenarioId, newName) {
    const scenario = this.scenarios.get(scenarioId);
    if (!scenario) {
      throw new Error('Scenario not found');
    }

    const duplicate = {
      ...scenario,
      id: this.generateId(),
      name: newName || `${scenario.name} (Copy)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.scenarios.set(duplicate.id, duplicate);
    this.saveToStorage();
    this.updateScenariosList();

    return duplicate.id;
  }

  // Compare scenarios
  compareScenarios(scenarioIds) {
    const scenarios = scenarioIds.map(id => this.scenarios.get(id)).filter(Boolean);
    
    if (scenarios.length < 2) {
      throw new Error('At least 2 scenarios required for comparison');
    }

    return this.createComparisonReport(scenarios);
  }

  // Get all scenarios
  getAllScenarios() {
    return Array.from(this.scenarios.values()).sort((a, b) => 
      new Date(b.updatedAt) - new Date(a.updatedAt)
    );
  }

  // Export scenarios to JSON
  exportScenarios(scenarioIds = null) {
    let scenariosToExport;
    
    if (scenarioIds) {
      scenariosToExport = scenarioIds.map(id => this.scenarios.get(id)).filter(Boolean);
    } else {
      scenariosToExport = Array.from(this.scenarios.values());
    }

    const exportData = {
      version: '1.0',
      exportDate: new Date().toISOString(),
      scenarios: scenariosToExport
    };

    return JSON.stringify(exportData, null, 2);
  }

  // Import scenarios from JSON
  importScenarios(jsonData, options = {}) {
    let data;
    try {
      data = JSON.parse(jsonData);
    } catch (error) {
      throw new Error('Invalid JSON format');
    }

    if (!data.scenarios || !Array.isArray(data.scenarios)) {
      throw new Error('Invalid scenario data format');
    }

    const imported = [];
    const errors = [];

    data.scenarios.forEach((scenario, index) => {
      try {
        // Generate new ID if scenario with same ID exists
        let newId = scenario.id;
        if (this.scenarios.has(newId) || options.generateNewIds) {
          newId = this.generateId();
        }

        const importedScenario = {
          ...scenario,
          id: newId,
          importedAt: new Date().toISOString()
        };

        // Add suffix to name if duplicate exists
        if (options.renameDuplicates) {
          const existingNames = Array.from(this.scenarios.values()).map(s => s.name);
          if (existingNames.includes(importedScenario.name)) {
            importedScenario.name += ` (Imported)`;
          }
        }

        this.scenarios.set(newId, importedScenario);
        imported.push(importedScenario);
      } catch (error) {
        errors.push({ index, name: scenario.name || 'Unknown', error: error.message });
      }
    });

    this.saveToStorage();
    this.updateScenariosList();

    return { imported, errors };
  }

  // Create comparison report
  createComparisonReport(scenarios) {
    const report = {
      scenarios: scenarios.map(s => ({
        id: s.id,
        name: s.name,
        parameters: s.parameters
      })),
      comparison: {
        finalNetWorth: {},
        finalCashFlow: {},
        breakEvenPoint: {},
        totalROI: {}
      }
    };

    scenarios.forEach(scenario => {
      const results = this.deserializeResults(scenario.results);
      const finalYear = results.selfFinanced[14];
      
      report.comparison.finalNetWorth[scenario.id] = finalYear.netWorth;
      report.comparison.finalCashFlow[scenario.id] = finalYear.cumulativeCashFlow;
      report.comparison.totalROI[scenario.id] = this.calculateROI(results.selfFinanced, scenario.parameters);
      
      // Find break-even point
      const breakEven = results.selfFinanced.findIndex(year => year.cumulativeCashFlow > 0);
      report.comparison.breakEvenPoint[scenario.id] = breakEven >= 0 ? breakEven + 1 : null;
    });

    return report;
  }

  // Load parameters into form
  loadParametersIntoForm(parameters) {
    Object.keys(parameters).forEach(key => {
      const element = document.getElementById(key);
      if (element) {
        if (element.type === 'number') {
          element.value = parameters[key];
        } else if (element.tagName === 'SELECT') {
          element.value = parameters[key];
        } else if (element.type === 'checkbox') {
          element.checked = parameters[key];
        }
        
        // Trigger change event to update any dependent fields
        element.dispatchEvent(new Event('change', { bubbles: true }));
      }
    });
  }

  // Serialize results for storage
  serializeResults(results) {
    return {
      selfFinanced: results.selfFinanced,
      financed: results.financed,
      comparison: results.comparison,
      inputParams: results.inputParams,
      detailedData: results.detailedData
    };
  }

  // Deserialize results from storage
  deserializeResults(serializedResults) {
    const results = new dataModel.CalculationResults();
    results.selfFinanced = serializedResults.selfFinanced;
    results.financed = serializedResults.financed;
    results.comparison = serializedResults.comparison;
    results.inputParams = serializedResults.inputParams;
    results.detailedData = serializedResults.detailedData;
    return results;
  }

  // Save to localStorage
  saveToStorage() {
    try {
      const data = {
        version: '1.0',
        lastUpdated: new Date().toISOString(),
        scenarios: Array.from(this.scenarios.entries())
      };
      localStorage.setItem(this.storageKey, JSON.stringify(data));
    } catch (error) {
      console.error('Failed to save scenarios to storage:', error);
      throw new Error('Failed to save scenarios. Storage may be full.');
    }
  }

  // Load from localStorage
  loadScenariosFromStorage() {
    try {
      const data = localStorage.getItem(this.storageKey);
      if (data) {
        const parsed = JSON.parse(data);
        if (parsed.scenarios && Array.isArray(parsed.scenarios)) {
          this.scenarios = new Map(parsed.scenarios);
        }
      }
    } catch (error) {
      console.error('Failed to load scenarios from storage:', error);
      this.scenarios = new Map();
    }
  }

  // Generate unique ID
  generateId() {
    return 'scenario_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
  }

  // Calculate ROI
  calculateROI(yearlyData, params) {
    const totalInvested = params.annualBudget * params.selfPurchaseYears;
    const finalNetWorth = yearlyData[yearlyData.length - 1].netWorth;
    return ((finalNetWorth - totalInvested) / totalInvested) * 100;
  }

  // Update scenarios list UI
  updateScenariosList() {
    const container = document.getElementById('scenarios-list');
    if (!container) return;

    const scenarios = this.getAllScenarios();
    
    if (scenarios.length === 0) {
      container.innerHTML = '<div class="no-scenarios">No saved scenarios</div>';
      return;
    }

    let html = '<div class="scenarios-grid">';
    
    scenarios.forEach(scenario => {
      const isActive = this.currentScenario && this.currentScenario.id === scenario.id;
      const createdDate = new Date(scenario.createdAt).toLocaleDateString();
      const updatedDate = new Date(scenario.updatedAt).toLocaleDateString();
      
      html += `
        <div class="scenario-card ${isActive ? 'active' : ''}" data-scenario-id="${scenario.id}">
          <div class="scenario-header">
            <h4 class="scenario-name">${this.escapeHtml(scenario.name)}</h4>
            <div class="scenario-actions">
              <button class="btn-icon" onclick="scenarioManager.loadScenario('${scenario.id}')" title="Load Scenario">
                📁
              </button>
              <button class="btn-icon" onclick="scenarioManager.showEditDialog('${scenario.id}')" title="Edit Scenario">
                ✏️
              </button>
              <button class="btn-icon" onclick="scenarioManager.duplicateScenario('${scenario.id}')" title="Duplicate Scenario">
                📋
              </button>
              <button class="btn-icon" onclick="scenarioManager.confirmDelete('${scenario.id}')" title="Delete Scenario">
                🗑️
              </button>
            </div>
          </div>
          <div class="scenario-info">
            <div class="scenario-description">${this.escapeHtml(scenario.description) || 'No description'}</div>
            <div class="scenario-meta">
              <div>Created: ${createdDate}</div>
              <div>Updated: ${updatedDate}</div>
            </div>
          </div>
          <div class="scenario-preview">
            <div class="preview-metric">
              <span class="metric-label">Annual Budget:</span>
              <span class="metric-value">$${scenario.parameters.annualBudget?.toLocaleString()}</span>
            </div>
            <div class="preview-metric">
              <span class="metric-label">Property Cost:</span>
              <span class="metric-value">$${scenario.parameters.initialCost?.toLocaleString()}</span>
            </div>
          </div>
        </div>
      `;
    });
    
    html += '</div>';
    container.innerHTML = html;
  }

  // Update current scenario display
  updateCurrentScenarioDisplay() {
    const display = document.getElementById('current-scenario');
    if (!display) return;

    if (this.currentScenario) {
      display.innerHTML = `
        <div class="current-scenario-info">
          <span class="scenario-indicator">📁</span>
          <span class="scenario-name">${this.escapeHtml(this.currentScenario.name)}</span>
          <button class="btn-small" onclick="scenarioManager.clearCurrentScenario()">Clear</button>
        </div>
      `;
      display.style.display = 'block';
    } else {
      display.style.display = 'none';
    }
  }

  // Clear current scenario
  clearCurrentScenario() {
    this.currentScenario = null;
    this.updateCurrentScenarioDisplay();
    this.updateScenariosList();
  }

  // Show save dialog
  showSaveDialog() {
    const dialog = document.createElement('div');
    dialog.className = 'modal-overlay';
    dialog.innerHTML = `
      <div class="modal scenario-dialog">
        <div class="modal-header">
          <h3>Save Scenario</h3>
          <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label for="scenario-name">Scenario Name *</label>
            <input type="text" id="scenario-name" placeholder="Enter scenario name" required>
          </div>
          <div class="form-group">
            <label for="scenario-description">Description</label>
            <textarea id="scenario-description" placeholder="Optional description" rows="3"></textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
          <button class="btn btn-primary" onclick="scenarioManager.handleSave()">Save Scenario</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(dialog);
    document.getElementById('scenario-name').focus();
  }

  // Handle save from dialog
  handleSave() {
    const nameInput = document.getElementById('scenario-name');
    const descriptionInput = document.getElementById('scenario-description');
    
    const name = nameInput.value.trim();
    const description = descriptionInput.value.trim();

    if (!name) {
      nameInput.focus();
      return;
    }

    try {
      this.saveScenario(name, description);
      document.querySelector('.modal-overlay').remove();
      this.showSuccess(`Scenario "${name}" saved successfully`);
    } catch (error) {
      this.showError(error.message);
    }
  }

  // Show edit dialog
  showEditDialog(scenarioId) {
    const scenario = this.scenarios.get(scenarioId);
    if (!scenario) return;

    const dialog = document.createElement('div');
    dialog.className = 'modal-overlay';
    dialog.innerHTML = `
      <div class="modal scenario-dialog">
        <div class="modal-header">
          <h3>Edit Scenario</h3>
          <button class="modal-close" onclick="this.closest('.modal-overlay').remove()">&times;</button>
        </div>
        <div class="modal-body">
          <div class="form-group">
            <label for="edit-scenario-name">Scenario Name *</label>
            <input type="text" id="edit-scenario-name" value="${this.escapeHtml(scenario.name)}" required>
          </div>
          <div class="form-group">
            <label for="edit-scenario-description">Description</label>
            <textarea id="edit-scenario-description" rows="3">${this.escapeHtml(scenario.description)}</textarea>
          </div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-secondary" onclick="this.closest('.modal-overlay').remove()">Cancel</button>
          <button class="btn btn-primary" onclick="scenarioManager.handleEdit('${scenarioId}')">Update Scenario</button>
        </div>
      </div>
    `;
    
    document.body.appendChild(dialog);
    document.getElementById('edit-scenario-name').focus();
  }

  // Handle edit from dialog
  handleEdit(scenarioId) {
    const nameInput = document.getElementById('edit-scenario-name');
    const descriptionInput = document.getElementById('edit-scenario-description');
    
    const name = nameInput.value.trim();
    const description = descriptionInput.value.trim();

    if (!name) {
      nameInput.focus();
      return;
    }

    try {
      this.updateScenario(scenarioId, name, description);
      document.querySelector('.modal-overlay').remove();
      this.showSuccess(`Scenario "${name}" updated successfully`);
    } catch (error) {
      this.showError(error.message);
    }
  }

  // Confirm delete
  confirmDelete(scenarioId) {
    const scenario = this.scenarios.get(scenarioId);
    if (!scenario) return;

    if (confirm(`Are you sure you want to delete scenario "${scenario.name}"? This action cannot be undone.`)) {
      try {
        this.deleteScenario(scenarioId);
        this.showSuccess(`Scenario "${scenario.name}" deleted successfully`);
      } catch (error) {
        this.showError(error.message);
      }
    }
  }

  // Utility methods
  escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
  }

  showSuccess(message) {
    if (window.workerManager) {
      workerManager.showSuccess(message);
    } else {
      alert(message);
    }
  }

  showError(message) {
    if (window.workerManager) {
      workerManager.showError(message);
    } else {
      alert('Error: ' + message);
    }
  }
}

// Global scenario manager instance
window.scenarioManager = new ScenarioManager();