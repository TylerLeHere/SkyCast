const cityInput = document.querySelector('.city-input')
const searchBtn = document.querySelector('.search-btn')

const weatherInfoSection = document.querySelector('.weather-info')
const notFoundSection = document.querySelector('.not-found')
const searchCitySection = document.querySelector('.search-city')

const countryTxt = document.querySelector('.country-txt')
const tempTxt = document.querySelector('.temp-txt')
const conditionTxt = document.querySelector('.condition-txt')
const humidityValueTxt = document.querySelector('.humidity-value-text')
const windValueTxt = document.querySelector('.wind-vaue-txt')
const weatherSummaryImg = document.querySelector('.weather-summary-img')
const currentDateTxt = document.querySelector('.current-data-txt')

const forecastItemsContainer = documents.querySelector('.forecast-items-container')

const apiKey = 'eeaf561ec5f8ac915dea0e6c6a64a727'


searchBtn.addEventListener('click', () => {
    if (cityInput.value.trim() != ''){
        updateWeatherInfo(cityInput.value)
        cityInput.value = ''
        cityInput.blur()
    }
})

cityInput.addEventListener('keydown', (event) =>{
    if(event.key == 'Enter' && cityInput.value.trim() != ''){
        updateWeatherInfo(cityInput.value)
        cityInput.value = ''
        cityInput.blur()    
    }
})

async function getFetchData(endPoint, city){
    const apiUrl = `https://api.openweathermap.org/data/2.5/${endPoint}?q=${city}&appid=${apiKey}&units=metric`
    const response = await fetch(apiUrl)

    return response.json()

}

function getWeatherIcon(id){
    console.log(id)
    if (id <= 232){
        return 'thunderstorm.svg'
    }

    if (id <= 321){
        return 'drizzle.svg'
    }
    if (id <= 531){
        return 'rain.svg'
    }
    if (id <= 622){
        return 'snow.svg'
    }
    if (id <= 781){
        return 'atmosphere.svg'
    } 
    if (id <= 800){
        return 'clear.svg'
    }
    else return 'clouds.svg'
}

function getCurrentDate(){
    const currentDate = new Date()
    const options = {
        weekday: 'short',
        day: '2-digit',
        month: 'short'
    }
    return currentDate.toLocaleDateString('en-GB',options)
}

async function updateWeatherInfo(city){
    const weatherData = getFetchData('weather', city)

    if(weatherData.cod != 200){
        showDisplaySection(notFoundSection)
        return
    }
    console.log(weatherData)

    const {
        name: country,
        main: { temp, humidity},
        weather: [{id, main }],
        wind: speed

    } = weatherData

    countryTxt.textContent = country
    tempTxt.textContent = Math.round(temp) + ' °C'
    conditionTxt.textContent = main
    humidityValueTxt.textContent = humidity + '% '
    windValueTxt.textContent = speed + ' M/s'

    currentDateTxt.textContent = getCurrentDate()
    weatherSummaryImg = `assets/weather/${getWeatherIcon(id)}`

    await updateForecastsInfo(city)
    showDisplaySection(weatherInfoSection)

}

async function updateForecastsInfo(city){
    const forecastsData = await getFetchData('forcast', city)

    const timeTaken = '12:00:00'
    const todayDate = new Date().toISOString().split('T')[0]

    forecastItemsContainer.innerHTML = ''

    forecastsData.List.forEach(forecastWeather =>{
        if (forecastWeather.dt_txt.includes(timeTaken) && !forecastWeather.dt_txt.includes(todayDate)){
            updateForecastsItems(forecastWeather)
        }
    })
}

function updateForecastsItems(weatherData){
    console.log(weatherData)
    const{
        dt_txt: date,
        weather: [{id}],
        main: {temp}
    }= weatherData

    
}
function showDisplaySection(section){
    [weatherInfoSection, searchCitySection, notFoundSection]
        .forEach (section => section.style.display = 'none')

    section.style.display = 'flex' 
}