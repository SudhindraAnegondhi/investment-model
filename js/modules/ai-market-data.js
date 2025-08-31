// AI Market Data Service
// Integrates with real estate APIs and AI services for dynamic market projections

class AIMarketDataService {
  constructor() {
    this.isEnabled = false;
    this.lastFetchTime = null;
    this.cachedData = null;
    this.cacheExpiryMinutes = 60; // Cache data for 1 hour
  }

  // Initialize AI services (called when AI is enabled)
  async initialize(location, propertyType) {
    this.isEnabled = true;
    this.location = location;
    this.propertyType = propertyType;
    console.log("🤖 AI Market Data Service initialized for:", location, propertyType);
  }

  // Check if cached data is still valid
  isCacheValid() {
    if (!this.cachedData || !this.lastFetchTime) return false;
    const now = new Date().getTime();
    const cacheAge = (now - this.lastFetchTime) / (1000 * 60); // minutes
    return cacheAge < this.cacheExpiryMinutes;
  }

  // Main function to get comprehensive market projections
  async getMarketProjections(location, propertyType, investmentYears = 15) {
    if (!this.isEnabled) {
      return this.getStaticFallbackData();
    }

    // Return cached data if still valid
    if (this.isCacheValid()) {
      console.log("📊 Using cached AI market data");
      return this.cachedData;
    }

    console.log("🔄 Fetching fresh AI market data...");
    
    try {
      // Fetch data from multiple sources in parallel
      const [propertyData, rentData, interestData, marketInsights] = await Promise.all([
        this.getPropertyPriceTrends(location, propertyType, investmentYears),
        this.getRentProjections(location, propertyType, investmentYears),
        this.getInterestRateForecasts(investmentYears),
        this.getMarketInsights(location, propertyType)
      ]);

      const projections = {
        location: location,
        propertyType: propertyType,
        lastUpdated: new Date().toISOString(),
        
        // Property appreciation projections (yearly percentages)
        propertyAppreciation: propertyData.yearlyGrowthRates,
        avgPropertyAppreciation: propertyData.averageRate,
        
        // Rent growth projections (yearly percentages)
        rentGrowth: rentData.yearlyGrowthRates,
        avgRentGrowth: rentData.averageRate,
        currentRentPerSqft: rentData.currentRentPerSqft,
        
        // Interest rate forecasts
        interestRates: interestData.yearlyRates,
        avgInterestRate: interestData.averageRate,
        
        // AI market insights
        marketConditions: marketInsights.conditions,
        riskFactors: marketInsights.riskFactors,
        opportunities: marketInsights.opportunities,
        confidence: marketInsights.confidence
      };

      // Cache the results
      this.cachedData = projections;
      this.lastFetchTime = new Date().getTime();
      
      console.log("✅ AI market data fetched and cached");
      return projections;
      
    } catch (error) {
      console.error("❌ AI market data fetch failed:", error);
      // Fall back to enhanced static projections
      return this.getStaticFallbackData();
    }
  }

  // Get property price trend projections
  async getPropertyPriceTrends(location, propertyType, years) {
    try {
      // Simulate API call to Zillow/RealtyMole/similar service
      const mockApiResponse = await this.simulatePropertyAPI(location, propertyType);
      
      // Use AI to analyze historical trends and project future
      const aiAnalysis = await this.analyzePropertyTrends(mockApiResponse, years);
      
      return {
        yearlyGrowthRates: aiAnalysis.projectedRates,
        averageRate: aiAnalysis.averageRate,
        confidence: aiAnalysis.confidence,
        dataSource: 'Zillow + AI Analysis'
      };
    } catch (error) {
      console.warn("Property price API failed, using regional averages");
      return this.getRegionalPropertyDefaults(location);
    }
  }

  // Get rent projection data
  async getRentProjections(location, propertyType, years) {
    try {
      // Simulate rent data API
      const rentData = await this.simulateRentAPI(location, propertyType);
      
      // AI analysis of rent trends
      const aiRentAnalysis = await this.analyzeRentTrends(rentData, years);
      
      return {
        yearlyGrowthRates: aiRentAnalysis.projectedRates,
        averageRate: aiRentAnalysis.averageRate,
        currentRentPerSqft: rentData.currentRentPerSqft,
        confidence: aiRentAnalysis.confidence,
        dataSource: 'Rentometer + AI Analysis'
      };
    } catch (error) {
      console.warn("Rent API failed, using market averages");
      return this.getRegionalRentDefaults(location);
    }
  }

  // Get interest rate forecasts
  async getInterestRateForecasts(years) {
    try {
      // Fetch from FRED API (Federal Reserve Economic Data)
      const fredData = await this.fetchFREDData();
      
      // AI analysis of interest rate trends
      const aiRateAnalysis = await this.analyzeInterestTrends(fredData, years);
      
      return {
        yearlyRates: aiRateAnalysis.projectedRates,
        averageRate: aiRateAnalysis.averageRate,
        confidence: aiRateAnalysis.confidence,
        dataSource: 'Federal Reserve + AI Analysis'
      };
    } catch (error) {
      console.warn("Interest rate API failed, using current rates");
      return this.getCurrentRateDefaults();
    }
  }

