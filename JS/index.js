
document.addEventListener('DOMContentLoaded', () => {
    const resultsSection = document.querySelector('.results-section');
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');

    let allResults = []; // Almacena todos los resultados obtenidos
    let allImages = {}; // Almacena las imágenes de los resultados

    // Obtener ubicación del usuario al cargar la página
    function getUserLocation() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    const { latitude, longitude } = position.coords;
                    console.log(`Latitud: ${latitude}, Longitud: ${longitude}`);
                    fetchWikipediaDataByLocation(latitude, longitude);
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

    // Consultar API de Wikipedia por ubicación
    async function fetchWikipediaDataByLocation(lat, lon) {
        const radius = 10000; // Radio de búsqueda en metros
        const limit = 10; // Número máximo de resultados
        const apiUrl = `https://es.wikipedia.org/w/api.php?action=query&list=geosearch&gscoord=${lat}|${lon}&gsradius=${radius}&gslimit=${limit}&format=json&origin=*`;

        try {
            const response = await fetch(apiUrl);
            const data = await response.json();

            if (data.query && data.query.geosearch.length > 0) {
                const titles = data.query.geosearch.map((place) => place.title);

                // Ordenar resultados por distancia antes de guardar
                allResults = data.query.geosearch.sort((a, b) => a.dist - b.dist);
                fetchArticleImages(titles, allResults);
            } else {
                displayError("No se encontraron resultados cerca de tu ubicación.");
            }
        } catch (error) {
            console.error("Error al consultar la API de Wikipedia:", error);
            displayError("Hubo un problema al obtener los datos. Inténtalo de nuevo.");
        }
    }

    // Consultar API de Wikipedia por término de búsqueda
    async function fetchWikipediaDataBySearch(query) {
        const apiUrl = `https://es.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
            query
        )}&srlimit=10&format=json&origin=*`;

        try {
            const response = await fetch(apiUrl);
            const data = await response.json();

            if (data.query && data.query.search.length > 0) {
                const titles = data.query.search.map((result) => result.title);

                // Guardar resultados sin distancia (para búsquedas manuales)
                allResults = data.query.search.map((result) => ({
                    title: result.title,
                    dist: null, // No hay distancia para búsquedas manuales
                }));

                // Ordenar alfabéticamente los resultados
                allResults.sort((a, b) => a.title.localeCompare(b.title));
                fetchArticleImages(titles, allResults);
            } else {
                displayError("No se encontraron resultados para tu búsqueda.");
            }
        } catch (error) {
            console.error("Error al consultar la API de Wikipedia:", error);
            displayError("Hubo un problema al obtener los datos. Inténtalo de nuevo.");
        }
    }

    // Consultar imágenes de los artículos
    async function fetchArticleImages(titles, results) {
        const apiUrl = `https://es.wikipedia.org/w/api.php?action=query&titles=${titles
            .map((title) => encodeURIComponent(title))
            .join("|")}&prop=pageimages&piprop=thumbnail&pithumbsize=300&format=json&origin=*`;

        try {
            const response = await fetch(apiUrl);
            const data = await response.json();

            const pages = data.query.pages;
            allImages = Object.values(pages).reduce((acc, page) => {
                if (page.thumbnail && page.thumbnail.source) {
                    acc[page.title] = page.thumbnail.source;
                }
                return acc;
            }, {});

            displayResults(results, allImages);
        } catch (error) {
            console.error("Error al obtener imágenes de los artículos:", error);
            displayError("Hubo un problema al obtener las imágenes. Inténtalo de nuevo.");
        }
    }

    // Mostrar resultados
    function displayResults(results, images) {
        resultsSection.innerHTML = ""; // Limpiar resultados previos

        results.forEach((place) => {
            const resultCard = document.createElement('div');
            resultCard.classList.add('result-card');

            const imageSrc = images[place.title] || "https://via.placeholder.com/300";

            const formattedDistance =
                place.dist !== null
                    ? place.dist >= 1000
                        ? `${(place.dist / 1000).toFixed(1)} km`
                        : `${Math.round(place.dist)} metros`
                    : "Distancia desconocida";

            resultCard.innerHTML = `
        <img src="${imageSrc}" alt="${place.title}" class="result-image" />
        <div class="result-info">
          <p>${place.title}</p>
          <p><small>A ${formattedDistance}</small></p>
        </div>
      `;

            // Agregar evento de clic para redirigir
            resultCard.addEventListener("click", () => {
                // Guardar información del resultado en localStorage
                localStorage.setItem(
                    "selectedPlace",
                    JSON.stringify({
                        title: place.title,
                        image: imageSrc,
                        distance: formattedDistance,
                    })
                );

                // Redirigir a la página de resultados
                window.location.href = "./resultado.html";
            });

            resultsSection.appendChild(resultCard);
        });
    }

    // Mostrar mensajes de error
    function displayError(message) {
        resultsSection.innerHTML = `
      <div class="error-message">
        <p>${message}</p>
      </div>
    `;
    }

    // Manejar eventos de búsqueda
    searchBtn.addEventListener("click", () => {
        const query = searchInput.value.trim();
        if (query) {
            fetchWikipediaDataBySearch(query);
        } else {
            alert("Por favor, ingresa un término de búsqueda.");
        }
    });

    // Obtener ubicación al cargar
    getUserLocation();
});


// Mostrar resultados
function displayResults(results, images) {
    resultsSection.innerHTML = ""; // Limpiar resultados previos

    results.forEach((place) => {
        const resultCard = document.createElement('div');
        resultCard.classList.add('result-card');

        const imageSrc = images[place.title] || "https://via.placeholder.com/300";

        const formattedDistance =
            place.dist !== null
                ? place.dist >= 1000
                    ? `${(place.dist / 1000).toFixed(1)} km`
                    : `${Math.round(place.dist)} metros`
                : "Distancia desconocida";

        resultCard.innerHTML = `
      <img src="${imageSrc}" alt="${place.title}" class="result-image" />
      <div class="result-info">
        <p>${place.title}</p>
        <p><small>A ${formattedDistance}</small></p>
      </div>
    `;

        // Agregar evento de clic para redirigir
        resultCard.addEventListener("click", () => {
            // Guardar información del resultado en localStorage
            localStorage.setItem(
                "selectedPlace",
                JSON.stringify({
                    title: place.title,
                    image: imageSrc,
                    distance: formattedDistance,
                    lat: place.lat, // Coordenadas del lugar
                    lon: place.lon, // Coordenadas del lugar
                })
            );

            // Redirigir a la página de resultados
            window.location.href = "./resultado.html";
        });

        resultsSection.appendChild(resultCard);
    });
}
