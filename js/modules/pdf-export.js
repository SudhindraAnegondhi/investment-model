// PDF Export Module
// Generates comprehensive PDF reports using jsPDF

class PDFExporter {
  constructor() {
    this.doc = null;
    this.currentY = 20;
    this.pageWidth = 210; // A4 width in mm
    this.pageHeight = 297; // A4 height in mm
    this.margin = 20;
    this.lineHeight = 6;
    this.colors = {
      primary: '#667eea',
      secondary: '#764ba2',
      success: '#4CAF50',
      danger: '#F44336',
      dark: '#333333',
      light: '#666666'
    };
  }

  // Main export function
  exportToPDF(results, params, options = {}) {
    if (!window.jsPDF) {
      throw new Error('jsPDF library is not loaded. Please include jsPDF in your HTML.');
    }

    // Initialize jsPDF
    this.doc = new jsPDF('p', 'mm', 'a4');
    this.currentY = this.margin;

    try {
      // Generate report sections
      this.addHeader(options.title || 'Rental Property Investment Analysis');
      this.addExecutiveSummary(results, params);
      this.addInputParameters(params);
      this.addCashFlowAnalysis(results);
      this.addNetWorthAnalysis(results);
      this.addComparisonSummary(results);
      this.addDetailedTables(results);
      this.addFooter();

      // Return PDF blob or save
      if (options.returnBlob) {
        return this.doc.output('blob');
      } else {
        const filename = options.filename || `Investment_Analysis_${new Date().toISOString().split('T')[0]}.pdf`;
        this.doc.save(filename);
        return true;
      }
    } catch (error) {
      console.error('PDF generation error:', error);
      throw new Error('Failed to generate PDF: ' + error.message);
    }
  }

  // Add report header
  addHeader(title) {
    // Title
    this.doc.setFontSize(20);
    this.doc.setTextColor(this.hexToRgb(this.colors.primary));
    this.doc.text(title, this.margin, this.currentY);
    this.currentY += 10;

    // Subtitle
    this.doc.setFontSize(12);
    this.doc.setTextColor(this.hexToRgb(this.colors.light));
    this.doc.text(`Generated on ${new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    })}`, this.margin, this.currentY);
    this.currentY += 15;

    // Horizontal line
    this.addHorizontalLine();
    this.currentY += 10;
  }

  // Add executive summary
  addExecutiveSummary(results, params) {
    this.addSectionHeader('Executive Summary');

    const finalYear = results.selfFinanced.length - 1;
    const selfFinal = results.selfFinanced[finalYear];
    const financedFinal = results.financed[finalYear];

    const summary = [
      {
        strategy: 'Self-Financed Strategy',
        netWorth: selfFinal.netWorth,
        cashFlow: selfFinal.cumulativeCashFlow,
        units: selfFinal.units,
        roi: this.calculateROI(results.selfFinanced, params)
      },
      {
        strategy: 'Bank-Financed Strategy', 
        netWorth: financedFinal.netWorth,
        cashFlow: financedFinal.cumulativeCashFlow,
        units: financedFinal.units,
        roi: this.calculateROI(results.financed, params)
      }
    ];

    // Summary table
    const tableData = [
      ['Strategy', 'Net Worth (15yr)', 'Cash Flow (15yr)', 'Total Units', 'ROI'],
      ...summary.map(s => [
        s.strategy,
        this.formatCurrency(s.netWorth),
        this.formatCurrency(s.cashFlow),
        s.units.toString(),
        s.roi.toFixed(1) + '%'
      ])
    ];

    this.addTable(tableData, { 
      headerColor: this.colors.primary,
      alternateRows: true 
    });

    // Key insights
    this.currentY += 10;
    this.addSubheader('Key Insights');
    
    const insights = this.generateInsights(results);
    insights.forEach(insight => {
      this.addBulletPoint(insight);
    });

    this.checkPageBreak(30);
  }

