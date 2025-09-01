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

  // Comprehensive text cleaning utility for PDF compatibility
  cleanText(text) {
    if (!text && text !== 0) return '';
    
    let cleanText = String(text || '');
    
    // Remove all Unicode emojis and symbols that cause encoding issues
    cleanText = cleanText
      // Remove all emoji ranges
      .replace(/[\u{1F300}-\u{1F9FF}]/gu, '') // Miscellaneous Symbols and Pictographs
      .replace(/[\u{1F600}-\u{1F64F}]/gu, '') // Emoticons
      .replace(/[\u{1F680}-\u{1F6FF}]/gu, '') // Transport and Map Symbols
      .replace(/[\u{2600}-\u{26FF}]/gu, '') // Miscellaneous Symbols
      .replace(/[\u{2700}-\u{27BF}]/gu, '') // Dingbats
      .replace(/[\u{1F900}-\u{1F9FF}]/gu, '') // Supplemental Symbols and Pictographs
      .replace(/[\u{1F1E0}-\u{1F1FF}]/gu, '') // Regional Indicators
      .replace(/[\u{FE00}-\u{FE0F}]/gu, '') // Variation Selectors
      .replace(/[\u{200D}]/gu, '') // Zero Width Joiner
      .replace(/[\u{20E3}]/gu, '') // Combining Enclosing Keycap
      
      // Remove problematic Unicode characters
      .replace(/[^\u0020-\u007E\u00A0-\u00FF]/g, '') // Keep only basic Latin + Latin-1 supplement
      .replace(/[\u0080-\u009F]/g, '') // Remove C1 control characters
      .replace(/[\u00AD]/g, '') // Remove soft hyphen
      
      // Clean up control characters and normalize whitespace
      .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '') // Remove control chars
      .replace(/\s+/g, ' ') // Normalize whitespace
      .trim();
    
    // If text becomes empty after cleaning, provide a fallback
    if (!cleanText && text) {
      cleanText = 'Content removed for PDF compatibility';
    }
    
    return cleanText;
  }

  // Font initialization for better compatibility
  initializeFonts() {
    if (this.doc) {
      try {
        // Set safe, standard fonts
        this.doc.setFont('helvetica', 'normal');
      } catch (error) {
        console.warn('Font initialization warning:', error);
        // Fallback - use default font
      }
    }
  }

  // Main export function
  exportToPDF(results, params, options = {}) {
    // Use universal jsPDF detection
    const jsPDFClass = window.getjsPDFClass();
    if (!jsPDFClass) {
      throw new Error('jsPDF library is not loaded. Please include jsPDF in your HTML.');
    }

    // Initialize jsPDF
    this.doc = new jsPDFClass('p', 'mm', 'a4');
    this.currentY = this.margin;
    
    // Initialize safe fonts
    this.initializeFonts();

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
    this.setTextColorSafe(this.colors.primary);
    this.doc.text(title, this.margin, this.currentY);
    this.currentY += 10;

    // Subtitle
    this.doc.setFontSize(12);
    this.setTextColorSafe(this.colors.light);
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
      this.setTextColorSafe(this.colors.light);
      this.doc.text(`Page ${i} of ${pageCount}`, this.pageWidth - this.margin - 20, this.pageHeight - 10);
      this.doc.text('Generated by Rental Investment Analyzer', this.margin, this.pageHeight - 10);
    }
  }

  // Helper methods
  addSectionHeader(title) {
    this.checkPageBreak(25);
    this.doc.setFontSize(16);
    this.setTextColorSafe(this.colors.primary);
    
    const cleanTitle = this.cleanText(title);
    
    this.doc.text(cleanTitle, this.margin, this.currentY);
    this.currentY += 8;
    this.addHorizontalLine();
    this.currentY += 8;
  }

  addSubheader(title) {
    this.checkPageBreak(15);
    this.doc.setFontSize(12);
    this.setTextColorSafe(this.colors.dark);
    
    const cleanTitle = this.cleanText(title);
    
    this.doc.text(cleanTitle, this.margin, this.currentY);
    this.currentY += 8;
  }

  addBulletPoint(text) {
    this.checkPageBreak(8);
    this.doc.setFontSize(10);
    this.setTextColorSafe(this.colors.dark);
    
    const cleanTextOnly = this.cleanText(text);
    const bulletText = '• ' + cleanTextOnly;
    
    try {
      const lines = this.doc.splitTextToSize(bulletText, this.pageWidth - 2 * this.margin - 10);
      this.doc.text(lines, this.margin + 5, this.currentY);
      this.currentY += Math.max(lines.length * this.lineHeight, this.lineHeight);
    } catch (error) {
      console.warn('Bullet point rendering error, using fallback:', error);
      this.doc.text(bulletText.substring(0, 80), this.margin + 5, this.currentY);
      this.currentY += this.lineHeight;
    }
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
        const headerRgb = this.hexToRgb(headerColor);
        this.setFillColorSafe(headerRgb.r, headerRgb.g, headerRgb.b);
        this.doc.rect(this.margin, y - rowHeight + cellPadding, this.pageWidth - 2 * this.margin, rowHeight, 'F');
      } else if (alternateRows && rowIndex % 2 === 0) {
        this.setFillColorSafe(245, 245, 245);
        this.doc.rect(this.margin, y - rowHeight + cellPadding, this.pageWidth - 2 * this.margin, rowHeight, 'F');
      }

      // Cell content
      let x = this.margin;
      row.forEach((cell, colIndex) => {
        this.doc.setFontSize(fontSize);
        if (isHeader) {
          this.doc.setTextColor(255, 255, 255);
        } else {
          this.setTextColorSafe(this.colors.dark);
        }
        
        // Clean and validate cell content using centralized function
        const cellText = this.cleanText(cell);
        const maxWidth = colWidths[colIndex] - 2 * cellPadding;
        
        try {
          // Use splitTextToSize for long text, simple text for short content
          if (cellText.length > 20 && maxWidth > 10) {
            const lines = this.doc.splitTextToSize(cellText, maxWidth);
            this.doc.text(lines[0] || '', x + cellPadding, y);
          } else {
            this.doc.text(cellText, x + cellPadding, y);
          }
        } catch (error) {
          console.warn('Cell rendering error, using fallback:', error);
          // Fallback: truncate and render simple text
          const truncated = cellText.substring(0, 15);
          this.doc.text(truncated, x + cellPadding, y);
        }
        
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
    this.setDrawColorSafe(this.colors.light);
    this.doc.line(this.margin, this.currentY, this.pageWidth - this.margin, this.currentY);
  }

  checkPageBreak(spaceNeeded) {
    if (this.currentY + spaceNeeded > this.pageHeight - this.margin - 20) {
      this.doc.addPage();
      this.currentY = this.margin + 10; // Leave space for headers on new page
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

  // Safe color setting method for jsPDF
  setTextColorSafe(color) {
    try {
      if (typeof color === 'string') {
        const rgb = this.hexToRgb(color);
        this.doc.setTextColor(rgb.r, rgb.g, rgb.b);
      } else if (typeof color === 'object' && color.r !== undefined) {
        this.doc.setTextColor(color.r, color.g, color.b);
      } else {
        // Fallback to black
        this.doc.setTextColor(0, 0, 0);
      }
    } catch (error) {
      console.warn('Color setting error, using black:', error);
      this.doc.setTextColor(0, 0, 0);
    }
  }

  // Safe drawing color method
  setDrawColorSafe(color) {
    try {
      if (typeof color === 'string') {
        const rgb = this.hexToRgb(color);
        this.doc.setDrawColor(rgb.r, rgb.g, rgb.b);
      } else if (typeof color === 'object' && color.r !== undefined) {
        this.doc.setDrawColor(color.r, color.g, color.b);
      } else {
        // Fallback to black
        this.doc.setDrawColor(0, 0, 0);
      }
    } catch (error) {
      console.warn('Draw color setting error, using black:', error);
      this.doc.setDrawColor(0, 0, 0);
    }
  }

  // Safe fill color method
  setFillColorSafe(r, g, b) {
    try {
      this.doc.setFillColor(r, g, b);
    } catch (error) {
      console.warn('Fill color setting error, using white:', error);
      this.doc.setFillColor(255, 255, 255);
    }
  }
}

// Export PDF generation functions
window.pdfExporter = new PDFExporter();

// Enhanced comprehensive report export with retry logic
window.exportCurrentResultsToPDF = function(filename = null) {
  if (!utils.calculationResults) {
    alert('No calculation results available. Please run calculations first.');
    return;
  }

  // Function to check and export
  const attemptExport = (attempt = 1) => {
    // Use universal jsPDF detection
    const jsPDFClass = window.getjsPDFClass();
    
    if (!jsPDFClass && attempt <= 3) {
      // Wait and retry up to 3 times
      console.log(`jsPDF not ready, attempt ${attempt}/3...`);
      setTimeout(() => attemptExport(attempt + 1), 500);
      return;
    }
    
    if (!jsPDFClass) {
      alert('PDF export library is not available. Please refresh the page and try again.');
      console.error('jsPDF library not found after 3 attempts');
      return;
    }

    try {
      const params = utils.getInputParameters();
      const enhancedExporter = new ComprehensiveReportExporter();
      enhancedExporter.exportComprehensiveReport(utils.calculationResults, params, { filename });
      console.log('PDF export successful!');
    } catch (error) {
      console.error('PDF export error:', error);
      console.error('Error stack:', error.stack);
      
      // Provide more specific error guidance
      if (error.message.includes('f3') || error.message.includes('Invalid argument')) {
        alert('PDF generation error: Invalid text formatting. This may be due to special characters in the data. Please try again or contact support.');
      } else {
        alert('Failed to export PDF: ' + error.message);
      }
    }
  };

  attemptExport();
};

// Simple test PDF export function for debugging
window.exportSimpleTestPDF = function() {
  const jsPDFClass = window.getjsPDFClass();
  if (!jsPDFClass) {
    alert('jsPDF not available');
    return;
  }
  
  try {
    console.log('Creating simple test PDF...');
    const doc = new jsPDFClass('p', 'mm', 'a4');
    
    doc.setFontSize(16);
    doc.text('Test PDF Document', 20, 30);
    
    doc.setFontSize(12);
    doc.text('This is a simple test to verify jsPDF is working correctly.', 20, 50);
    doc.text('Generated on: ' + new Date().toLocaleDateString(), 20, 70);
    
    doc.save('test-pdf.pdf');
    console.log('Simple PDF test successful!');
    
  } catch (error) {
    console.error('Simple PDF test failed:', error);
    alert('Simple PDF test failed: ' + error.message);
  }
};

// New comprehensive report exporter class
class ComprehensiveReportExporter extends PDFExporter {
  constructor() {
    super();
    this.reportDate = new Date().toLocaleDateString('en-US', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  }

  async exportComprehensiveReport(results, params, options = {}) {
    // Use universal jsPDF detection
    const jsPDFClass = window.getjsPDFClass();
    if (!jsPDFClass) {
      throw new Error('jsPDF library is not loaded. Please include jsPDF in your HTML.');
    }

    // Validate input data
    if (!results) {
      throw new Error('No calculation results provided for PDF export.');
    }

    if (!params) {
      console.warn('No parameters provided, using defaults');
      params = {
        annualBudget: 170000,
        interestRate: 7,
        appreciationRate: 3,
        rentalRate: 1,
        vacancyRate: 5,
        managementFee: 8,
        maintenanceRate: 1,
        capexRate: 5,
        ltvRatio: 70,
        loanTerm: 5
      };
    }

    // Initialize jsPDF
    this.doc = new jsPDFClass('p', 'mm', 'a4');
    this.currentY = this.margin;
    
    // Initialize safe fonts
    this.initializeFonts();

    try {
      // Generate comprehensive report with all tabs
      console.log('Adding report cover...');
      this.addReportCover();
      
      console.log('Adding dashboard section...');
      try {
        this.addDashboardSection(results, params);
      } catch (error) {
        console.error('Dashboard section error:', error);
        this.addText(`Dashboard section error: ${error.message}`);
      }
      
      console.log('Adding charts section...');
      try {
        // Ensure charts are created before trying to capture them
        await this.initializeChartsForPDF(results);
        await this.addChartsSection(results, params);
      } catch (error) {
        console.error('Charts section error:', error);
        this.addText(`Charts section error: ${error.message}`);
      }
      
      console.log('Adding scenarios section...');
      try {
        this.addScenariosSection(results, params);
      } catch (error) {
        console.error('Scenarios section error:', error);
        this.addText(`Scenarios section error: ${error.message}`);
      }
      
      console.log('Adding comparison section...');
      try {
        this.addComparisonSection(results, params);
      } catch (error) {
        console.error('Comparison section error:', error);
        this.addText(`Comparison section error: ${error.message}`);
      }
      
      console.log('Adding sensitivity section...');
      try {
        this.addSensitivitySection(results, params);
      } catch (error) {
        console.error('Sensitivity section error:', error);
        this.addText(`Sensitivity section error: ${error.message}`);
      }
      
      console.log('Adding break-even section...');
      try {
        this.addBreakEvenSection(results, params);
      } catch (error) {
        console.error('Break-even section error:', error);
        this.addText(`Break-even section error: ${error.message}`);
      }
      
      console.log('Adding ROI section...');
      try {
        this.addROISection(results, params);
      } catch (error) {
        console.error('ROI section error:', error);
        this.addText(`ROI section error: ${error.message}`);
      }
      
      console.log('Adding summary section...');
      try {
        this.addSummarySection(results, params);
      } catch (error) {
        console.error('Summary section error:', error);
        this.addText(`Summary section error: ${error.message}`);
      }
      
      console.log('Adding settings section...');
      try {
        this.addSettingsSection(params);
      } catch (error) {
        console.error('Settings section error:', error);
        this.addText(`Settings section error: ${error.message}`);
      } // Settings as last tab
      
      console.log('Adding footer...');
      this.addComprehensiveFooter();

      // Save or return PDF
      if (options.returnBlob) {
        return this.doc.output('blob');
      } else {
        const filename = options.filename || `Comprehensive_Investment_Analysis_${new Date().toISOString().split('T')[0]}.pdf`;
        this.doc.save(filename);
        return true;
      }
    } catch (error) {
      console.error('Comprehensive PDF generation error:', error);
      throw new Error('Failed to generate comprehensive PDF: ' + error.message);
    }
  }

  addReportCover() {
    // Main title
    this.doc.setFontSize(24);
    this.setTextColorSafe(this.colors.primary);
    const mainTitle = 'Comprehensive Investment Analysis Report';
    this.doc.text(mainTitle, this.margin, 60);

    // Subtitle
    this.doc.setFontSize(16);
    this.setTextColorSafe(this.colors.secondary);
    const subtitle = 'Rental Property Investment Strategy Comparison';
    this.doc.text(subtitle, this.margin, 75);

    // Report details box
    this.setDrawColorSafe(this.colors.primary);
    this.setFillColorSafe(248, 249, 255);
    this.doc.rect(this.margin, 100, this.pageWidth - 2 * this.margin, 60, 'FD');
    
    this.doc.setFontSize(14);
    this.setTextColorSafe(this.colors.dark);
    this.doc.text('Report Generated:', this.margin + 10, 120);
    this.doc.text(this.reportDate, this.margin + 50, 120);
    
    this.doc.text('Analysis Period:', this.margin + 10, 135);
    this.doc.text('15 Years', this.margin + 50, 135);
    
    this.doc.text('Report Sections:', this.margin + 10, 150);
    
    const sections = [
      'Dashboard Overview',
      'Charts & Analysis', 
      'Scenario Management',
      'Strategy Comparison',
      'Sensitivity Analysis',
      'Break-Even Analysis',
      'ROI Analysis',
      'Executive Summary',
      'Investment Parameters'
    ];
    
    this.doc.setFontSize(10);
    let yOffset = 165;
    sections.forEach((section, index) => {
      if (index > 0 && index % 3 === 0) yOffset += 8;
      const xPos = this.margin + 10 + (index % 3) * 55;
      const bulletPoint = '• ' + section;
      this.doc.text(bulletPoint, xPos, yOffset);
    });

    // Start new page for content
    this.doc.addPage();
    this.currentY = this.margin;
  }

  addReportHeader() {
    // Add header to each page with date and title
    this.doc.setFontSize(10);
    this.setTextColorSafe(this.colors.light);
    this.doc.text(`Investment Analysis Report - ${this.reportDate}`, this.margin, 15);
    this.doc.line(this.margin, 18, this.pageWidth - this.margin, 18);
  }

  addDashboardSection(results, params) {
    this.addPageHeader('Dashboard Overview');
    
    // Investment Synopsis
    this.addSubheader('Investment Model Synopsis');
    
    // Validate results data exists
    if (!results || !results.selfFinanced || !results.financed) {
      this.addText('Error: No calculation results available for dashboard metrics.');
      return;
    }
    
    if (results.selfFinanced.length < 15 || results.financed.length < 15) {
      this.addText('Error: Incomplete calculation results - insufficient data for 15-year analysis.');
      return;
    }
    
    // Calculate metrics directly from results data (bypassing faulty getDashboardMetrics)
    const selfFinal = results.selfFinanced[14] || {};
    const financedFinal = results.financed[14] || {};
    const totalInvested = (params?.annualBudget || 170000) * 15;
    
    // Calculate ROI properly with null checks
    const selfNetWorth = selfFinal.netWorth || 0;
    const financedNetWorth = financedFinal.netWorth || 0;
    const selfROI = selfNetWorth && totalInvested ? ((selfNetWorth - totalInvested) / totalInvested * 100) : 0;
    const financedROI = financedNetWorth && totalInvested ? ((financedNetWorth - totalInvested) / totalInvested * 100) : 0;
    
    const safeMetrics = {
      totalUnits: {
        self: selfFinal.units || 0,
        financed: financedFinal.units || 0
      },
      finalNetWorth: {
        self: selfNetWorth,
        financed: financedNetWorth
      },
      cumulativeCashFlow: {
        self: selfFinal.cumulativeCashFlow || 0,
        financed: financedFinal.cumulativeCashFlow || 0
      },
      roi: {
        self: selfROI,
        financed: financedROI
      },
      netWorthDifference: financedNetWorth - selfNetWorth,
      leverageMultiplier: results?.summaryMetrics?.leverageMultiplier || 
                          (financedNetWorth && selfNetWorth && selfNetWorth > 0 ? financedNetWorth / selfNetWorth : 1.0)
    };
    
    const synopsisData = [
      ['Strategy', 'Total Units', 'Final Net Worth', 'Cumulative Cash Flow', 'Total ROI'],
      [
        'Self-Financed',
        safeMetrics.totalUnits.self.toString(),
        this.formatCurrency(safeMetrics.finalNetWorth.self),
        this.formatCurrency(safeMetrics.cumulativeCashFlow.self),
        `${safeMetrics.roi.self.toFixed(1)}%`
      ],
      [
        'Bank-Financed',
        safeMetrics.totalUnits.financed.toString(),
        this.formatCurrency(safeMetrics.finalNetWorth.financed),
        this.formatCurrency(safeMetrics.cumulativeCashFlow.financed),
        `${safeMetrics.roi.financed.toFixed(1)}%`
      ]
    ];

    this.addTable(synopsisData, { 
      headerColor: this.colors.primary,
      alternateRows: true,
      columnWidths: [40, 30, 45, 45, 30]
    });

    // Key Performance Indicators
    this.currentY += 10;
    this.addSubheader('Key Performance Indicators');
    
    const kpiData = [
      ['Metric', 'Value', 'Description'],
      ['Net Worth Difference', this.formatCurrency(Math.abs(safeMetrics.netWorthDifference)), 'Advantage to optimal strategy'],
      ['Unit Acquisition Difference', `${Math.abs(safeMetrics.totalUnits.financed - safeMetrics.totalUnits.self)} units`, 'Additional units with leverage'],
      ['Cash Flow Impact', this.formatCurrency(Math.abs(safeMetrics.cumulativeCashFlow.financed - safeMetrics.cumulativeCashFlow.self)), 'Difference in total cash flow'],
      ['Leverage Multiplier', `${safeMetrics.leverageMultiplier.toFixed(2)}x`, 'Asset control per equity dollar']
    ];

    this.addTable(kpiData, { 
      headerColor: this.colors.secondary,
      alternateRows: true,
      columnWidths: [60, 40, 60]
    });

    // Add strategic recommendation
    this.currentY += 15;
    this.addRecommendationBox(results);
    this.checkPageBreak(30);
  }

  async addChartsSection(results, params) {
    this.addPageHeader('Charts & Visual Analysis');
    
    // Capture and add actual charts from the web application
    this.addSubheader('Investment Performance Charts');
    
    // Try to capture Chart.js canvases and add them to PDF
    await this.addChartImage('cashFlowWaterfallChart', 'Cash Flow Waterfall Analysis');
    await this.addChartImage('netWorthChart', 'Net Worth & Cash Flow Progression');
    await this.addChartImage('sensitivityChart', 'Sensitivity Analysis Tornado Diagram');
    await this.addChartImage('loanTrackingChart', 'Loan Analysis & Outstanding Balances');
    
    // Add complete 15-year cash flow table with error handling
    this.currentY += 10;
    this.addSubheader('15-Year Cash Flow Analysis');
    
    // Validate data before creating table
    if (!results?.selfFinanced || !results?.financed || 
        results.selfFinanced.length < 15 || results.financed.length < 15) {
      this.addText('Error: Insufficient data for 15-year cash flow analysis.');
      return;
    }
    
    const cfSummaryData = [
      ['Year', 'Self-Financed CF', 'Bank-Financed CF', 'Cumulative Self', 'Cumulative Bank'],
      ...results.selfFinanced.map((selfData, index) => {
        const financedData = results.financed[index] || {};
        return [
          `Year ${index + 1}`,
          this.formatCurrency(selfData?.cashFlow || 0),
          this.formatCurrency(financedData?.cashFlow || 0),
          this.formatCurrency(selfData?.cumulativeCashFlow || 0),
          this.formatCurrency(financedData?.cumulativeCashFlow || 0)
        ];
      })
    ];

    this.currentY += 10;
    this.addTable(cfSummaryData, { 
      headerColor: this.colors.success,
      fontSize: 8,
      columnWidths: [20, 30, 30, 30, 30]
    });

    // Add complete net worth progression table with null checks
    this.currentY += 15;
    this.addSubheader('Net Worth Progression');
    
    const netWorthData = [
      ['Year', 'Units (Self)', 'Units (Bank)', 'Net Worth (Self)', 'Net Worth (Bank)', 'Loan Balance'],
      ...results.selfFinanced.map((selfData, index) => {
        const financedData = results.financed[index] || {};
        return [
          `Year ${index + 1}`,
          (selfData?.units || 0).toString(),
          (financedData?.units || 0).toString(),
          this.formatCurrency(selfData?.netWorth || 0),
          this.formatCurrency(financedData?.netWorth || 0),
          this.formatCurrency(financedData?.loanBalance || 0)
        ];
      })
    ];

    this.addTable(netWorthData, { 
      headerColor: this.colors.primary,
      fontSize: 7,
      columnWidths: [20, 20, 20, 30, 30, 30]
    });

    this.checkPageBreak(30);
  }

  addScenariosSection(results, params) {
    this.addPageHeader('Scenario Management');
    
    this.addSubheader('Current Scenario Parameters');
    this.addText('This analysis represents your current scenario configuration.');
    
    // Budget mode and strategy info
    const scenarioInfo = [
      ['Parameter', 'Value'],
      ['Budget Mode', params.budgetMode === 'needsBased' ? 'Needs-Based Investment' : 'Predetermined Annual Budget'],
      ['Analysis Period', '15 Years'],
      ['Initial Property Cost', this.formatCurrency(params.initialCost)],
      ['Annual Budget', this.formatCurrency(params.annualBudget)]
    ];

    this.addTable(scenarioInfo, {
      headerColor: this.colors.primary,
      columnWidths: [80, 80]
    });

    this.currentY += 10;
    this.addText('Scenario comparison functionality allows saving and comparing multiple investment scenarios with different parameters.');
    
    this.checkPageBreak(30);
  }

  addComparisonSection(results, params) {
    this.addPageHeader('Strategy Comparison');
    
    this.addSubheader('15-Year Strategy Performance Comparison');
    
    const comparisonData = [
      ['Metric', 'Self-Financed', 'Bank-Financed', 'Difference', 'Advantage'],
      ...this.buildComparisonTable(results, params)
    ];

    this.addTable(comparisonData, { 
      headerColor: this.colors.primary,
      alternateRows: true,
      fontSize: 9,
      columnWidths: [40, 30, 30, 30, 30]
    });

    this.checkPageBreak(30);
  }

  addSensitivitySection(results, params) {
    this.addPageHeader('Sensitivity Analysis');
    
    this.addSubheader('Parameter Sensitivity Impact');
    this.addText('Analysis of how key parameters affect investment outcomes:');
    
    // Current parameter values table
    const currentParams = [
      ['Parameter', 'Current Value', 'Impact Level', 'Description'],
      ['Interest Rate', `${params.interestRate || 7}%`, 'High', 'Affects loan costs and financing viability'],
      ['Property Appreciation', `${params.appreciationRate || 3}%`, 'Critical', 'Primary driver of long-term wealth building'],
      ['Rental Yield', `${params.rentalRate || 1}% of value`, 'Medium', 'Determines annual cash flow generation'],
      ['Vacancy Rate', `${params.vacancyRate || 5}%`, 'Medium', 'Reduces effective rental income'],
      ['Management Fee', `${params.managementFee || 8}%`, 'Low', 'Ongoing operational expense'],
      ['Maintenance Rate', `${params.maintenanceRate || 1}%`, 'Low', 'Property upkeep and repair costs'],
      ['CapEx Reserve', `${params.capexRate || 5}%`, 'Low', 'Capital expenditure reserves'],
      ['LTV Ratio', `${params.ltvRatio || 70}%`, 'High', 'Determines loan amount and leverage'],
      ['Loan Term', `${params.loanTerm || 5} years`, 'Medium', 'Affects payment schedule and cash flow']
    ];

    this.addTable(currentParams, { 
      headerColor: this.colors.secondary,
      fontSize: 8,
      columnWidths: [40, 25, 25, 70]
    });

    this.currentY += 15;
    this.addSubheader('Key Sensitivity Insights');
    this.addBulletPoint('Interest rate changes have the highest impact on bank-financed strategy viability');
    this.addBulletPoint('Property appreciation is the primary wealth-building factor for both strategies');
    this.addBulletPoint('Higher LTV ratios increase leverage benefits but also risk exposure');
    this.addBulletPoint('Rental yield variations directly affect cash flow sustainability');
    
    this.checkPageBreak(30);
  }

  addBreakEvenSection(results, params) {
    this.addPageHeader('Break-Even Analysis');
    
    this.addSubheader('Break-Even Timeline Analysis');
    
    // Calculate break-even points
    const selfBreakEven = results.selfFinanced.findIndex(year => year.cumulativeCashFlow > 0);
    const financedBreakEven = results.financed.findIndex(year => year.cumulativeCashFlow > 0);
    const roiBreakEven = results.selfFinanced.findIndex(year => {
      const totalInvested = params.annualBudget * (year + 1);
      return ((year.netWorth - totalInvested) / totalInvested) > 0.1;
    });

    const breakEvenData = [
      ['Break-Even Type', 'Self-Financed', 'Bank-Financed', 'Description'],
      [
        'Cash Flow Positive', 
        selfBreakEven >= 0 ? `Year ${selfBreakEven + 1}` : 'Not within 15 years',
        financedBreakEven >= 0 ? `Year ${financedBreakEven + 1}` : 'Not within 15 years',
        'When cumulative cash flow turns positive'
      ],
      [
        'ROI Break-Even',
        roiBreakEven >= 0 ? `Year ${roiBreakEven + 1}` : 'Not within 15 years',
        'Varies by leverage',
        'When returns exceed 10% annually'
      ]
    ];

    this.addTable(breakEvenData, { 
      headerColor: this.colors.success,
      columnWidths: [40, 35, 35, 50]
    });

    this.currentY += 15;
    this.addText('Break-even analysis helps determine when your investment becomes profitable and starts generating positive returns.');
    
    this.checkPageBreak(30);
  }

  addROISection(results, params) {
    this.addPageHeader('ROI Analysis');
    
    this.addSubheader('Return on Investment Comparison');
    
    // Validate data before calculations
    if (!results?.selfFinanced || !results?.financed || 
        results.selfFinanced.length < 15 || results.financed.length < 15) {
      this.addText('Error: Insufficient data for ROI analysis.');
      return;
    }
    
    // Calculate ROI metrics with null safety
    const totalInvested = (params?.annualBudget || 170000) * 15;
    const selfFinalNetWorth = results.selfFinanced[14]?.netWorth || 0;
    const financedFinalNetWorth = results.financed[14]?.netWorth || 0;
    const selfROI = selfFinalNetWorth && totalInvested ? ((selfFinalNetWorth - totalInvested) / totalInvested) * 100 : 0;
    const financedROI = financedFinalNetWorth && totalInvested ? ((financedFinalNetWorth - totalInvested) / totalInvested) * 100 : 0;
    const spReturn = Math.pow(1.10, 15) * totalInvested; // 10% annual SP500 return
    const bondsReturn = Math.pow(1.04, 15) * totalInvested; // 4% annual bond return
    const savingsReturn = Math.pow(1.015, 15) * totalInvested; // 1.5% savings

    const roiData = [
      ['Investment Type', 'Initial Investment', 'Final Value', 'Total Return', 'Annual ROI', 'Risk Level'],
      [
        'Real Estate (Self)', 
        this.formatCurrency(totalInvested), 
        this.formatCurrency(selfFinalNetWorth),
        this.formatCurrency(selfFinalNetWorth - totalInvested),
        `${selfROI.toFixed(1)}%`,
        'Medium'
      ],
      [
        'Real Estate (Financed)', 
        this.formatCurrency(totalInvested), 
        this.formatCurrency(financedFinalNetWorth),
        this.formatCurrency(financedFinalNetWorth - totalInvested),
        `${financedROI.toFixed(1)}%`,
        'Medium-High'
      ],
      [
        'S&P 500 Index', 
        this.formatCurrency(totalInvested), 
        this.formatCurrency(spReturn),
        this.formatCurrency(spReturn - totalInvested),
        '10.0%',
        'Medium'
      ],
      [
        'Corporate Bonds', 
        this.formatCurrency(totalInvested), 
        this.formatCurrency(bondsReturn),
        this.formatCurrency(bondsReturn - totalInvested),
        '4.0%',
        'Low'
      ],
      [
        'High-Yield Savings', 
        this.formatCurrency(totalInvested), 
        this.formatCurrency(savingsReturn),
        this.formatCurrency(savingsReturn - totalInvested),
        '1.5%',
        'Very Low'
      ]
    ];

    this.addTable(roiData, { 
      headerColor: this.colors.primary,
      fontSize: 8,
      columnWidths: [35, 30, 30, 30, 25, 25]
    });

    // Add year-by-year ROI progression
    this.currentY += 15;
    this.addSubheader('Annual Performance Analysis');
    
    const progressionData = [
      ['Year', 'Self Net Worth', 'Bank Net Worth', 'Self Cash Flow', 'Bank Cash Flow', 'Winner'],
      ...results.selfFinanced.filter((_, index) => index % 3 === 0 || index === 14).map((selfData, filteredIndex) => {
        const actualIndex = filteredIndex === 4 ? 14 : filteredIndex * 3;
        const financedData = results.financed[actualIndex] || {};
        
        const selfNetWorth = selfData?.netWorth || 0;
        const financedNetWorth = financedData?.netWorth || 0;
        const winner = financedNetWorth > selfNetWorth ? 'Bank' : 
                      selfNetWorth > financedNetWorth ? 'Self' : 'Tie';
        
        return [
          `Year ${actualIndex + 1}`,
          this.formatCurrency(selfNetWorth),
          this.formatCurrency(financedNetWorth),
          this.formatCurrency(selfData?.cashFlow || 0),
          this.formatCurrency(financedData?.cashFlow || 0),
          winner
        ];
      })
    ];

    this.addTable(progressionData, { 
      headerColor: this.colors.secondary,
      fontSize: 7,
      columnWidths: [20, 25, 25, 25, 25, 20]
    });

    this.checkPageBreak(30);
  }

  addSummarySection(results, params) {
    this.addPageHeader('Executive Summary');
    
    // Validate data before proceeding
    if (!results || !results.selfFinanced || !results.financed || 
        results.selfFinanced.length < 15 || results.financed.length < 15) {
      this.addText('Error: Insufficient calculation data for executive summary.');
      return;
    }
    
    // Strategic recommendation
    this.addRecommendationBox(results);
    
    this.currentY += 15;
    this.addSubheader('Investment Analysis Summary');
    
    // Calculate metrics directly from results data
    const selfFinal = results.selfFinanced[14] || {};
    const financedFinal = results.financed[14] || {};
    
    const safeMetrics = {
      totalUnits: {
        self: selfFinal.units || 0,
        financed: financedFinal.units || 0
      },
      finalNetWorth: {
        self: selfFinal.netWorth || 0,
        financed: financedFinal.netWorth || 0
      },
      netWorthDifference: (financedFinal.netWorth || 0) - (selfFinal.netWorth || 0),
      leverageMultiplier: results?.summaryMetrics?.leverageMultiplier || 
                          (financedFinal.netWorth && selfFinal.netWorth ? financedFinal.netWorth / selfFinal.netWorth : 1.0)
    };
    
    const summaryPoints = [
      `Analysis Period: 15-year investment strategy comparison`,
      `Total Investment Budget: ${this.formatCurrency(params.annualBudget * 15)} over ${params.annualBudget > 0 ? '15 years' : 'needs-based timeline'}`,
      `Self-Financed Result: ${safeMetrics.totalUnits.self} units, ${this.formatCurrency(safeMetrics.finalNetWorth.self)} net worth`,
      `Bank-Financed Result: ${safeMetrics.totalUnits.financed} units, ${this.formatCurrency(safeMetrics.finalNetWorth.financed)} net worth`,
      `Optimal Strategy: ${safeMetrics.finalNetWorth.financed > safeMetrics.finalNetWorth.self ? 'Bank-Financed' : 'Self-Financed'} (${this.formatCurrency(Math.abs(safeMetrics.netWorthDifference))} advantage)`,
      `Leverage Benefits: ${safeMetrics.leverageMultiplier.toFixed(2)}x asset control per equity dollar`
    ];

    summaryPoints.forEach(point => {
      this.addBulletPoint(point);
    });

    this.checkPageBreak(30);
  }

  addSettingsSection(params) {
    this.addPageHeader('Investment Parameters & Settings');
    
    this.addSubheader('Property Investment Settings');
    
    const settingsGroups = [
      {
        title: 'Property Details',
        params: [
          ['Initial Property Cost', this.formatCurrency(params.initialCost)],
          ['Annual Budget', this.formatCurrency(params.annualBudget)],
          ['Budget Mode', params.budgetMode === 'needsBased' ? 'Needs-Based Investment' : 'Predetermined Annual Budget'],
          ['Rental Rate', `${params.rentalRate}% of property value`],
          ['Property Appreciation', `${params.appreciationRate}% annually`]
        ]
      },
      {
        title: 'Financing Options',
        params: [
          ['Interest Rate', `${params.interestRate}% annually`],
          ['LTV Ratio', `${params.ltvRatio}%`],
          ['Loan Term', `${params.loanTerm} years`],
          ['Max Units Financed', `${params.maxUnitsFinanced} per year`]
        ]
      },
      {
        title: 'Operating Assumptions', 
        params: [
          ['Vacancy Rate', `${params.vacancyRate}%`],
          ['Management Fee', `${params.managementRate}%`],
          ['Maintenance Rate', `${params.maintenanceRate}% of property value`],
          ['CapEx Reserve', `${params.capexRate}% of property value`]
        ]
      }
    ];

    settingsGroups.forEach((group, index) => {
      if (index > 0) this.currentY += 10;
      this.addSubheader(group.title);
      const tableData = [['Parameter', 'Value'], ...group.params];
      this.addTable(tableData, { 
        headerColor: this.colors.secondary,
        columnWidths: [100, 60] 
      });
    });

    this.currentY += 15;
    this.addText('These parameters form the basis for all calculations and projections in this investment analysis report.');
  }

  addPageHeader(title) {
    // If this is a new page, ensure proper positioning
    if (this.currentY <= this.margin + 10) {
      this.currentY = this.margin + 15;
    } else {
      // Add page break before header if needed
      this.checkPageBreak(30);
      this.currentY += 10;
    }
    
    // Add top header line
    this.setDrawColorSafe(this.colors.light);
    this.doc.line(this.margin, this.currentY - 5, this.pageWidth - this.margin, this.currentY - 5);
    
    // Page title - centered between horizontal lines
    this.doc.setFontSize(18);
    this.setTextColorSafe(this.colors.primary);
    
    const cleanTitle = this.cleanText(title);
    
    // Calculate center position for text
    const titleWidth = this.doc.getTextWidth(cleanTitle);
    const centerX = (this.pageWidth - titleWidth) / 2;
    
    this.doc.text(cleanTitle, centerX, this.currentY + 5);
    this.currentY += 15;
    
    // Add bottom header line
    this.setDrawColorSafe(this.colors.primary);
    this.doc.line(this.margin, this.currentY - 5, this.pageWidth - this.margin, this.currentY - 5);
    this.currentY += 10;
  }

  // Initialize charts for PDF capture with proper timing
  async initializeChartsForPDF(results) {
    try {
      // Ensure chart containers are visible
      this.makeChartContainersVisible();
      
      // Check if chartManager exists and initialize charts
      if (window.chartManager && typeof window.chartManager.initializeCharts === 'function') {
        console.log('Initializing charts for PDF capture...');
        
        // Force chart initialization with results data
        window.chartManager.initializeCharts(results);
        
        // Wait for charts to render properly
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Verify charts were created
        this.verifyChartsExist();
        
        console.log('Charts should be rendered and ready for capture');
      } else {
        console.warn('Chart manager not available, charts will not be included');
      }
    } catch (error) {
      console.error('Failed to initialize charts:', error);
    }
  }

  // Ensure chart containers are visible for rendering
  makeChartContainersVisible() {
    const chartIds = ['cashFlowWaterfallChart', 'netWorthChart', 'sensitivityChart', 'loanTrackingChart'];
    
    chartIds.forEach(chartId => {
      const canvas = document.getElementById(chartId);
      if (canvas) {
        // Find and show all parent containers
        let current = canvas;
        while (current && current !== document.body) {
          if (current.style) {
            current.style.display = 'block';
            current.style.visibility = 'visible';
            current.style.opacity = '1';
          }
          current = current.parentElement;
        }
        
        // Ensure canvas itself is visible and has minimum dimensions
        canvas.style.display = 'block';
        canvas.style.visibility = 'visible';
        canvas.style.position = 'static';
        
        // Force minimum canvas size if it's too small
        if (canvas.style.width === '' || canvas.style.width === '0px') {
          canvas.style.width = '800px';
        }
        if (canvas.style.height === '' || canvas.style.height === '0px') {
          canvas.style.height = '400px';
        }
        
        console.log(`Made chart container visible: ${chartId} (style: ${canvas.style.width}x${canvas.style.height})`);
      }
    });
  }

  // Verify charts exist and have content
  verifyChartsExist() {
    const chartIds = ['cashFlowWaterfallChart', 'netWorthChart', 'sensitivityChart', 'loanTrackingChart'];
    
    chartIds.forEach(chartId => {
      const canvas = document.getElementById(chartId);
      if (canvas && canvas.width > 0 && canvas.height > 0) {
        console.log(`✓ Chart verified: ${chartId} (${canvas.width}x${canvas.height})`);
      } else {
        console.warn(`✗ Chart missing or empty: ${chartId}`);
      }
    });
  }

  // Add Chart.js canvas as image to PDF
  async addChartImage(canvasId, chartTitle) {
    try {
      const canvas = document.getElementById(canvasId);
      if (!canvas) {
        console.warn(`Chart canvas ${canvasId} not found, skipping chart image`);
        this.addText(`Chart not available: ${chartTitle}`);
        return;
      }

      console.log(`Found canvas ${canvasId} - dimensions: ${canvas.width}x${canvas.height}`);

      // Check if canvas has proper dimensions
      if (canvas.width === 0 || canvas.height === 0) {
        console.warn(`Canvas ${canvasId} has zero dimensions (${canvas.width}x${canvas.height}), attempting to fix...`);
        
        // Try to trigger Chart.js resize
        const chartInstance = Chart.getChart(canvas);
        if (chartInstance) {
          console.log(`Found Chart.js instance for ${canvasId}, triggering resize...`);
          chartInstance.resize();
          
          // Wait a bit for resize to complete
          await new Promise(resolve => setTimeout(resolve, 500));
          
          console.log(`Canvas ${canvasId} after resize: ${canvas.width}x${canvas.height}`);
        }
        
        // If still zero dimensions, skip this chart
        if (canvas.width === 0 || canvas.height === 0) {
          console.warn(`Canvas ${canvasId} still has zero dimensions, skipping`);
          this.addText(`Chart has invalid dimensions: ${chartTitle}`);
          return;
        }
      }

      // Validate canvas has content (only if dimensions are valid)
      const ctx = canvas.getContext('2d');
      let hasContent = false;
      
      try {
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
        hasContent = imageData.data.some(channel => channel !== 0);
      } catch (getImageDataError) {
        console.error(`Failed to get image data from canvas ${canvasId}:`, getImageDataError);
        this.addText(`Chart data extraction failed: ${chartTitle}`);
        return;
      }
      
      if (!hasContent) {
        console.warn(`Chart canvas ${canvasId} appears empty, skipping`);
        this.addText(`Chart appears empty: ${chartTitle}`);
        return;
      }

      console.log(`Canvas ${canvasId} validated - dimensions: ${canvas.width}x${canvas.height}`);

      // Check if there's space for the chart (estimate ~100mm height)
      this.checkPageBreak(120);

      // Add chart title
      if (chartTitle) {
        this.addSubheader(chartTitle);
      }

      // Capture canvas as data URL with error handling
      let imgData;
      try {
        imgData = canvas.toDataURL('image/png', 1.0);
        
        // Validate the data URL
        if (!imgData || imgData === 'data:,' || !imgData.startsWith('data:image/png;base64,')) {
          throw new Error('Invalid PNG data generated from canvas');
        }
        
        console.log(`Canvas ${canvasId} captured successfully, data length: ${imgData.length}`);
      } catch (canvasError) {
        console.error(`Canvas toDataURL failed for ${canvasId}:`, canvasError);
        this.addText(`Chart capture failed: ${chartTitle} (Canvas export error)`);
        return;
      }
      
      // Calculate dimensions to fit within page margins
      const maxWidth = this.pageWidth - 2 * this.margin;
      const maxHeight = 80; // Maximum height in mm
      
      // Get canvas dimensions
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      
      // Calculate scaled dimensions maintaining aspect ratio
      let imgWidth = maxWidth;
      let imgHeight = (canvasHeight / canvasWidth) * imgWidth;
      
      // If height exceeds maximum, scale down based on height
      if (imgHeight > maxHeight) {
        imgHeight = maxHeight;
        imgWidth = (canvasWidth / canvasHeight) * imgHeight;
      }
      
      // Add image to PDF
      this.doc.addImage(imgData, 'PNG', this.margin, this.currentY, imgWidth, imgHeight);
      
      // Update current Y position
      this.currentY += imgHeight + 15;
      
      console.log(`Successfully added chart: ${chartTitle} (${imgWidth}x${imgHeight}mm)`);
      
    } catch (error) {
      console.error(`Failed to capture chart ${canvasId}:`, error);
      this.addText(`Chart capture failed: ${chartTitle} (${error.message})`);
    }
  }

  addRecommendationBox(results) {
    // Calculate recommendation directly from results
    const selfFinal = results?.selfFinanced?.[14] || {};
    const financedFinal = results?.financed?.[14] || {};
    
    const selfNetWorth = selfFinal.netWorth || 0;
    const financedNetWorth = financedFinal.netWorth || 0;
    const netWorthDiff = Math.abs(financedNetWorth - selfNetWorth);
    const leverageMultiplier = results?.summaryMetrics?.leverageMultiplier || 
                               (financedNetWorth && selfNetWorth ? financedNetWorth / selfNetWorth : 1.0);
    
    // Only show recommendation if there's actual data
    if (!selfNetWorth && !financedNetWorth) return;

    const boxHeight = 40;
    const boxY = this.currentY;
    
    // Recommendation box background
    this.setFillColorSafe(248, 249, 255);
    this.setDrawColorSafe(this.colors.primary);
    this.doc.rect(this.margin, boxY, this.pageWidth - 2 * this.margin, boxHeight, 'FD');
    
    // Recommendation content
    this.doc.setFontSize(12);
    this.setTextColorSafe(this.colors.primary);
    
    // Determine recommendation based on net worth
    let title = 'Strategies Are Nearly Equal';
    if (financedNetWorth > selfNetWorth * 1.05) title = 'Recommended: Bank Financing Strategy';
    else if (selfNetWorth > financedNetWorth * 1.05) title = 'Recommended: Self-Financing Strategy';
    
    const cleanTitle = this.cleanText(title);
    this.doc.text(cleanTitle, this.margin + 5, boxY + 10);
    
    // Key metrics
    this.doc.setFontSize(10);
    this.setTextColorSafe(this.colors.dark);
    const netWorthText = `Net Worth Difference: ${this.formatCurrency(netWorthDiff)}`;
    const leverageText = `Leverage Multiplier: ${leverageMultiplier.toFixed(2)}x`;
    
    this.doc.text(netWorthText, this.margin + 5, boxY + 20);
    this.doc.text(leverageText, this.margin + 5, boxY + 30);
    
    this.currentY += boxHeight + 10;
  }

  buildComparisonTable(results, params) {
    // Validate data exists
    if (!results?.selfFinanced || !results?.financed || 
        results.selfFinanced.length < 15 || results.financed.length < 15) {
      return [['Error', 'Insufficient data', 'for comparison', 'table', 'generation']];
    }
    
    const selfFinal = results.selfFinanced[14] || {};
    const financedFinal = results.financed[14] || {};
    const totalInvested = params?.annualBudget ? params.annualBudget * 15 : 2500000; // Default fallback
    
    // Calculate metrics directly from data with null safety
    const selfNetWorth = selfFinal.netWorth || 0;
    const financedNetWorth = financedFinal.netWorth || 0;
    const selfCashFlow = selfFinal.cumulativeCashFlow || 0;
    const financedCashFlow = financedFinal.cumulativeCashFlow || 0;
    
    const safeMetrics = {
      totalUnits: {
        self: selfFinal.units || 0,
        financed: financedFinal.units || 0
      },
      finalNetWorth: {
        self: selfNetWorth,
        financed: financedNetWorth
      },
      cumulativeCashFlow: {
        self: selfCashFlow,
        financed: financedCashFlow
      },
      roi: {
        self: selfNetWorth && totalInvested ? ((selfNetWorth - totalInvested) / totalInvested * 100) : 0,
        financed: financedNetWorth && totalInvested ? ((financedNetWorth - totalInvested) / totalInvested * 100) : 0
      },
      netWorthDifference: financedNetWorth - selfNetWorth
    };
    
    return [
      [
        'Total Units',
        safeMetrics.totalUnits.self.toString(),
        safeMetrics.totalUnits.financed.toString(),
        `${Math.abs(safeMetrics.totalUnits.financed - safeMetrics.totalUnits.self)}`,
        safeMetrics.totalUnits.financed > safeMetrics.totalUnits.self ? 'Financed' : 'Self'
      ],
      [
        'Final Net Worth',
        this.formatCurrency(safeMetrics.finalNetWorth.self),
        this.formatCurrency(safeMetrics.finalNetWorth.financed),
        this.formatCurrency(Math.abs(safeMetrics.netWorthDifference)),
        safeMetrics.finalNetWorth.financed > safeMetrics.finalNetWorth.self ? 'Financed' : 'Self'
      ],
      [
        'Cumulative Cash Flow',
        this.formatCurrency(safeMetrics.cumulativeCashFlow.self),
        this.formatCurrency(safeMetrics.cumulativeCashFlow.financed),
        this.formatCurrency(Math.abs(safeMetrics.cumulativeCashFlow.financed - safeMetrics.cumulativeCashFlow.self)),
        safeMetrics.cumulativeCashFlow.financed > safeMetrics.cumulativeCashFlow.self ? 'Financed' : 'Self'
      ],
      [
        'Total ROI',
        `${safeMetrics.roi.self.toFixed(1)}%`,
        `${safeMetrics.roi.financed.toFixed(1)}%`,
        `${Math.abs(safeMetrics.roi.financed - safeMetrics.roi.self).toFixed(1)}%`,
        safeMetrics.roi.financed > safeMetrics.roi.self ? 'Financed' : 'Self'
      ]
    ];
  }

  addText(text) {
    this.checkPageBreak(10);
    this.doc.setFontSize(10);
    this.setTextColorSafe(this.colors.dark);
    
    const cleanText = this.cleanText(text);
    
    try {
      const lines = this.doc.splitTextToSize(cleanText, this.pageWidth - 2 * this.margin);
      this.doc.text(lines, this.margin, this.currentY);
      this.currentY += lines.length * 5 + 5;
    } catch (error) {
      console.warn('Text rendering error, using fallback:', error);
      // Fallback: simple text without splitting
      this.doc.text(cleanText.substring(0, 100), this.margin, this.currentY);
      this.currentY += 15;
    }
  }

  addComprehensiveFooter() {
    const pageCount = this.doc.internal.getNumberOfPages();
    for (let i = 1; i <= pageCount; i++) {
      this.doc.setPage(i);
      
      // Header (except first page)
      if (i > 1) {
        this.doc.setFontSize(9);
        this.setTextColorSafe(this.colors.light);
        const headerText = `Investment Analysis Report - ${this.reportDate}`;
        this.doc.text(headerText, this.margin, 10);
        this.setDrawColorSafe(this.colors.light);
        this.doc.line(this.margin, 12, this.pageWidth - this.margin, 12);
      }
      
      // Footer
      this.doc.setFontSize(8);
      this.setTextColorSafe(this.colors.light);
      const pageText = `Page ${i} of ${pageCount}`;
      const generatedText = 'Generated by Rental Investment Analyzer';
      
      this.doc.text(pageText, this.pageWidth - this.margin - 15, this.pageHeight - 10);
      this.doc.text(generatedText, this.margin, this.pageHeight - 10);
    }
  }

  checkPageBreak(spaceNeeded) {
    if (this.currentY + spaceNeeded > this.pageHeight - this.margin - 20) {
      this.doc.addPage();
      this.currentY = this.margin + 10; // Leave space for headers on new page
    }
  }
}

// Create instance of comprehensive exporter
window.comprehensiveReportExporter = new ComprehensiveReportExporter();

// Universal jsPDF detection function
window.getjsPDFClass = function() {
  // Try multiple possible namespaces for jsPDF
  const possiblePaths = [
    window.jsPDF?.jsPDF,  // Modern UMD format
    window.jsPDF,         // Direct assignment
    window.jspdf?.jsPDF,  // Lowercase variant
    window.jspdf,         // Lowercase direct
    window['jsPDF'],      // Bracket notation
    typeof jsPDF !== 'undefined' ? jsPDF : null  // Global variable
  ];
  
  for (const candidate of possiblePaths) {
    if (typeof candidate === 'function') {
      try {
        // Test if it's actually a jsPDF constructor
        const test = new candidate('p', 'mm', 'a4');
        if (test && typeof test.save === 'function') {
          return candidate;
        }
      } catch (e) {
        continue;
      }
    }
  }
  return null;
};

// Debug function to check jsPDF availability
window.checkjsPDFAvailability = function() {
  console.log('jsPDF availability check:');
  console.log('window.jsPDF:', typeof window.jsPDF, window.jsPDF);
  console.log('window.jsPDF.jsPDF:', typeof window.jsPDF?.jsPDF, window.jsPDF?.jsPDF);
  console.log('window.jspdf:', typeof window.jspdf, window.jspdf);
  
  const jsPDFClass = window.getjsPDFClass();
  console.log('Detected jsPDF class:', jsPDFClass);
  
  if (jsPDFClass) {
    console.log('jsPDF is working correctly!');
    return true;
  } else {
    console.error('jsPDF class not found');
    return false;
  }
};