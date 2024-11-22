// script.js

document.addEventListener('DOMContentLoaded', () => {
    const resultsSection = document.querySelector('.results-section');
  
    // Función para obtener la ubicación del usuario
    function getUserLocation() {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            const { latitude, longitude } = position.coords;
            console.log(`Latitud: ${latitude}, Longitud: ${longitude}`);
            fetchWikipediaData(latitude, longitude);
          },
          (error) => {
            console.error("No se pudo acceder a la ubicación:", error.message);
            displayError("No se pudo obtener la ubicación del usuario.");
          }
        );
      } else {
        displayError("La geolocalización no está soportada en este navegador.");
      }
    }
  
    // Función para consultar la API de Wikipedia
    async function fetchWikipediaData(lat, lon) {
      const radius = 10000; // Radio de búsqueda en metros
      const limit = 10; // Número máximo de resultados
      const apiUrl = `https://es.wikipedia.org/w/api.php?action=query&list=geosearch&gscoord=${lat}|${lon}&gsradius=${radius}&gslimit=${limit}&format=json&origin=*`;
  
      try {
        const response = await fetch(apiUrl);
        const data = await response.json();
  
        if (data.query && data.query.geosearch.length > 0) {
          // Obtenemos los títulos de los artículos y buscamos imágenes
          const titles = data.query.geosearch.map((place) => place.title);
          fetchArticleImages(titles, data.query.geosearch);
        } else {
          displayError("No se encontraron resultados cerca de tu ubicación.");
        }
      } catch (error) {
        console.error("Error al consultar la API de Wikipedia:", error);
        displayError("Hubo un problema al obtener los datos. Inténtalo de nuevo.");
      }
    }
  
    // Función para consultar imágenes de los artículos
    async function fetchArticleImages(titles, geosearchResults) {
      const apiUrl = `https://es.wikipedia.org/w/api.php?action=query&titles=${titles
        .map((title) => encodeURIComponent(title))
        .join("|")}&prop=pageimages&piprop=thumbnail&pithumbsize=300&format=json&origin=*`;
  
      try {
        const response = await fetch(apiUrl);
        const data = await response.json();
  
        const pages = data.query.pages;
        const images = Object.values(pages).reduce((acc, page) => {
          if (page.thumbnail && page.thumbnail.source) {
            acc[page.title] = page.thumbnail.source;
          }
          return acc;
        }, {});
  
        displayResults(geosearchResults, images);
      } catch (error) {
        console.error("Error al obtener imágenes de los artículos:", error);
        displayError("Hubo un problema al obtener las imágenes. Inténtalo de nuevo.");
      }
    }
  
    // Función para mostrar los resultados
   // Función para mostrar los resultados
function displayResults(results, images) {
    resultsSection.innerHTML = ""; // Limpiar resultados previos
  
    results.forEach((place) => {
      const resultCard = document.createElement('div');
      resultCard.classList.add('result-card');
  
      // Verificar si hay imagen disponible
      const imageSrc = images[place.title] || "https://via.placeholder.com/300";
  
      // Formatear la distancia
      const formattedDistance =
        place.dist >= 1000
          ? `${(place.dist / 1000).toFixed(1)} km`
          : `${Math.round(place.dist)} metros`;
  
      resultCard.innerHTML = `
        <img src="${imageSrc}" alt="${place.title}" class="result-image" />
        <div class="result-info">
          <p>${place.title}</p>
          <p><small>A ${formattedDistance}</small></p>
          <a href="https://es.wikipedia.org/wiki/${encodeURIComponent(
            place.title
          )}" target="_blank">Ver más</a>
        </div>
      `;
  
      resultsSection.appendChild(resultCard);
    });
  }
  
  
    // Función para mostrar mensajes de error
    function displayError(message) {
      resultsSection.innerHTML = `
        <div class="error-message">
          <p>${message}</p>
        </div>
      `;
    }
  
    // Llamar a la función para obtener la ubicación al cargar
    getUserLocation();
  });
  