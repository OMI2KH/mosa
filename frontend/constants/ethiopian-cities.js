// constants/ethiopian-cities.js

/**
 * 🎯 ENTERPRISE ETHIOPIAN CITIES DATABASE
 * Production-ready cities data with geolocation, zones, and regional metadata
 * Supports: Location services, expert matching, regional analytics, payment zones
 * 
 * @author Oumer Muktar
 * @poweredby Chereka
 */

class EthiopianCitiesDatabase {
  constructor() {
    this.cities = this.initializeCitiesData();
    this.regions = this.initializeRegionsData();
    this.zones = this.initializeZonesData();
    this.cache = new Map();
    this.lastUpdated = new Date().toISOString();
  }

  /**
   * 🏙️ COMPREHENSIVE CITIES DATABASE
   * Includes all Ethiopian cities with geolocation and economic data
   */
  initializeCitiesData() {
    return [
      // 🏛️ ADDIS ABABA (Special Zone)
      {
        id: 'aab-001',
        name: 'Addis Ababa',
        amharicName: 'አዲስ አበባ',
        region: 'Addis Ababa',
        zone: 'Special Zone',
        type: 'capital',
        population: 3500000,
        coordinates: {
          latitude: 9.005401,
          longitude: 38.763611,
          altitude: 2355
        },
        economicTier: 1,
        paymentZones: ['telebirr-premium', 'cbe-premium'],
        infrastructure: {
          internet: 'high',
          banking: 'premium',
          transportation: 'excellent',
          education: 'premium'
        },
        expertAvailability: 'high',
        trainingCenters: 45,
        isActive: true,
        metadata: {
          timezone: 'EAT',
          areaSqKm: 527,
          foundingYear: 1886,
          phoneCode: '011'
        }
      },

      // 🌆 MAJOR REGIONAL CAPITALS (Tier 1)
      {
        id: 'dr-001',
        name: 'Dire Dawa',
        amharicName: 'ድሬ ዳዋ',
        region: 'Dire Dawa',
        zone: 'Special Zone',
        type: 'regional_capital',
        population: 440000,
        coordinates: {
          latitude: 9.589229,
          longitude: 41.860190,
          altitude: 1276
        },
        economicTier: 1,
        paymentZones: ['telebirr-standard', 'cbe-standard'],
        infrastructure: {
          internet: 'medium',
          banking: 'good',
          transportation: 'good',
          education: 'good'
        },
        expertAvailability: 'medium',
        trainingCenters: 12,
        isActive: true,
        metadata: {
          timezone: 'EAT',
          areaSqKm: 155,
          foundingYear: 1902,
          phoneCode: '025'
        }
      },

      {
        id: 'am-001',
        name: 'Bahir Dar',
        amharicName: 'ባሕር ዳር',
        region: 'Amhara',
        zone: 'East Gojjam',
        type: 'regional_capital',
        population: 300000,
        coordinates: {
          latitude: 11.574209,
          longitude: 37.361353,
          altitude: 1800
        },
        economicTier: 1,
        paymentZones: ['telebirr-standard', 'cbe-standard'],
        infrastructure: {
          internet: 'medium',
          banking: 'good',
          transportation: 'good',
          education: 'good'
        },
        expertAvailability: 'medium',
        trainingCenters: 15,
        isActive: true,
        metadata: {
          timezone: 'EAT',
          areaSqKm: 213,
          foundingYear: 1930,
          phoneCode: '058'
        }
      },

      {
        id: 'or-001',
        name: 'Adama',
        amharicName: 'አዳማ',
        region: 'Oromia',
        zone: 'East Shewa',
        type: 'major_city',
        population: 450000,
        coordinates: {
          latitude: 8.541000,
          longitude: 39.268000,
          altitude: 1712
        },
        economicTier: 1,
        paymentZones: ['telebirr-premium', 'cbe-standard'],
        infrastructure: {
          internet: 'medium',
          banking: 'good',
          transportation: 'excellent',
          education: 'good'
        },
        expertAvailability: 'high',
        trainingCenters: 18,
        isActive: true,
        metadata: {
          timezone: 'EAT',
          areaSqKm: 167,
          foundingYear: 1955,
          phoneCode: '022'
        }
      },

      // 🏙️ TIER 2 CITIES (Economic Hubs)
      {
        id: 'tg-001',
        name: 'Mekele',
        amharicName: 'መቀሌ',
        region: 'Tigray',
        zone: 'Debubawi',
        type: 'regional_capital',
        population: 320000,
        coordinates: {
          latitude: 13.496700,
          longitude: 39.476700,
          altitude: 2084
        },
        economicTier: 2,
        paymentZones: ['telebirr-standard', 'cbe-basic'],
        infrastructure: {
          internet: 'medium',
          banking: 'good',
          transportation: 'good',
          education: 'good'
        },
        expertAvailability: 'medium',
        trainingCenters: 14,
        isActive: true,
        metadata: {
          timezone: 'EAT',
          areaSqKm: 145,
          foundingYear: 1884,
          phoneCode: '034'
        }
      },

      {
        id: 'sn-001',
        name: 'Hawassa',
        amharicName: 'ሀዋሳ',
        region: 'Sidama',
        zone: 'Special Zone',
        type: 'regional_capital',
        population: 350000,
        coordinates: {
          latitude: 7.050000,
          longitude: 38.466667,
          altitude: 1708
        },
        economicTier: 2,
        paymentZones: ['telebirr-standard', 'cbe-standard'],
        infrastructure: {
          internet: 'medium',
          banking: 'good',
          transportation: 'good',
          education: 'good'
        },
        expertAvailability: 'medium',
        trainingCenters: 16,
        isActive: true,
        metadata: {
          timezone: 'EAT',
          areaSqKm: 157,
          foundingYear: 1952,
          phoneCode: '046'
        }
      },

      {
        id: 'am-002',
        name: 'Gondar',
        amharicName: 'ጎንደር',
        region: 'Amhara',
        zone: 'North Gondar',
        type: 'historical_city',
        population: 400000,
        coordinates: {
          latitude: 12.600000,
          longitude: 37.466667,
          altitude: 2133
        },
        economicTier: 2,
        paymentZones: ['telebirr-standard', 'cbe-basic'],
        infrastructure: {
          internet: 'medium',
          banking: 'good',
          transportation: 'good',
          education: 'good'
        },
        expertAvailability: 'medium',
        trainingCenters: 13,
        isActive: true,
        metadata: {
          timezone: 'EAT',
          areaSqKm: 192,
          foundingYear: 1635,
          phoneCode: '058'
        }
      },

      // 🏘️ TIER 3 CITIES (Growing Urban Centers)
      {
        id: 'or-002',
        name: 'Jimma',
        amharicName: 'ጅማ',
        region: 'Oromia',
        zone: 'Jimma',
        type: 'economic_center',
        population: 200000,
        coordinates: {
          latitude: 7.666667,
          longitude: 36.833333,
          altitude: 1780
        },
        economicTier: 3,
        paymentZones: ['telebirr-basic', 'cbe-basic'],
        infrastructure: {
          internet: 'basic',
          banking: 'basic',
          transportation: 'medium',
          education: 'medium'
        },
        expertAvailability: 'low',
        trainingCenters: 8,
        isActive: true,
        metadata: {
          timezone: 'EAT',
          areaSqKm: 98,
          foundingYear: 1830,
          phoneCode: '047'
        }
      },

      {
        id: 'sn-002',
        name: 'Dilla',
        amharicName: 'ዲላ',
        region: 'Sidama',
        zone: 'Gedeo',
        type: 'agricultural_center',
        population: 150000,
        coordinates: {
          latitude: 6.416667,
          longitude: 38.316667,
          altitude: 1570
        },
        economicTier: 3,
        paymentZones: ['telebirr-basic'],
        infrastructure: {
          internet: 'basic',
          banking: 'basic',
          transportation: 'medium',
          education: 'medium'
        },
        expertAvailability: 'low',
        trainingCenters: 6,
        isActive: true,
        metadata: {
          timezone: 'EAT',
          areaSqKm: 87,
          foundingYear: 1900,
          phoneCode: '046'
        }
      },

      {
        id: 'am-003',
        name: 'Dessie',
        amharicName: 'ደሴ',
        region: 'Amhara',
        zone: 'South Wollo',
        type: 'commercial_center',
        population: 250000,
        coordinates: {
          latitude: 11.133333,
          longitude: 39.633333,
          altitude: 2470
        },
        economicTier: 3,
        paymentZones: ['telebirr-standard', 'cbe-basic'],
        infrastructure: {
          internet: 'medium',
          banking: 'good',
          transportation: 'good',
          education: 'medium'
        },
        expertAvailability: 'medium',
        trainingCenters: 10,
        isActive: true,
        metadata: {
          timezone: 'EAT',
          areaSqKm: 112,
          foundingYear: 1882,
          phoneCode: '033'
        }
      },

      // 🏞️ TIER 4 CITIES (Developing Urban Areas)
      {
        id: 'or-003',
        name: 'Nekemte',
        amharicName: 'ነቀምቴ',
        region: 'Oromia',
        zone: 'East Welega',
        type: 'administrative_center',
        population: 120000,
        coordinates: {
          latitude: 9.083333,
          longitude: 36.550000,
          altitude: 2088
        },
        economicTier: 4,
        paymentZones: ['telebirr-basic'],
        infrastructure: {
          internet: 'basic',
          banking: 'basic',
          transportation: 'basic',
          education: 'basic'
        },
        expertAvailability: 'low',
        trainingCenters: 5,
        isActive: true,
        metadata: {
          timezone: 'EAT',
          areaSqKm: 76,
          foundingYear: 1900,
          phoneCode: '057'
        }
      },

      {
        id: 'sn-003',
        name: 'Arba Minch',
        amharicName: 'አርባ ምንጭ',
        region: 'SNNPR',
        zone: 'Gamo Gofa',
        type: 'tourist_center',
        population: 110000,
        coordinates: {
          latitude: 6.033333,
          longitude: 37.550000,
          altitude: 1285
        },
        economicTier: 4,
        paymentZones: ['telebirr-basic'],
        infrastructure: {
          internet: 'basic',
          banking: 'basic',
          transportation: 'basic',
          education: 'basic'
        },
        expertAvailability: 'low',
        trainingCenters: 4,
        isActive: true,
        metadata: {
          timezone: 'EAT',
          areaSqKm: 68,
          foundingYear: 1960,
          phoneCode: '046'
        }
      },

      {
        id: 'am-004',
        name: 'Debre Markos',
        amharicName: 'ደብረ ማርቆስ',
        region: 'Amhara',
        zone: 'East Gojjam',
        type: 'educational_center',
        population: 130000,
        coordinates: {
          latitude: 10.333333,
          longitude: 37.716667,
          altitude: 2446
        },
        economicTier: 4,
        paymentZones: ['telebirr-basic'],
        infrastructure: {
          internet: 'basic',
          banking: 'basic',
          transportation: 'basic',
          education: 'good'
        },
        expertAvailability: 'low',
        trainingCenters: 7,
        isActive: true,
        metadata: {
          timezone: 'EAT',
          areaSqKm: 82,
          foundingYear: 1853,
          phoneCode: '058'
        }
      }
    ];
  }

