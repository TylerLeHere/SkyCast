// API Configuration
const API_KEY = 'YOUR_OPENWEATHER_API_KEY'; // Replace with your API key
const WEATHER_API_BASE = 'https://api.openweathermap.org/data/2.5';

// Cache keys
const CACHE_KEYS = {
    FAVORITES: 'skycast_favorites',
    LAST_WEATHER: 'skycast_last_weather',
    SETTINGS: 'skycast_settings'
};

// App State
const state = {
    unit: 'celsius',
    theme: 'light',
    favorites: [],
    lastUpdate: null,
    offline: false
};

// DOM Elements
const elements = {
    searchInput: document.querySelector('.search-input'),
    searchButton: document.querySelector('.search-button'),
    locationButton: document.querySelector('.location-button'),
    unitToggle: document.querySelector('.unit-toggle'),
    themeToggle: document.querySelector('.theme-toggle'),
    favoritesButton: document.querySelector('.favorites-button'),
    weatherContainer: document.querySelector('.weather-container'),
    messageContainer: document.querySelector('.message-container'),
    loadingSpinner: document.getElementById('loadingSpinner'),
    errorMessage: document.getElementById('errorMessage'),
    offlineMessage: document.getElementById('offlineMessage'),
    initialMessage: document.getElementById('initialMessage'),
    notificationContainer: document.getElementById('notificationContainer'),
    favoritesModal: document.getElementById('favoritesModal')
};


// Initialize the application
async function initializeApp() {
    loadSettings();
    setupEventListeners();
    checkOnlineStatus();
    
    // Try to get user's location
    if (navigator.geolocation) {
        try {
            const position = await getCurrentPosition();
            const { latitude, longitude } = position.coords;
            await getWeatherByCoordinates(latitude, longitude);
        } catch (error) {
            showInitialMessage();
        }
    } else {
        showInitialMessage();
    }
}

// Event Listeners Setup
function setupEventListeners() {
    // Search
    elements.searchButton.addEventListener('click', handleSearch);
    elements.searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') handleSearch();
    });

    // Location
    elements.locationButton.addEventListener('click', handleLocationRequest);

    // Settings
    elements.unitToggle.addEventListener('click', toggleTemperatureUnit);
    elements.themeToggle.addEventListener('click', toggleTheme);
    
    // Favorites
    elements.favoritesButton.addEventListener('click', toggleFavoritesModal);

    // Online/Offline
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
}

// Weather Icon Mapping
function getWeatherIcon(id) {
    if (id <= 232) return 'thunderstorm.svg';
    if (id <= 321) return 'drizzle.svg';
    if (id <= 531) return 'rain.svg';
    if (id <= 622) return 'snow.svg';
    if (id <= 781) return 'atmosphere.svg';
    if (id === 800) return 'clear.svg';
    return 'clouds.svg';
}

// Weather Recommendations
function getWeatherRecommendations(weatherData) {
    const { temp, feels_like, description, humidity, wind_speed } = weatherData.current;
    const recommendations = [];

    // Temperature based recommendations
    if (feels_like < 10) {
        recommendations.push('Wear warm clothes today');
    } else if (feels_like > 30) {
        recommendations.push('Stay hydrated and avoid prolonged sun exposure');
    }

    // Activity recommendations
    if (description.includes('rain') || description.includes('storm')) {
        recommendations.push('Take an umbrella');
        recommendations.push('Not ideal for outdoor activities');
    } else if (description.includes('snow')) {
        recommendations.push('Wear winter boots and warm clothing');
    } else if (description.includes('clear')) {
        if (temp > 20 && temp < 28 && wind_speed < 5) {
            recommendations.push('Perfect weather for outdoor activities!');
        }
    }

    // UV Index based recommendations (if available)
    if (weatherData.uvi > 7) {
        recommendations.push('High UV index - use sunscreen');
    }

    return recommendations;
}

// Date Formatting
function formatDate(date, options = {}) {
    const defaultOptions = {
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric'
    };
    return new Date(date).toLocaleDateString(undefined, { ...defaultOptions, ...options });
}