  // Get comprehensive market insights using AI
  async getMarketInsights(location, propertyType) {
    try {
      // This would use Claude API or similar for market analysis
      const prompt = `Analyze the current real estate market conditions for ${propertyType} properties in ${location.city}, ${location.state}. 
      
      Consider:
      - Local economic indicators
      - Population growth trends  
      - Employment market
      - New construction pipeline
      - Regulatory environment
      - Interest rate environment impact
      
      Provide:
      1. Current market conditions (hot/balanced/cool)
      2. Key risk factors for investors
      3. Investment opportunities
      4. Confidence level (1-10)`;

      // Simulate AI API call
      const aiInsights = await this.callAIService(prompt);
      
      return {
        conditions: aiInsights.marketConditions,
        riskFactors: aiInsights.risks,
        opportunities: aiInsights.opportunities,
        confidence: aiInsights.confidence,
        summary: aiInsights.summary
      };
    } catch (error) {
      console.warn("AI insights failed, using general market data");
      return this.getGeneralMarketInsights();
    }
  }

  // Simulate property data API (replace with real API calls)
  async simulatePropertyAPI(location, propertyType) {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Mock realistic property data based on location
    const locationMultipliers = {
      'California': 1.4,
      'Texas': 1.1,
      'Florida': 1.2,
      'New York': 1.5,
      'Illinois': 1.2,
      'default': 1.0
    };
    
    const baseGrowth = 3.5; // Base property appreciation %
    const multiplier = locationMultipliers[location.state] || locationMultipliers.default;
    
    return {
      historicalGrowth: baseGrowth * multiplier,
      currentMedianPrice: 450000 * multiplier,
      marketTrend: multiplier > 1.2 ? 'appreciating' : 'stable',
      dataPoints: Array.from({length: 5}, (_, i) => ({
        year: 2024 - i,
        growth: (baseGrowth * multiplier) + (Math.random() - 0.5) * 2
      }))
    };
  }

  // Simulate rent data API
  async simulateRentAPI(location, propertyType) {
    await new Promise(resolve => setTimeout(resolve, 800));
    
    const locationRentMultipliers = {
      'California': 1.6,
      'New York': 1.7,
      'Texas': 1.0,
      'Florida': 1.1,
      'Illinois': 1.3,
      'default': 0.9
    };
    
    const baseRent = 1.8; // Base rent per sq ft
    const multiplier = locationRentMultipliers[location.state] || locationRentMultipliers.default;
    
    return {
      currentRentPerSqft: baseRent * multiplier,
      historicalGrowth: 2.8 * multiplier,
      marketCondition: multiplier > 1.3 ? 'tight' : 'balanced'
    };
  }

  // Fetch real FRED data (simplified simulation)
  async fetchFREDData() {
    await new Promise(resolve => setTimeout(resolve, 600));
    
    // Current federal funds rate + spreads
    const federalFundsRate = 5.25;
    const mortgageSpread = 1.5;
    const currentMortgageRate = federalFundsRate + mortgageSpread;
    
    return {
      currentRate: currentMortgageRate,
      trend: 'declining', // Based on Fed policy
      volatility: 'moderate'
    };
  }

  // AI analysis of property trends (simulated)
  async analyzePropertyTrends(data, years) {
    await new Promise(resolve => setTimeout(resolve, 1200));
    
    const baseRate = data.historicalGrowth;
    const projectedRates = [];
    
    for (let year = 1; year <= years; year++) {
      // AI-enhanced projection: gradual normalization toward long-term average
      let yearlyRate = baseRate;
      
      if (year <= 3) {
        // Near-term: current trends continue
        yearlyRate = baseRate;
      } else if (year <= 8) {
        // Medium-term: gradual normalization
        yearlyRate = baseRate * (1 - (year - 3) * 0.05);
      } else {
        // Long-term: revert to historical average
        yearlyRate = Math.max(2.5, baseRate * 0.7);
      }
      
      projectedRates.push(Math.max(0, yearlyRate));
    }
    
    return {
      projectedRates: projectedRates,
      averageRate: projectedRates.reduce((a, b) => a + b) / projectedRates.length,
      confidence: 0.75
    };
  }

  // AI analysis of rent trends
  async analyzeRentTrends(data, years) {
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const baseGrowth = data.historicalGrowth;
    const projectedRates = [];
    
    for (let year = 1; year <= years; year++) {
      // Rent growth typically more stable than property prices
      let yearlyRate = baseGrowth;
      
      if (year <= 5) {
        yearlyRate = baseGrowth;
      } else {
        // Long-term convergence to inflation + 1%
        yearlyRate = Math.max(2.0, baseGrowth * 0.8);
      }
      
      projectedRates.push(yearlyRate);
    }
    
    return {
      projectedRates: projectedRates,
      averageRate: projectedRates.reduce((a, b) => a + b) / projectedRates.length,
      confidence: 0.8
    };
  }

