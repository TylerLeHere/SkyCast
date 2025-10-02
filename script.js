// API Configuration
const API_KEY = "eeaf561ec5f8ac915dea0e6c6a64a727" // Get your free API key from: https://openweathermap.org/api
const WEATHER_API_BASE = "https://api.openweathermap.org/data/2.5"

// Check if API key is set
if (API_KEY === "eeaf561ec5f8ac915dea0e6c6a64a727") {
  console.warn("Please set your OpenWeatherMap API key in script.js")
  console.info("Get a free API key at: https://openweathermap.org/api")
}

// Cache keys
const CACHE_KEYS = {
  FAVORITES: "skycast_favorites",
  LAST_WEATHER: "skycast_last_weather",
  SETTINGS: "skycast_settings",
}

// App State
const state = {
  unit: "celsius",
  theme: "light",
  favorites: [],
  lastUpdate: null,
  offline: false,
  currentWeatherData: null,
}

// DOM Elements
const elements = {
  searchInput: document.querySelector(".search-input"),
  searchButton: document.querySelector(".search-button"),
  locationButton: document.querySelector(".location-button"),
  unitToggle: document.querySelector(".unit-toggle"),
  themeToggle: document.querySelector(".theme-toggle"),
  favoritesButton: document.querySelector(".favorites-button"),
  addFavorite: document.querySelector(".add-favorite"),
  weatherContainer: document.querySelector(".weather-container"),
  messageContainer: document.querySelector(".message-container"),
  loadingSpinner: document.getElementById("loadingSpinner"),
  errorMessage: document.getElementById("errorMessage"),
  offlineMessage: document.getElementById("offlineMessage"),
  initialMessage: document.getElementById("initialMessage"),
  notificationContainer: document.getElementById("notificationContainer"),
  favoritesModal: document.getElementById("favoritesModal"),
  cityName: document.querySelector(".city-name"),
  currentDate: document.querySelector(".current-date"),
  localTime: document.querySelector(".local-time"),
  temperature: document.querySelector(".temperature"),
  weatherDescription: document.querySelector(".weather-description"),
  feelsLike: document.querySelector(".feels-like"),
  weatherIcon: document.querySelector(".weather-icon"),
  hourlyContainer: document.querySelector(".hourly-forecast-container"),
  forecastContainer: document.querySelector(".forecast-container"),
  weatherAlert: document.querySelector(".weather-alert"),
  recommendationsContainer: document.querySelector(".weather-recommendations"),
  sunriseTimes: document.querySelectorAll(".sun-info .detail-value"),
  moonPhase: document.querySelector(".moon-info .detail-value"),
  searchSuggestions: null, // Will be created dynamically
}

// Debounce function for search suggestions
let searchTimeout = null

// Initialize the application
async function initializeApp() {
  loadSettings()
  setupEventListeners()
  checkOnlineStatus()
  createSuggestionsDropdown()

  const cachedWeather = loadCachedWeather()
  if (cachedWeather) {
    updateUI(cachedWeather)
    showNotification("Showing cached weather data", "info")
  } else {
    showInitialMessage()
  }
}

// Create suggestions dropdown
function createSuggestionsDropdown() {
  const searchBox = document.querySelector(".search-box")
  const suggestionsDiv = document.createElement("div")
  suggestionsDiv.className = "search-suggestions"
  suggestionsDiv.id = "searchSuggestions"
  searchBox.appendChild(suggestionsDiv)
  elements.searchSuggestions = suggestionsDiv
}