// Weather Data Fetching
async function getWeatherByCity(city) {
    try {
        showLoading();
        
        const [weather, forecast, air] = await Promise.all([
            fetch(`${WEATHER_API_BASE}/weather?q=${city}&appid=${API_KEY}&units=metric`),
            fetch(`${WEATHER_API_BASE}/forecast?q=${city}&appid=${API_KEY}&units=metric`),
            fetch(`${WEATHER_API_BASE}/air_pollution?q=${city}&appid=${API_KEY}`)
        ]);

        if (!weather.ok || !forecast.ok) {
            throw new Error('City not found');
        }

        const weatherData = await weather.json();
        const forecastData = await forecast.json();
        const airData = await air.json();
        
        const fullData = processWeatherData(weatherData, forecastData, airData);
        updateUI(fullData);
        cacheWeatherData(fullData);
        
        hideLoading();
    } catch (error) {
        handleError(error);
    }
}

// Weather Data Processing
function processWeatherData(weather, forecast, air) {
    return {
        location: {
            name: weather.name,
            country: weather.sys.country,
            coord: weather.coord,
            timezone: weather.timezone
        },
        current: {
            temp: Math.round(weather.main.temp),
            feels_like: Math.round(weather.main.feels_like),
            humidity: weather.main.humidity,
            pressure: weather.main.pressure,
            visibility: weather.visibility,
            wind_speed: weather.wind.speed,
            wind_deg: weather.wind.deg,
            description: weather.weather[0].description,
            icon: getWeatherIcon(weather.weather[0].id)
        },
        air_quality: {
            aqi: air.list[0].main.aqi,
            components: air.list[0].components
        },
        forecast: processForecastData(forecast),
        sun: {
            sunrise: new Date(weather.sys.sunrise * 1000),
            sunset: new Date(weather.sys.sunset * 1000)
        },
        lastUpdate: new Date()
    };
}

// Forecast Processing
function processForecastData(forecast) {
    const hourly = forecast.list.slice(0, 24).map(item => ({
        time: new Date(item.dt * 1000),
        temp: Math.round(item.main.temp),
        feels_like: Math.round(item.main.feels_like),
        humidity: item.main.humidity,
        wind_speed: item.wind.speed,
        description: item.weather[0].description,
        icon: getWeatherIcon(item.weather[0].id),
        precipitation: item.pop * 100
    }));

    const daily = groupForecastByDay(forecast.list);

    return { hourly, daily };
}

function groupForecastByDay(forecastList) {
    const dailyForecasts = {};
    
    forecastList.forEach(item => {
        const date = new Date(item.dt * 1000).toLocaleDateString();
        
        if (!dailyForecasts[date]) {
            dailyForecasts[date] = {
                temps: [],
                icons: [],
                precipitation: [],
                wind_speeds: []
            };
        }
        
        dailyForecasts[date].temps.push(item.main.temp);
        dailyForecasts[date].icons.push(item.weather[0].id);
        dailyForecasts[date].precipitation.push(item.pop);
        dailyForecasts[date].wind_speeds.push(item.wind.speed);
    });
    
    return Object.entries(dailyForecasts).map(([date, data]) => ({
        date: new Date(date),
        temp_max: Math.round(Math.max(...data.temps)),
        temp_min: Math.round(Math.min(...data.temps)),
        icon: getWeatherIcon(getMostFrequent(data.icons)),
        precipitation: Math.round(Math.max(...data.precipitation) * 100),
        wind_speed: Math.round(average(data.wind_speeds))
    })).slice(1, 8); // Next 7 days
}

// UI Updates
function updateUI(data) {
    if (!data) return;
    
    updateCurrentWeather(data);
    updateHourlyForecast(data.forecast.hourly);
    updateDailyForecast(data.forecast.daily);
    updateSunInfo(data.sun);
    updateAirQuality(data.air_quality);
    updateRecommendations(data);
    
    hideMessages();
    showWeatherContainer();
}

// Utility Functions
function getMostFrequent(arr) {
    return arr.sort((a,b) =>
        arr.filter(v => v === a).length - arr.filter(v => v === b).length
    ).pop();
}

function average(arr) {
    return arr.reduce((a, b) => a + b, 0) / arr.length;
}

// Display Management
function showWeatherContainer() {
    elements.weatherContainer.style.display = 'grid';
    elements.messageContainer.style.display = 'none';
}

function showMessage(messageElement) {
    elements.weatherContainer.style.display = 'none';
    elements.messageContainer.style.display = 'flex';
    
    // Hide all messages first
    elements.initialMessage.style.display = 'none';
    elements.errorMessage.style.display = 'none';
    elements.offlineMessage.style.display = 'none';
    elements.loadingSpinner.style.display = 'none';
    
    // Show the requested message
    messageElement.style.display = 'flex';
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', initializeApp);