  /**
   * 🗺️ REGIONS DATABASE
   */
  initializeRegionsData() {
    return {
      'Addis Ababa': {
        capital: 'Addis Ababa',
        population: 3500000,
        areaSqKm: 527,
        zones: ['Special Zone'],
        economicTier: 1,
        expertDensity: 'high',
        trainingCapacity: 'premium'
      },
      'Oromia': {
        capital: 'Adama',
        population: 35000000,
        areaSqKm: 284538,
        zones: ['East Shewa', 'West Shewa', 'North Shewa', 'East Welega', 'West Welega', 'Jimma', 'Arsi', 'Bale', 'Borena', 'Guji'],
        economicTier: 2,
        expertDensity: 'medium',
        trainingCapacity: 'good'
      },
      'Amhara': {
        capital: 'Bahir Dar',
        population: 29000000,
        areaSqKm: 154709,
        zones: ['North Gondar', 'South Gondar', 'North Wollo', 'South Wollo', 'East Gojjam', 'West Gojjam', 'Awi', 'Oromia', 'Wag Hemra'],
        economicTier: 2,
        expertDensity: 'medium',
        trainingCapacity: 'good'
      },
      'Tigray': {
        capital: 'Mekele',
        population: 7000000,
        areaSqKm: 50079,
        zones: ['Debubawi', 'Maekelawi', 'Semienawi', 'Mirabawi'],
        economicTier: 3,
        expertDensity: 'medium',
        trainingCapacity: 'medium'
      },
      'Sidama': {
        capital: 'Hawassa',
        population: 5000000,
        areaSqKm: 12500,
        zones: ['Special Zone', 'Gedeo'],
        economicTier: 3,
        expertDensity: 'medium',
        trainingCapacity: 'medium'
      },
      'SNNPR': {
        capital: 'Hawassa',
        population: 19000000,
        areaSqKm: 105887,
        zones: ['Gamo Gofa', 'Wolayita', 'Hadiya', 'Kembata', 'Gurage', 'Siltie', 'Bench Maji', 'Keffa', 'Sheka'],
        economicTier: 4,
        expertDensity: 'low',
        trainingCapacity: 'basic'
      },
      'Dire Dawa': {
        capital: 'Dire Dawa',
        population: 440000,
        areaSqKm: 155,
        zones: ['Special Zone'],
        economicTier: 2,
        expertDensity: 'medium',
        trainingCapacity: 'good'
      },
      'Afar': {
        capital: 'Semera',
        population: 2000000,
        areaSqKm: 72053,
        zones: ['Zone 1', 'Zone 2', 'Zone 3', 'Zone 4', 'Zone 5'],
        economicTier: 5,
        expertDensity: 'very_low',
        trainingCapacity: 'limited'
      },
      'Benishangul-Gumuz': {
        capital: 'Asosa',
        population: 1200000,
        areaSqKm: 50100,
        zones: ['Asosa', 'Kamashi', 'Metekel'],
        economicTier: 5,
        expertDensity: 'very_low',
        trainingCapacity: 'limited'
      },
      'Gambela': {
        capital: 'Gambela',
        population: 500000,
        areaSqKm: 29783,
        zones: ['Anywaa', 'Majang', 'Nuer'],
        economicTier: 5,
        expertDensity: 'very_low',
        trainingCapacity: 'limited'
      },
      'Harari': {
        capital: 'Harar',
        population: 270000,
        areaSqKm: 334,
        zones: ['Special Zone'],
        economicTier: 4,
        expertDensity: 'low',
        trainingCapacity: 'basic'
      },
      'Somali': {
        capital: 'Jijiga',
        population: 11000000,
        areaSqKm: 327000,
        zones: ['Sitti', 'Fafan', 'Jarar', 'Nogob', 'Erer', 'Dollo', 'Korahe', 'Shabelle', 'Afder', 'Liben'],
        economicTier: 5,
        expertDensity: 'very_low',
        trainingCapacity: 'limited'
      }
    };
  }