  // AI analysis of interest rate trends
  async analyzeInterestTrends(data, years) {
    await new Promise(resolve => setTimeout(resolve, 900));
    
    const currentRate = data.currentRate;
    const projectedRates = [];
    
    for (let year = 1; year <= years; year++) {
      // Interest rate projection based on Fed policy and economic cycles
      let yearlyRate = currentRate;
      
      if (year <= 2) {
        // Near-term: slight decline expected
        yearlyRate = currentRate - (year * 0.25);
      } else if (year <= 7) {
        // Medium-term: gradual increase
        yearlyRate = currentRate - 0.5 + ((year - 2) * 0.15);
      } else {
        // Long-term: revert to historical average
        yearlyRate = 4.5; // Long-term historical average
      }
      
      projectedRates.push(Math.max(2.0, Math.min(8.0, yearlyRate)));
    }
    
    return {
      projectedRates: projectedRates,
      averageRate: projectedRates.reduce((a, b) => a + b) / projectedRates.length,
      confidence: 0.6 // Interest rates are harder to predict
    };
  }

  // Call AI service for market insights (simulated)
  async callAIService(prompt) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Simulate AI analysis response
    return {
      marketConditions: 'balanced',
      risks: [
        'Interest rate volatility',
        'Economic uncertainty',
        'Local regulation changes'
      ],
      opportunities: [
        'Population growth in target area',
        'Limited new supply',
        'Strong rental demand'
      ],
      confidence: 0.75,
      summary: 'Market conditions are generally favorable for long-term real estate investment with moderate growth expectations.'
    };
  }

  // Fallback data when AI is disabled or APIs fail
  getStaticFallbackData() {
    return {
      location: { city: 'Generic', state: 'US', zipCode: '00000' },
      propertyType: 'single-family',
      lastUpdated: new Date().toISOString(),
      
      propertyAppreciation: Array(15).fill(3.5), // Static 3.5% annually
      avgPropertyAppreciation: 3.5,
      
      rentGrowth: Array(15).fill(2.8), // Static 2.8% annually
      avgRentGrowth: 2.8,
      currentRentPerSqft: 1.8,
      
      interestRates: Array(15).fill(6.75), // Static current rate
      avgInterestRate: 6.75,
      
      marketConditions: 'static_model',
      riskFactors: ['Static assumptions may not reflect market reality'],
      opportunities: ['Enable AI for dynamic market analysis'],
      confidence: 0.5
    };
  }

  // Regional defaults when APIs fail but location is known
  getRegionalPropertyDefaults(location) {
    const regionalData = {
      'California': { growth: 4.2, confidence: 0.7 },
      'Texas': { growth: 3.8, confidence: 0.8 },
      'Florida': { growth: 4.0, confidence: 0.75 },
      'New York': { growth: 3.2, confidence: 0.7 },
      'Illinois': { growth: 3.6, confidence: 0.75 },
      'default': { growth: 3.5, confidence: 0.6 }
    };
    
    const data = regionalData[location.state] || regionalData.default;
    
    return {
      yearlyGrowthRates: Array(15).fill(data.growth),
      averageRate: data.growth,
      confidence: data.confidence
    };
  }

  getRegionalRentDefaults(location) {
    const regionalRent = {
      'California': { growth: 3.2, rent: 2.8 },
      'Texas': { growth: 2.5, rent: 1.4 },
      'Florida': { growth: 2.8, rent: 1.9 },
      'New York': { growth: 2.2, rent: 3.2 },
      'Illinois': { growth: 2.6, rent: 2.1 },
      'default': { growth: 2.8, rent: 1.8 }
    };
    
    const data = regionalRent[location.state] || regionalRent.default;
    
    return {
      yearlyGrowthRates: Array(15).fill(data.growth),
      averageRate: data.growth,
      currentRentPerSqft: data.rent
    };
  }

  getCurrentRateDefaults() {
    return {
      yearlyRates: Array(15).fill(6.75),
      averageRate: 6.75,
      confidence: 0.5
    };
  }

  getGeneralMarketInsights() {
    return {
      conditions: 'unknown',
      riskFactors: ['Market data unavailable'],
      opportunities: ['Enable AI for market insights'],
      confidence: 0.3,
      summary: 'Enable AI market analysis for location-specific insights.'
    };
  }

  // Utility function to validate location data
  isValidLocation(location) {
    return location && 
           location.city && 
           location.state && 
           location.city.trim() !== '' && 
           location.state.trim() !== '';
  }

  // Get human-readable status
  getStatus() {
    if (!this.isEnabled) return 'AI Disabled - Using Static Data';
    if (this.isCacheValid()) return `AI Active - Data Cached (${Math.round((new Date().getTime() - this.lastFetchTime) / 60000)} min ago)`;
    return 'AI Active - Data Needs Refresh';
  }
}

// Create global instance
window.aiMarketData = new AIMarketDataService();

// Make functions globally available
window.aiMarketData.service = {
  initialize: (location, propertyType) => window.aiMarketData.initialize(location, propertyType),
  getProjections: (location, propertyType, years) => window.aiMarketData.getMarketProjections(location, propertyType, years),
  getStatus: () => window.aiMarketData.getStatus(),
  isEnabled: () => window.aiMarketData.isEnabled
};