  // Add input parameters section
  addInputParameters(params) {
    this.addSectionHeader('Investment Parameters');

    const paramGroups = [
      {
        title: 'Property Details',
        params: [
          ['Initial Property Cost', this.formatCurrency(params.initialCost)],
          ['Annual Budget', this.formatCurrency(params.annualBudget)],
          ['Rental Rate', params.rentalRate + '% of property value'],
          ['Property Appreciation', params.appreciationRate + '% annually']
        ]
      },
      {
        title: 'Financing Options',
        params: [
          ['Interest Rate', params.interestRate + '% annually'],
          ['LTV Ratio', params.ltvRatio + '%'],
          ['Loan Term', params.loanTerm + ' years'],
          ['Max Units Financed', params.maxUnitsFinanced + ' per year']
        ]
      },
      {
        title: 'Operating Assumptions',
        params: [
          ['Vacancy Rate', params.vacancyRate + '%'],
          ['Management Fee', params.managementRate + '%'],
          ['Maintenance Rate', params.maintenanceRate + '% of property value'],
          ['CapEx Reserve', params.capexRate + '% of property value']
        ]
      }
    ];

    paramGroups.forEach(group => {
      this.addSubheader(group.title);
      const tableData = [['Parameter', 'Value'], ...group.params];
      this.addTable(tableData, { 
        headerColor: this.colors.secondary,
        columnWidths: [80, 60] 
      });
      this.currentY += 8;
    });

    this.checkPageBreak(40);
  }

  // Add cash flow analysis
  addCashFlowAnalysis(results) {
    this.addSectionHeader('Cash Flow Analysis');

    // Summary metrics
    const selfCF = results.selfFinanced.map(y => y.cashFlow);
    const financedCF = results.financed.map(y => y.cashFlow);

    const cfSummary = [
      ['Metric', 'Self-Financed', 'Bank-Financed'],
      ['Average Annual Cash Flow', this.formatCurrency(this.average(selfCF)), this.formatCurrency(this.average(financedCF))],
      ['Total Cumulative Cash Flow', this.formatCurrency(results.selfFinanced[14].cumulativeCashFlow), this.formatCurrency(results.financed[14].cumulativeCashFlow)],
      ['Positive Cash Flow Years', selfCF.filter(cf => cf > 0).length.toString(), financedCF.filter(cf => cf > 0).length.toString()],
      ['Break-Even Year', this.findBreakEven(results.selfFinanced), this.findBreakEven(results.financed)]
    ];

    this.addTable(cfSummary, { 
      headerColor: this.colors.success,
      columnWidths: [60, 50, 50] 
    });

    this.checkPageBreak(50);
  }

  // Add net worth analysis
  addNetWorthAnalysis(results) {
    this.addSectionHeader('Net Worth Analysis');

    const netWorthData = [
      ['Year', 'Self-Financed Net Worth', 'Bank-Financed Net Worth', 'Difference'],
      ...results.selfFinanced.map((selfData, index) => [
        `Year ${index + 1}`,
        this.formatCurrency(selfData.netWorth),
        this.formatCurrency(results.financed[index].netWorth),
        this.formatCurrency(selfData.netWorth - results.financed[index].netWorth)
      ]).filter((_, index) => index % 3 === 0 || index === 14) // Show every 3rd year + final year
    ];

    this.addTable(netWorthData, { 
      headerColor: this.colors.primary,
      columnWidths: [25, 45, 45, 45] 
    });

    this.checkPageBreak(40);
  }

  // Add comparison summary
  addComparisonSummary(results) {
    this.addSectionHeader('Strategy Comparison');

    const comparison = results.comparison[14]; // Final year comparison
    const comparisonData = [
      ['Metric', 'Difference (Self - Financed)', 'Winner'],
      ['Final Net Worth', this.formatCurrency(comparison.netWorthDiff), comparison.netWorthDiff > 0 ? 'Self-Financed' : 'Bank-Financed'],
      ['Cumulative Cash Flow', this.formatCurrency(comparison.cumulativeCFDiff), comparison.cumulativeCFDiff > 0 ? 'Self-Financed' : 'Bank-Financed'],
      ['Total Units Owned', comparison.unitsDiff.toString() + ' units', comparison.unitsDiff > 0 ? 'Self-Financed' : 'Bank-Financed']
    ];

    this.addTable(comparisonData, { 
      headerColor: this.colors.secondary,
      columnWidths: [50, 60, 50] 
    });

    this.checkPageBreak(30);
  }