// Event Listeners Setup
function setupEventListeners() {
  // Search
  elements.searchButton.addEventListener("click", handleSearch)
  elements.searchInput.addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      handleSearch()
      hideSuggestions()
    }
  })

  // Search suggestions on input
  elements.searchInput.addEventListener("input", handleSearchInput)

  // Close suggestions when clicking outside
  document.addEventListener("click", (e) => {
    if (!e.target.closest(".search-box")) {
      hideSuggestions()
    }
  })

  // Location
  elements.locationButton.addEventListener("click", handleLocationRequest)

  // Settings
  elements.unitToggle.addEventListener("click", toggleTemperatureUnit)
  elements.themeToggle.addEventListener("click", toggleTheme)

  // Favorites
  elements.favoritesButton.addEventListener("click", toggleFavoritesModal)
  if (elements.addFavorite) {
    elements.addFavorite.addEventListener("click", addToFavorites)
  }

  // Modal close
  const closeModal = document.querySelector(".close-modal")
  if (closeModal) {
    closeModal.addEventListener("click", toggleFavoritesModal)
  }

  // Click outside modal to close
  elements.favoritesModal.addEventListener("click", (e) => {
    if (e.target === elements.favoritesModal) {
      toggleFavoritesModal()
    }
  })

  // Online/Offline
  window.addEventListener("online", handleOnline)
  window.addEventListener("offline", handleOffline)

  // Hourly forecast scroll buttons
  const leftScroll = document.querySelector(".scroll-button.left")
  const rightScroll = document.querySelector(".scroll-button.right")

  if (leftScroll) {
    leftScroll.addEventListener("click", () => {
      elements.hourlyContainer.scrollBy({ left: -200, behavior: "smooth" })
    })
  }

  if (rightScroll) {
    rightScroll.addEventListener("click", () => {
      elements.hourlyContainer.scrollBy({ left: 200, behavior: "smooth" })
    })
  }
}

// Handle search input for suggestions
function handleSearchInput(e) {
  const query = e.target.value.trim()

  // Clear previous timeout
  if (searchTimeout) {
    clearTimeout(searchTimeout)
  }

  if (query.length < 2) {
    hideSuggestions()
    return
  }

  // Debounce the search
  searchTimeout = setTimeout(() => {
    fetchCitySuggestions(query)
  }, 300)
}