  /**
   * 🗾 ZONES DATABASE
   */
  initializeZonesData() {
    return {
      'Special Zone': {
        type: 'administrative',
        cities: ['Addis Ababa', 'Dire Dawa', 'Hawassa'],
        infrastructureLevel: 'high'
      },
      'East Shewa': {
        type: 'economic',
        cities: ['Adama', 'Bishoftu', 'Mojo'],
        infrastructureLevel: 'medium'
      },
      'North Gondar': {
        type: 'historical',
        cities: ['Gondar', 'Debark'],
        infrastructureLevel: 'medium'
      },
      'East Gojjam': {
        type: 'agricultural',
        cities: ['Bahir Dar', 'Debre Markos'],
        infrastructureLevel: 'medium'
      },
      'Jimma': {
        type: 'agricultural',
        cities: ['Jimma'],
        infrastructureLevel: 'basic'
      },
      'Gedeo': {
        type: 'agricultural',
        cities: ['Dilla'],
        infrastructureLevel: 'basic'
      },
      'South Wollo': {
        type: 'commercial',
        cities: ['Dessie', 'Kombolcha'],
        infrastructureLevel: 'medium'
      },
      'East Welega': {
        type: 'administrative',
        cities: ['Nekemte'],
        infrastructureLevel: 'basic'
      },
      'Gamo Gofa': {
        type: 'tourist',
        cities: ['Arba Minch'],
        infrastructureLevel: 'basic'
      }
    };
  }