  // Add detailed tables
  addDetailedTables(results) {
    this.addSectionHeader('Detailed Year-by-Year Analysis');

    // Self-financed table
    this.addSubheader('Self-Financed Strategy');
    const selfData = [
      ['Year', 'Units', 'Cash Flow', 'Cumulative CF', 'Net Worth'],
      ...results.selfFinanced.map((data, index) => [
        (index + 1).toString(),
        data.units.toString(),
        this.formatCurrency(data.cashFlow),
        this.formatCurrency(data.cumulativeCashFlow),
        this.formatCurrency(data.netWorth)
      ])
    ];

    this.addTable(selfData, { 
      headerColor: this.colors.success,
      fontSize: 8,
      columnWidths: [20, 20, 35, 40, 40]
    });

    this.checkPageBreak(50);

    // Bank-financed table
    this.addSubheader('Bank-Financed Strategy');
    const financedData = [
      ['Year', 'Units', 'Cash Flow', 'Cumulative CF', 'Net Worth', 'Loan Balance'],
      ...results.financed.map((data, index) => [
        (index + 1).toString(),
        data.units.toString(),
        this.formatCurrency(data.cashFlow),
        this.formatCurrency(data.cumulativeCashFlow),
        this.formatCurrency(data.netWorth),
        this.formatCurrency(data.loanBalance)
      ])
    ];

    this.addTable(financedData, { 
      headerColor: this.colors.primary,
      fontSize: 8,
      columnWidths: [15, 15, 30, 35, 35, 35]
    });
  }