// Fetch city suggestions from OpenWeather Geocoding API
async function fetchCitySuggestions(query) {
  if (API_KEY === "YOUR_API_KEY_HERE") {
    return
  }

  try {
    const response = await fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${query}&limit=5&appid=${API_KEY}`)

    if (!response.ok) {
      hideSuggestions()
      return
    }

    const suggestions = await response.json()
    displaySuggestions(suggestions)
  } catch (error) {
    console.error("Error fetching suggestions:", error)
    hideSuggestions()
  }
}

// Display suggestions dropdown
function displaySuggestions(suggestions) {
  if (!suggestions || suggestions.length === 0) {
    hideSuggestions()
    return
  }

  elements.searchSuggestions.innerHTML = suggestions
    .map((city) => {
      const displayName = `${city.name}, ${city.state ? city.state + ", " : ""}${city.country}`
      return `
            <div class="suggestion-item" data-lat="${city.lat}" data-lon="${city.lon}" data-name="${city.name}">
                <span class="material-symbols-outlined">location_on</span>
                <div class="suggestion-info">
                    <div class="suggestion-name">${city.name}</div>
                    <div class="suggestion-location">${city.state ? city.state + ", " : ""}${city.country}</div>
                </div>
            </div>
        `
    })
    .join("")

  elements.searchSuggestions.classList.add("active")

  // Add click listeners to suggestions
  const suggestionItems = elements.searchSuggestions.querySelectorAll(".suggestion-item")
  suggestionItems.forEach((item) => {
    item.addEventListener("click", () => {
      const lat = Number.parseFloat(item.dataset.lat)
      const lon = Number.parseFloat(item.dataset.lon)
      const name = item.dataset.name

      elements.searchInput.value = name
      hideSuggestions()
      getWeatherByCoordinates(lat, lon)
    })
  })
}

// Hide suggestions
function hideSuggestions() {
  if (elements.searchSuggestions) {
    elements.searchSuggestions.classList.remove("active")
    elements.searchSuggestions.innerHTML = ""
  }
}

// Handle Search
async function handleSearch() {
  const city = elements.searchInput.value.trim()

  if (!city) {
    showNotification("Please enter a city name", "error")
    return
  }

  if (API_KEY === "YOUR_API_KEY_HERE") {
    showNotification("API key not configured. Check console for instructions.", "error")
    console.error("🔑 Setup Instructions:")
    console.info("1. Go to https://openweathermap.org/api")
    console.info("2. Sign up for a free account")
    console.info("3. Generate an API key")
    console.info("4. Replace YOUR_API_KEY_HERE in script.js with your key")
    return
  }

  await getWeatherByCity(city)
  elements.searchInput.value = ""
}

// Handle Location Request
async function handleLocationRequest() {
  if (!navigator.geolocation) {
    showNotification("Geolocation is not supported by your browser", "error")
    return
  }

  showLoading()

  try {
    const position = await getCurrentPosition()
    const { latitude, longitude } = position.coords
    await getWeatherByCoordinates(latitude, longitude)
  } catch (error) {
    hideLoading()
    showNotification("Unable to get your location", "error")
  }
}

// Get Current Position Promise
function getCurrentPosition() {
  return new Promise((resolve, reject) => {
    navigator.geolocation.getCurrentPosition(resolve, reject, {
      timeout: 10000,
      enableHighAccuracy: true,
    })
  })
}

// Temperature Unit Toggle
function toggleTemperatureUnit() {
  state.unit = state.unit === "celsius" ? "fahrenheit" : "celsius"
  elements.unitToggle.textContent = state.unit === "celsius" ? "°C" : "°F"
  saveSettings()

  if (state.currentWeatherData) {
    updateTemperatureDisplay()
  }
}

// Update Temperature Display
function updateTemperatureDisplay() {
  const data = state.currentWeatherData
  if (!data) return

  const temp = convertTemperature(data.current.temp)
  const feelsLike = convertTemperature(data.current.feels_like)

  elements.temperature.textContent = `${temp}°${state.unit === "celsius" ? "C" : "F"}`
  elements.feelsLike.textContent = `Feels like ${feelsLike}°${state.unit === "celsius" ? "C" : "F"}`

  // Update hourly and daily forecasts
  if (data.forecast) {
    updateHourlyForecast(data.forecast.hourly)
    updateDailyForecast(data.forecast.daily)
  }
}

// Convert Temperature
function convertTemperature(celsius) {
  if (state.unit === "fahrenheit") {
    return Math.round((celsius * 9) / 5 + 32)
  }
  return Math.round(celsius)
}

// Theme Toggle
function toggleTheme() {
  state.theme = state.theme === "light" ? "dark" : "light"
  document.body.classList.toggle("dark-theme")

  const icon = elements.themeToggle.querySelector(".material-symbols-outlined")
  icon.textContent = state.theme === "dark" ? "light_mode" : "dark_mode"

  saveSettings()
}

// Favorites Management
function toggleFavoritesModal() {
  elements.favoritesModal.classList.toggle("active")
  if (elements.favoritesModal.classList.contains("active")) {
    renderFavorites()
  }
}

function addToFavorites() {
  if (!state.currentWeatherData) return

  const location = state.currentWeatherData.location
  const favorite = {
    name: location.name,
    country: location.country,
    coord: location.coord,
  }

  // Check if already in favorites
  const exists = state.favorites.some((fav) => fav.name === favorite.name && fav.country === favorite.country)

  if (exists) {
    showNotification("Location already in favorites", "info")
    return
  }

  state.favorites.push(favorite)
  saveFavorites()
  updateFavoriteButton()
  showNotification("Added to favorites", "success")
}

function removeFavorite(index) {
  state.favorites.splice(index, 1)
  saveFavorites()
  renderFavorites()
  updateFavoriteButton()
}

function updateFavoriteButton() {
  if (!state.currentWeatherData || !elements.addFavorite) return

  const location = state.currentWeatherData.location
  const isFavorite = state.favorites.some((fav) => fav.name === location.name && fav.country === location.country)

  const icon = elements.addFavorite.querySelector(".material-symbols-outlined")
  icon.textContent = isFavorite ? "favorite" : "favorite_border"
  icon.style.color = isFavorite ? "#FF6B6B" : ""
}

function renderFavorites() {
  const favoritesList = document.querySelector(".favorites-list")
  if (!favoritesList) return

  if (state.favorites.length === 0) {
    favoritesList.innerHTML =
      '<p style="text-align: center; padding: 2rem; color: rgba(255,255,255,0.6);">No saved locations yet</p>'
    return
  }

  favoritesList.innerHTML = state.favorites
    .map(
      (fav, index) => `
        <div class="favorite-item">
            <div class="favorite-info">
                <h3>${fav.name}</h3>
                <p>${fav.country}</p>
            </div>
            <div class="favorite-actions">
                <button onclick="loadFavorite(${index})" class="btn-icon" title="Load">
                    <span class="material-symbols-outlined">location_on</span>
                </button>
                <button onclick="removeFavorite(${index})" class="btn-icon" title="Remove">
                    <span class="material-symbols-outlined">delete</span>
                </button>
            </div>
        </div>
    `,
    )
    .join("")
}

async function loadFavorite(index) {
  const favorite = state.favorites[index]
  toggleFavoritesModal()
  await getWeatherByCoordinates(favorite.coord.lat, favorite.coord.lon)
}

// Make functions globally accessible
window.removeFavorite = removeFavorite
window.loadFavorite = loadFavorite

// Weather Icon Mapping
function getWeatherIcon(id) {
  if (id <= 232) return "assets/weather/thunderstorm.svg"
  if (id <= 321) return "assets/weather/drizzle.svg"
  if (id <= 531) return "assets/weather/rain.svg"
  if (id <= 622) return "assets/weather/snow.svg"
  if (id <= 781) return "assets/weather/atmosphere.svg"
  if (id === 800) return "assets/weather/clear.svg"
  return "assets/weather/clouds.svg"
}

// Weather Data Fetching
async function getWeatherByCity(city) {
  try {
    showLoading()

    const response = await fetch(`${WEATHER_API_BASE}/weather?q=${city}&appid=${API_KEY}&units=metric`)

    if (!response.ok) {
      const errorData = await response.json()
      if (response.status === 401) {
        throw new Error("Invalid API key. Please check your OpenWeatherMap API key.")
      } else if (response.status === 404) {
        throw new Error("City not found. Please check the spelling and try again.")
      } else {
        throw new Error(errorData.message || "Unable to fetch weather data")
      }
    }

    const weatherData = await response.json()
    await getWeatherByCoordinates(weatherData.coord.lat, weatherData.coord.lon)
  } catch (error) {
    handleError(error)
  }
}

async function getWeatherByCoordinates(lat, lon) {
  try {
    showLoading()

    const [weather, forecast] = await Promise.all([
      fetch(`${WEATHER_API_BASE}/weather?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`),
      fetch(`${WEATHER_API_BASE}/forecast?lat=${lat}&lon=${lon}&appid=${API_KEY}&units=metric`),
    ])

    if (!weather.ok || !forecast.ok) {
      throw new Error("Unable to fetch weather data")
    }

    const weatherData = await weather.json()
    const forecastData = await forecast.json()

    const fullData = processWeatherData(weatherData, forecastData)
    state.currentWeatherData = fullData
    updateUI(fullData)
    cacheWeatherData(fullData)

    hideLoading()
  } catch (error) {
    handleError(error)
  }
}

// Weather Data Processing
function processWeatherData(weather, forecast) {
  return {
    location: {
      name: weather.name,
      country: weather.sys.country,
      coord: weather.coord,
      timezone: weather.timezone,
    },
    current: {
      temp: weather.main.temp,
      feels_like: weather.main.feels_like,
      humidity: weather.main.humidity,
      pressure: weather.main.pressure,
      visibility: Math.round(weather.visibility / 1000),
      wind_speed: weather.wind.speed,
      wind_deg: weather.wind.deg,
      description: weather.weather[0].description,
      icon: getWeatherIcon(weather.weather[0].id),
      weatherId: weather.weather[0].id,
    },
    forecast: processForecastData(forecast),
    sun: {
      sunrise: new Date(weather.sys.sunrise * 1000),
      sunset: new Date(weather.sys.sunset * 1000),
    },
    lastUpdate: new Date(),
  }
}

// Forecast Processing
function processForecastData(forecast) {
  const hourly = forecast.list.slice(0, 8).map((item) => ({
    time: new Date(item.dt * 1000),
    temp: item.main.temp,
    feels_like: item.main.feels_like,
    humidity: item.main.humidity,
    wind_speed: item.wind.speed,
    description: item.weather[0].description,
    icon: getWeatherIcon(item.weather[0].id),
    precipitation: Math.round(item.pop * 100),
  }))

  const daily = groupForecastByDay(forecast.list)

  return { hourly, daily }
}

function groupForecastByDay(forecastList) {
  const dailyForecasts = {}

  forecastList.forEach((item) => {
    const date = new Date(item.dt * 1000).toLocaleDateString()

    if (!dailyForecasts[date]) {
      dailyForecasts[date] = {
        temps: [],
        icons: [],
        precipitation: [],
        wind_speeds: [],
        date: new Date(item.dt * 1000),
      }
    }

    dailyForecasts[date].temps.push(item.main.temp)
    dailyForecasts[date].icons.push(item.weather[0].id)
    dailyForecasts[date].precipitation.push(item.pop)
    dailyForecasts[date].wind_speeds.push(item.wind.speed)
  })

  return Object.values(dailyForecasts)
    .map((data) => ({
      date: data.date,
      temp_max: data.temps.length > 0 ? Math.max(...data.temps) : 0,
      temp_min: data.temps.length > 0 ? Math.min(...data.temps) : 0,
      icon: getWeatherIcon(getMostFrequent(data.icons)),
      precipitation: Math.round(Math.max(...data.precipitation) * 100),
      wind_speed: average(data.wind_speeds),
    }))
    .slice(1, 8)
}

// UI Updates
function updateUI(data) {
  if (!data) {
    showInitialMessage()
    return
  }

  updateCurrentWeather(data)
  updateHourlyForecast(data.forecast.hourly)
  updateDailyForecast(data.forecast.daily)
  updateSunMoonInfo(data)
  updateWeatherDetails(data)
  updateRecommendations(data)
  updateFavoriteButton()

  hideMessages()
  showWeatherContainer()
}

function updateCurrentWeather(data) {
  const temp = convertTemperature(data.current.temp)
  const feelsLike = convertTemperature(data.current.feels_like)
  const unit = state.unit === "celsius" ? "C" : "F"

  elements.cityName.textContent = data.location.name
  elements.currentDate.textContent = formatDate(new Date(), {
    weekday: "long",
    month: "long",
    day: "numeric",
  })

  const localTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
  elements.localTime.textContent = `Local Time: ${localTime}`

  elements.temperature.textContent = `${temp}°${unit}`
  elements.weatherDescription.textContent = capitalizeFirstLetter(data.current.description)
  elements.feelsLike.textContent = `Feels like ${feelsLike}°${unit}`
  elements.weatherIcon.src = data.current.icon
  elements.weatherIcon.alt = data.current.description
}

function updateWeatherDetails(data) {
  const details = document.querySelectorAll(".detail-item")

  const windDirection = getWindDirection(data.current.wind_deg)

  const detailsData = [
    data.current.humidity + "%",
    data.current.wind_speed.toFixed(1) + " m/s",
    data.current.visibility + " km",
    data.current.pressure + " hPa",
    "N/A",
    "Good",
  ]

  details.forEach((detail, index) => {
    const valueEl = detail.querySelector(".detail-value")
    if (valueEl && detailsData[index]) {
      valueEl.textContent = detailsData[index]
    }

    if (index === 1) {
      const windDir = detail.querySelector(".wind-direction")
      if (windDir) {
        windDir.textContent = windDirection
      }
    }
  })
}

function updateHourlyForecast(hourly) {
  elements.hourlyContainer.innerHTML = hourly
    .map((hour) => {
      const temp = convertTemperature(hour.temp)
      const unit = state.unit === "celsius" ? "C" : "F"
      const time = hour.time.toLocaleTimeString("en-US", {
        hour: "numeric",
        hour12: true,
      })

      return `
            <div class="hourly-item">
                <p class="hourly-time">${time}</p>
                <img src="${hour.icon}" alt="${hour.description}" class="hourly-icon">
                <p class="hourly-temp">${temp}°${unit}</p>
                <div class="hourly-precipitation">
                    <span class="material-symbols-outlined">water_drop</span>
                    <span>${hour.precipitation}%</span>
                </div>
            </div>
        `
    })
    .join("")
}

function updateDailyForecast(daily) {
  elements.forecastContainer.innerHTML = daily
    .map((day, index) => {
      const tempMax = convertTemperature(day.temp_max)
      const tempMin = convertTemperature(day.temp_min)
      const unit = state.unit === "celsius" ? "C" : "F"

      const dayName = index === 0 ? "Tomorrow" : day.date.toLocaleDateString("en-US", { weekday: "short" })
      const dateStr = day.date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
      })

      return `
            <div class="forecast-item">
                <div class="forecast-header">
                    <p class="forecast-date">${dayName}</p>
                    <p class="forecast-day">${dateStr}</p>
                </div>
                <div class="forecast-content">
                    <img src="${day.icon}" alt="Weather" class="forecast-icon">
                    <div class="forecast-details">
                        <div class="forecast-temp">
                            <p class="high-temp">${tempMax}°${unit}</p>
                            <p class="low-temp">${tempMin}°${unit}</p>
                        </div>
                        <div class="forecast-conditions">
                            <span class="precipitation">
                                <span class="material-symbols-outlined">water_drop</span>
                                ${day.precipitation}%
                            </span>
                            <span class="wind">
                                <span class="material-symbols-outlined">air</span>
                                ${day.wind_speed.toFixed(1)} m/s
                            </span>
                        </div>
                    </div>
                </div>
            </div>
        `
    })
    .join("")
}

function updateSunMoonInfo(data) {
  const sunrise = data.sun.sunrise.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })
  const sunset = data.sun.sunset.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  })

  const sunriseEl = document.querySelector(".sunrise .detail-value")
  const sunsetEl = document.querySelector(".sunset .detail-value")

  if (sunriseEl) sunriseEl.textContent = sunrise
  if (sunsetEl) sunsetEl.textContent = sunset
}

function updateRecommendations(data) {
  const recommendations = getWeatherRecommendations(data)

  if (recommendations.length === 0) {
    elements.recommendationsContainer.style.display = "none"
    return
  }

  elements.recommendationsContainer.style.display = "flex"
  elements.recommendationsContainer.innerHTML = recommendations
    .map(
      (rec) => `
        <div class="recommendation-item">
            <span class="material-symbols-outlined">${rec.icon}</span>
            <p>${rec.text}</p>
        </div>
    `,
    )
    .join("")
}

function getWeatherRecommendations(data) {
  const recommendations = []
  const temp = data.current.temp
  const weatherId = data.current.weatherId
  const description = data.current.description.toLowerCase()

  if (weatherId >= 200 && weatherId < 600) {
    recommendations.push({ icon: "umbrella", text: "Take an umbrella today" })
  } else {
    recommendations.push({ icon: "umbrella", text: "No need for an umbrella today" })
  }

  if (temp > 20 && temp < 28 && !description.includes("rain")) {
    recommendations.push({ icon: "directions_run", text: "Great weather for outdoor activities!" })
  } else if (temp > 30) {
    recommendations.push({ icon: "water_drop", text: "Stay hydrated - it's hot outside" })
  } else if (temp < 10) {
    recommendations.push({ icon: "ac_unit", text: "Dress warmly today" })
  }

  return recommendations
}

// Utility Functions
function getWindDirection(deg) {
  const directions = ["N", "NE", "E", "SE", "S", "SW", "W", "NW"]
  return directions[Math.round(deg / 45) % 8]
}

function getMostFrequent(arr) {
  if (arr.length === 0) return 800
  return arr.sort((a, b) => arr.filter((v) => v === a).length - arr.filter((v) => v === b).length).pop()
}

function average(arr) {
  if (arr.length === 0) return 0
  return arr.reduce((a, b) => a + b, 0) / arr.length
}

function capitalizeFirstLetter(string) {
  return string.charAt(0).toUpperCase() + string.slice(1)
}

function formatDate(date, options = {}) {
  return new Date(date).toLocaleDateString("en-US", options)
}

// Display Management
function showWeatherContainer() {
  elements.weatherContainer.style.display = "grid"
  elements.messageContainer.style.display = "none"
}

function showInitialMessage() {
  showMessage(elements.initialMessage)
}

function hideMessages() {
  elements.messageContainer.style.display = "none"
}

function showMessage(messageElement) {
  elements.weatherContainer.style.display = "none"
  elements.messageContainer.style.display = "flex"

  elements.initialMessage.style.display = "none"
  elements.errorMessage.style.display = "none"
  elements.offlineMessage.style.display = "none"
  elements.loadingSpinner.style.display = "none"

  messageElement.style.display = "flex"
}

function showLoading() {
  showMessage(elements.loadingSpinner)
}

function hideLoading() {
  elements.loadingSpinner.style.display = "none"
}

// Error Handling
function handleError(error) {
  hideLoading()
  console.error("Error:", error)
  showMessage(elements.errorMessage)
  showNotification(error.message || "Something went wrong", "error")
}

// Notifications
function showNotification(message, type = "info") {
  const notification = document.createElement("div")
  notification.className = `notification notification-${type}`
  notification.innerHTML = `
        <span class="material-symbols-outlined">
            ${type === "success" ? "check_circle" : type === "error" ? "error" : "info"}
        </span>
        <span>${message}</span>
    `

  elements.notificationContainer.appendChild(notification)

  setTimeout(() => notification.classList.add("show"), 100)

  setTimeout(() => {
    notification.classList.remove("show")
    setTimeout(() => notification.remove(), 300)
  }, 3000)
}

// Online/Offline Handling
function checkOnlineStatus() {
  state.offline = !navigator.onLine
  if (state.offline) {
    showMessage(elements.offlineMessage)
  }
}

function handleOnline() {
  state.offline = false
  hideMessages()
  showNotification("You are back online", "success")
}

function handleOffline() {
  state.offline = true
  showNotification("You are offline", "error")
}

// Settings Management
function loadSettings() {
  const settings = localStorage.getItem(CACHE_KEYS.SETTINGS)
  if (settings) {
    const parsed = JSON.parse(settings)
    state.unit = parsed.unit || "celsius"
    state.theme = parsed.theme || "light"

    elements.unitToggle.textContent = state.unit === "celsius" ? "°C" : "°F"

    if (state.theme === "dark") {
      document.body.classList.add("dark-theme")
      const icon = elements.themeToggle.querySelector(".material-symbols-outlined")
      icon.textContent = "light_mode"
    }
  }

  const favorites = localStorage.getItem(CACHE_KEYS.FAVORITES)
  if (favorites) {
    state.favorites = JSON.parse(favorites)
  }
}

function saveSettings() {
  localStorage.setItem(
    CACHE_KEYS.SETTINGS,
    JSON.stringify({
      unit: state.unit,
      theme: state.theme,
    }),
  )
}

function saveFavorites() {
  localStorage.setItem(CACHE_KEYS.FAVORITES, JSON.stringify(state.favorites))
}

function cacheWeatherData(data) {
  try {
    localStorage.setItem(CACHE_KEYS.LAST_WEATHER, JSON.stringify(data))
  } catch (error) {
    console.error("Error caching weather data:", error)
  }
}

function loadCachedWeather() {
  try {
    const cachedData = localStorage.getItem(CACHE_KEYS.LAST_WEATHER)
    if (!cachedData) return null

    const data = JSON.parse(cachedData)

    // Check for expiration (30 minutes)
    const now = new Date()
    const lastUpdate = new Date(data.lastUpdate)
    const diffMinutes = (now - lastUpdate) / (1000 * 60)

    if (diffMinutes > 30) {
      console.log("Cached data expired.")
      localStorage.removeItem(CACHE_KEYS.LAST_WEATHER) // Clear expired cache
      return null
    }

    // Make sure dates are parsed correctly
    data.lastUpdate = lastUpdate
    data.sun.sunrise = new Date(data.sun.sunrise)
    data.sun.sunset = new Date(data.sun.sunset)
    data.forecast.hourly.forEach((h) => (h.time = new Date(h.time)))
    data.forecast.daily.forEach((d) => (d.date = new Date(d.date)))

    return data
  } catch (error) {
    console.error("Error loading cached weather:", error)
    return null
  }
}

// Initialize app when DOM is loaded
document.addEventListener("DOMContentLoaded", initializeApp)