  /**
   * 🎯 GET CITY BY ID
   */
  getCityById(cityId) {
    const cacheKey = `city:${cityId}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const city = this.cities.find(c => c.id === cityId);
    if (city) {
      this.cache.set(cacheKey, city);
      return city;
    }

    throw new Error(`CITY_NOT_FOUND: ${cityId}`);
  }

  /**
   * 🔍 GET CITIES BY REGION
   */
  getCitiesByRegion(regionName) {
    const cacheKey = `region:${regionName}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const cities = this.cities.filter(city => 
      city.region.toLowerCase() === regionName.toLowerCase()
    );

    this.cache.set(cacheKey, cities);
    return cities;
  }

  /**
   * 🎯 GET CITIES BY ECONOMIC TIER
   */
  getCitiesByEconomicTier(tier) {
    const cacheKey = `tier:${tier}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const cities = this.cities.filter(city => city.economicTier === tier);
    this.cache.set(cacheKey, cities);
    return cities;
  }

  /**
   * 📍 GET NEARBY CITIES
   */
  getNearbyCities(latitude, longitude, radiusKm = 50) {
    const cacheKey = `nearby:${latitude}:${longitude}:${radiusKm}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const nearbyCities = this.cities.filter(city => {
      const distance = this.calculateDistance(
        latitude,
        longitude,
        city.coordinates.latitude,
        city.coordinates.longitude
      );
      return distance <= radiusKm;
    });

    // Sort by distance
    nearbyCities.sort((a, b) => {
      const distA = this.calculateDistance(
        latitude,
        longitude,
        a.coordinates.latitude,
        a.coordinates.longitude
      );
      const distB = this.calculateDistance(
        latitude,
        longitude,
        b.coordinates.latitude,
        b.coordinates.longitude
      );
      return distA - distB;
    });

    this.cache.set(cacheKey, nearbyCities);
    return nearbyCities;
  }