  // Add footer
  addFooter() {
    const pageCount = this.doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      this.doc.setPage(i);
      this.doc.setFontSize(8);
      this.doc.setTextColor(this.hexToRgb(this.colors.light));
      this.doc.text(`Page ${i} of ${pageCount}`, this.pageWidth - this.margin - 20, this.pageHeight - 10);
      this.doc.text('Generated by Rental Investment Analyzer', this.margin, this.pageHeight - 10);
    }
  }

  // Helper methods
  addSectionHeader(title) {
    this.checkPageBreak(25);
    this.doc.setFontSize(16);
    this.doc.setTextColor(this.hexToRgb(this.colors.primary));
    this.doc.text(title, this.margin, this.currentY);
    this.currentY += 8;
    this.addHorizontalLine();
    this.currentY += 8;
  }

  addSubheader(title) {
    this.checkPageBreak(15);
    this.doc.setFontSize(12);
    this.doc.setTextColor(this.hexToRgb(this.colors.dark));
    this.doc.text(title, this.margin, this.currentY);
    this.currentY += 8;
  }

  addBulletPoint(text) {
    this.checkPageBreak(8);
    this.doc.setFontSize(10);
    this.doc.setTextColor(this.hexToRgb(this.colors.dark));
    this.doc.text('• ' + text, this.margin + 5, this.currentY);
    this.currentY += this.lineHeight;
  }

  addTable(data, options = {}) {
    const {
      headerColor = this.colors.primary,
      fontSize = 10,
      columnWidths = null,
      alternateRows = false
    } = options;

    const startY = this.currentY;
    const rowHeight = 8;
    const cellPadding = 2;

    // Calculate column widths if not provided
    let colWidths = columnWidths;
    if (!colWidths) {
      const availableWidth = this.pageWidth - 2 * this.margin;
      const colCount = data[0].length;
      colWidths = Array(colCount).fill(availableWidth / colCount);
    }

    // Draw table
    data.forEach((row, rowIndex) => {
      this.checkPageBreak(rowHeight + 5);
      
      const isHeader = rowIndex === 0;
      const y = this.currentY;

      // Row background
      if (isHeader) {
        this.doc.setFillColor(this.hexToRgb(headerColor));
        this.doc.rect(this.margin, y - rowHeight + cellPadding, this.pageWidth - 2 * this.margin, rowHeight, 'F');
      } else if (alternateRows && rowIndex % 2 === 0) {
        this.doc.setFillColor(245, 245, 245);
        this.doc.rect(this.margin, y - rowHeight + cellPadding, this.pageWidth - 2 * this.margin, rowHeight, 'F');
      }

      // Cell content
      let x = this.margin;
      row.forEach((cell, colIndex) => {
        this.doc.setFontSize(fontSize);
        this.doc.setTextColor(isHeader ? 255 : this.hexToRgb(this.colors.dark));
        this.doc.text(cell.toString(), x + cellPadding, y, { maxWidth: colWidths[colIndex] - 2 * cellPadding });
        x += colWidths[colIndex];
      });

      this.currentY += rowHeight;
    });

    // Table border
    this.doc.setDrawColor(200);
    this.doc.rect(this.margin, startY - rowHeight + cellPadding, this.pageWidth - 2 * this.margin, (data.length * rowHeight));

    this.currentY += 5;
  }

  addHorizontalLine() {
    this.doc.setDrawColor(this.hexToRgb(this.colors.light));
    this.doc.line(this.margin, this.currentY, this.pageWidth - this.margin, this.currentY);
  }

  checkPageBreak(spaceNeeded) {
    if (this.currentY + spaceNeeded > this.pageHeight - this.margin) {
      this.doc.addPage();
      this.currentY = this.margin;
    }
  }

  // Utility functions
  formatCurrency(value) {
    if (Math.abs(value) >= 1000000) {
      return '$' + (value / 1000000).toFixed(1) + 'M';
    } else if (Math.abs(value) >= 1000) {
      return '$' + (value / 1000).toFixed(0) + 'K';
    } else {
      return '$' + Math.round(value).toLocaleString();
    }
  }

  calculateROI(yearlyData, params) {
    const totalInvested = params.annualBudget * params.selfPurchaseYears;
    const finalNetWorth = yearlyData[yearlyData.length - 1].netWorth;
    return ((finalNetWorth - totalInvested) / totalInvested) * 100;
  }

  average(arr) {
    return arr.reduce((a, b) => a + b, 0) / arr.length;
  }

  findBreakEven(yearlyData) {
    const breakEvenIndex = yearlyData.findIndex(year => year.cumulativeCashFlow > 0);
    return breakEvenIndex >= 0 ? `Year ${breakEvenIndex + 1}` : 'Not within 15 years';
  }

  generateInsights(results) {
    const insights = [];
    const finalSelf = results.selfFinanced[14];
    const finalFinanced = results.financed[14];

    // Net worth comparison
    if (finalSelf.netWorth > finalFinanced.netWorth) {
      insights.push(`Self-financed strategy results in ${this.formatCurrency(finalSelf.netWorth - finalFinanced.netWorth)} higher net worth after 15 years`);
    } else {
      insights.push(`Bank-financed strategy results in ${this.formatCurrency(finalFinanced.netWorth - finalSelf.netWorth)} higher net worth after 15 years`);
    }

    // Cash flow comparison
    if (finalSelf.cumulativeCashFlow > finalFinanced.cumulativeCashFlow) {
      insights.push(`Self-financed strategy generates ${this.formatCurrency(finalSelf.cumulativeCashFlow - finalFinanced.cumulativeCashFlow)} more cumulative cash flow`);
    } else {
      insights.push(`Bank-financed strategy generates ${this.formatCurrency(finalFinanced.cumulativeCashFlow - finalSelf.cumulativeCashFlow)} more cumulative cash flow`);
    }

    // Break-even analysis
    const selfBreakEven = results.selfFinanced.findIndex(year => year.cumulativeCashFlow > 0);
    const financedBreakEven = results.financed.findIndex(year => year.cumulativeCashFlow > 0);
    
    if (selfBreakEven >= 0 && financedBreakEven >= 0) {
      if (selfBreakEven < financedBreakEven) {
        insights.push(`Self-financed strategy breaks even ${financedBreakEven - selfBreakEven} years earlier`);
      } else if (financedBreakEven < selfBreakEven) {
        insights.push(`Bank-financed strategy breaks even ${selfBreakEven - financedBreakEven} years earlier`);
      }
    }

    // Units comparison
    if (finalSelf.units !== finalFinanced.units) {
      const diff = Math.abs(finalSelf.units - finalFinanced.units);
      const winner = finalSelf.units > finalFinanced.units ? 'Self-financed' : 'Bank-financed';
      insights.push(`${winner} strategy acquires ${diff} more properties over 15 years`);
    }

    return insights;
  }

  hexToRgb(hex) {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? {
      r: parseInt(result[1], 16),
      g: parseInt(result[2], 16),
      b: parseInt(result[3], 16)
    } : { r: 0, g: 0, b: 0 };
  }
}

// Export PDF generation functions
window.pdfExporter = new PDFExporter();

// Convenience function for quick export
window.exportCurrentResultsToPDF = function(filename = null) {
  if (!utils.calculationResults) {
    alert('No calculation results available. Please run calculations first.');
    return;
  }

  try {
    const params = utils.getInputParameters();
    pdfExporter.exportToPDF(utils.calculationResults, params, { filename });
  } catch (error) {
    console.error('PDF export error:', error);
    alert('Failed to export PDF: ' + error.message);
  }
};