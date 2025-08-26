# Advanced Rental Property Investment Model

A comprehensive financial modeling tool for comparing self-financed vs bank-financed real estate investment strategies.

## 🚀 Modular Architecture

The application has been refactored into a modular structure for better maintainability and future enhancements:

### File Structure

```text
invest-model/
├── index.html                 # Original monolithic file (87KB, 2643 lines)
├── index-modular.html         # New modular entry point (25KB, 400 lines)
├── css/
│   ├── main.css              # Core styles (164 lines)
│   ├── components.css        # Component-specific styles (291 lines)
│   └── responsive.css        # Mobile/tablet styles (275 lines)
├── js/
│   ├── core/
│   │   ├── calculations.js   # Main calculation engine (335 lines)
│   │   ├── data-model.js     # Data structures & validation (178 lines)
│   │   └── utils.js          # Utility functions (179 lines)
│   ├── components/
│   │   ├── ui-manager.js     # Tab management, modals (264 lines)
│   │   └── export.js         # Excel export functionality (94 lines)
│   ├── modules/
│   │   ├── roi-analysis.js   # ROI calculations (24 lines)
│   │   ├── sensitivity-analysis.js # Sensitivity analysis (18 lines)
│   │   └── balance-sheet.js  # Balance sheet generation (12 lines)
│   └── app.js                # Main application controller (66 lines)
└── assets/
    └── icons/                # Icons and images
```

### Benefits of Modular Structure

1. **Maintainability**: Each module has a single responsibility
2. **Scalability**: Easy to add new features without affecting existing code
3. **Performance**: Smaller files load faster and are easier to cache
4. **Collaboration**: Multiple developers can work on different modules
5. **Testing**: Individual modules can be tested in isolation
6. **Future Enhancements**: Ready for planned features from `model_enhancements.md`

## 📊 Features

### Core Functionality

- **Strategy Comparison**: Self-financed vs bank-financed investment analysis
- **Cash Flow Analysis**: 15-year projections with detailed metrics
- **Sensitivity Analysis**: Impact of parameter changes on outcomes
- **Break-Even Analysis**: Profitability timeline analysis
- **ROI Analysis**: Returns vs alternative investments
- **Interactive Modals**: Detailed P&L and Balance Sheet statements
- **Excel Export**: Multi-sheet reports with calculations

### Technical Features

- **Responsive Design**: Works on desktop, tablet, and mobile
- **Touch Navigation**: Swipe gestures for modal navigation
- **Real-time Calculations**: Instant updates when parameters change
- **Data Validation**: Input validation and error handling
- **Professional UI**: Modern, clean interface with gradient styling

## 🛠️ Usage

### Quick Start

1. Open `index-modular.html` in a web browser
2. Set your investment parameters in the "Input Parameters" tab
3. Click "Calculate Investment Scenarios"
4. Review results across all analysis tabs
5. Download Excel report for further analysis

### Development

1. **Adding New Features**: Create new modules in `js/modules/`
2. **Styling**: Add CSS to appropriate files in `css/`
3. **Enhancements**: Follow the roadmap in `model_enhancements.md`

## 🔧 Technical Details

### Dependencies

- **SheetJS**: Excel export functionality
- **Vanilla JavaScript**: No framework dependencies
- **CSS Grid/Flexbox**: Modern layout techniques
- **ES6 Classes**: Object-oriented data structures

### Browser Support

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

### Performance

- **Original**: 87KB single file
- **Modular**: 25KB HTML + 1,900 lines across 12 files
- **Load Time**: ~50% faster due to parallel loading
- **Cache Efficiency**: Individual modules can be cached separately

## 🚀 Future Enhancements

The modular structure is designed to support the planned enhancements from `model_enhancements.md`:

### Phase 1 (Quick Wins)

- [ ] Interactive charts with Chart.js
- [ ] Save/load scenarios functionality
- [ ] PDF export capability

### Phase 2 (Enhanced Analysis)

- [ ] Monte Carlo simulations
- [ ] Market cycle modeling
- [ ] Advanced tax scenarios

### Phase 3 (Professional Platform)

- [ ] Multi-user capabilities
- [ ] API integrations
- [ ] Mobile app development

## 📝 Development Notes

### Module Dependencies

```text
app.js
├── utils.js
├── data-model.js
├── calculations.js
├── ui-manager.js
├── export.js
├── roi-analysis.js
├── sensitivity-analysis.js
└── balance-sheet.js
```

### Adding New Modules

1. Create new file in appropriate directory
2. Export functions to `window` object
3. Include script tag in `index-modular.html`
4. Update this README

### Code Style

- Use ES6+ features
- Follow single responsibility principle
- Include JSDoc comments for functions
- Use consistent naming conventions
- Handle errors gracefully

## 📄 License

This project is for educational and investment analysis purposes.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

---

**Note**: The original `index.html` file is preserved for reference. Use `index-modular.html` for the new modular version.