  /**
   * 🧮 CALCULATE DISTANCE BETWEEN COORDINATES (Haversine formula)
   */
  calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Earth radius in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
    return R * c;
  }

  deg2rad(deg) {
    return deg * (Math.PI/180);
  }

  /**
   * 💰 GET PAYMENT SUPPORTED CITIES
   */
  getPaymentSupportedCities(paymentProvider) {
    const cacheKey = `payment:${paymentProvider}`;
    
    if (this.cache.has(cacheKey)) {
      return this.cache.get(cacheKey);
    }

    const supportedCities = this.cities.filter(city =>
      city.paymentZones.includes(paymentProvider)
    );

    this.cache.set(cacheKey, supportedCities);
    return supportedCities;
  }

  /**
   * 🎓 GET CITIES WITH TRAINING CENTERS
   */
  getCitiesWithTrainingCenters(minCenters = 1) {
    return this.cities.filter(city => 
      city.trainingCenters >= minCenters && city.isActive
    );
  }

  /**
   * 🌐 GET CITIES BY INFRASTRUCTURE LEVEL
   */
  getCitiesByInfrastructureLevel(infrastructureType, level) {
    return this.cities.filter(city =>
      city.infrastructure[infrastructureType] === level && city.isActive
    );
  }

  /**
   * 📊 GET REGIONAL STATISTICS
   */
  getRegionalStatistics(regionName) {
    const region = this.regions[regionName];
    if (!region) {
      throw new Error(`REGION_NOT_FOUND: ${regionName}`);
    }

    const citiesInRegion = this.getCitiesByRegion(regionName);
    
    return {
      region: regionName,
      totalCities: citiesInRegion.length,
      totalPopulation: citiesInRegion.reduce((sum, city) => sum + city.population, 0),
      averageEconomicTier: citiesInRegion.reduce((sum, city) => sum + city.economicTier, 0) / citiesInRegion.length,
      totalTrainingCenters: citiesInRegion.reduce((sum, city) => sum + city.trainingCenters, 0),
      expertAvailability: this.calculateRegionalExpertAvailability(citiesInRegion),
      paymentCoverage: this.calculatePaymentCoverage(citiesInRegion),
      infrastructureScore: this.calculateInfrastructureScore(citiesInRegion)
    };
  }

  /**
   * 👨‍🏫 CALCULATE REGIONAL EXPERT AVAILABILITY
   */
  calculateRegionalExpertAvailability(cities) {
    const availabilityMap = {
      'high': 3,
      'medium': 2,
      'low': 1,
      'very_low': 0
    };

    const totalScore = cities.reduce((sum, city) => 
      sum + availabilityMap[city.expertAvailability], 0
    );

    const averageScore = totalScore / cities.length;

    if (averageScore >= 2.5) return 'high';
    if (averageScore >= 1.5) return 'medium';
    if (averageScore >= 0.5) return 'low';
    return 'very_low';
  }

  /**
   * 💳 CALCULATE PAYMENT COVERAGE
   */
  calculatePaymentCoverage(cities) {
    const totalCities = cities.length;
    const telebirrCoverage = cities.filter(city => 
      city.paymentZones.some(zone => zone.includes('telebirr'))
    ).length;

    const cbeCoverage = cities.filter(city =>
      city.paymentZones.some(zone => zone.includes('cbe'))
    ).length;

    return {
      telebirr: Math.round((telebirrCoverage / totalCities) * 100),
      cbe: Math.round((cbeCoverage / totalCities) * 100),
      anyPayment: Math.round((cities.filter(city => city.paymentZones.length > 0).length / totalCities) * 100)
    };
  }

  /**
   * 🏗️ CALCULATE INFRASTRUCTURE SCORE
   */
  calculateInfrastructureScore(cities) {
    const infrastructureWeights = {
      internet: 0.3,
      banking: 0.25,
      transportation: 0.25,
      education: 0.2
    };

    const levelScores = {
      'premium': 4,
      'excellent': 3,
      'good': 2,
      'medium': 1,
      'basic': 0
    };

    let totalScore = 0;
    let totalWeight = 0;

    cities.forEach(city => {
      Object.entries(city.infrastructure).forEach(([type, level]) => {
        totalScore += levelScores[level] * infrastructureWeights[type];
        totalWeight += infrastructureWeights[type];
      });
    });

    const averageScore = totalScore / (cities.length * totalWeight);
    
    if (averageScore >= 3.5) return 'premium';
    if (averageScore >= 2.5) return 'good';
    if (averageScore >= 1.5) return 'medium';
    return 'basic';
  }

  /**
   * 🔄 SEARCH CITIES
   */
  searchCities(query, options = {}) {
    const {
      limit = 10,
      includeInactive = false,
      sortBy = 'population',
      sortOrder = 'desc'
    } = options;

    let results = this.cities.filter(city => {
      if (!includeInactive && !city.isActive) return false;

      const searchableFields = [
        city.name.toLowerCase(),
        city.amharicName,
        city.region.toLowerCase(),
        city.zone.toLowerCase(),
        city.type.toLowerCase()
      ];

      return searchableFields.some(field =>
        field.includes(query.toLowerCase())
      );
    });

    // Sort results
    results.sort((a, b) => {
      let aValue = a[sortBy];
      let bValue = b[sortBy];

      if (sortOrder === 'desc') {
        return bValue - aValue;
      }
      return aValue - bValue;
    });

    return results.slice(0, limit);
  }

  /**
   * 📈 GET PLATFORM EXPANSION RECOMMENDATIONS
   */
  getExpansionRecommendations() {
    const recommendations = [];

    // Find cities with good infrastructure but low expert availability
    const underservedCities = this.cities.filter(city =>
      city.infrastructure.internet === 'medium' &&
      city.expertAvailability === 'low' &&
      city.isActive
    );

    if (underservedCities.length > 0) {
      recommendations.push({
        type: 'EXPERT_RECRUITMENT',
        cities: underservedCities.slice(0, 5),
        priority: 'high',
        reason: 'Good infrastructure but limited expert availability'
      });
    }

    // Find cities with no payment support
    const noPaymentCities = this.cities.filter(city =>
      city.paymentZones.length === 0 &&
      city.isActive
    );

    if (noPaymentCities.length > 0) {
      recommendations.push({
        type: 'PAYMENT_INTEGRATION',
        cities: noPaymentCities.slice(0, 3),
        priority: 'medium',
        reason: 'No payment gateway integration'
      });
    }

    return recommendations;
  }

  /**
   * 🧹 CLEAR CACHE
   */
  clearCache() {
    this.cache.clear();
    this.lastUpdated = new Date().toISOString();
  }

  /**
   * 📊 GET DATABASE STATISTICS
   */
  getDatabaseStatistics() {
    const totalCities = this.cities.length;
    const activeCities = this.cities.filter(c => c.isActive).length;
    const totalPopulation = this.cities.reduce((sum, city) => sum + city.population, 0);
    
    const tierDistribution = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
    this.cities.forEach(city => {
      tierDistribution[city.economicTier]++;
    });

    return {
      totalCities,
      activeCities,
      totalPopulation,
      regionsCovered: Object.keys(this.regions).length,
      cacheSize: this.cache.size,
      lastUpdated: this.lastUpdated,
      tierDistribution,
      averageTrainingCenters: totalCities > 0 ? 
        this.cities.reduce((sum, city) => sum + city.trainingCenters, 0) / totalCities : 0
    };
  }
}

// Export singleton instance
module.exports = new EthiopianCitiesDatabase();