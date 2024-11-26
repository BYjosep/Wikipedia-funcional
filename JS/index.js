document.addEventListener('DOMContentLoaded', () => {
    const resultsSection = document.querySelector('.results-section');
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');

    let userCoords = null; // Coordenadas del usuario
    let allResults = []; // Almacena todos los resultados obtenidos
    let allImages = {}; // Almacena las imágenes de los resultados

    // Palabras clave para excluir resultados no deseados
    const exclusionKeywords = [
        "ciudad",
        "pueblo",
        "provincia",
        "país",
        "capital",
        "municipio",
    ];

    // Obtener ubicación del usuario al cargar la página
    function getUserLocation() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    userCoords = {
                        lat: position.coords.latitude,
                        lon: position.coords.longitude,
                    };
                    fetchWikipediaDataByLocation(userCoords.lat, userCoords.lon);
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

                // Obtener detalles de los artículos y filtrar lugares físicos
                const places = await fetchArticleDetails(titles);

                if (places.length > 0) {
                    allResults = places;
                    displayResults(allResults, allImages);
                } else {
                    displayError("No se encontraron lugares cercanos con coordenadas.");
                }
            } else {
                displayError("No se encontraron resultados cerca de tu ubicación.");
            }
        } catch (error) {
            console.error("Error al consultar la API de Wikipedia:", error);
            displayError("Hubo un problema al obtener los datos. Inténtalo de nuevo.");
        }
    }

    // Consultar API de Wikipedia por término de búsqueda y ordenar por distancia
    async function fetchWikipediaDataBySearch(query) {
        if (!userCoords) {
            displayError("No se pudo obtener la ubicación para ordenar los resultados.");
            return;
        }

        const apiUrl = `https://es.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
            query
        )}&srprop=snippet&srnamespace=0&srlimit=10&format=json&origin=*`;

        try {
            const response = await fetch(apiUrl);
            const data = await response.json();

            if (data.query && data.query.search.length > 0) {
                const titles = data.query.search.map((result) => result.title);

                // Obtener detalles de los artículos y filtrar lugares físicos
                const places = await fetchArticleDetails(titles);

                if (places.length > 0) {
                    // Calcular la distancia para cada lugar
                    places.forEach((place) => {
                        place.dist = calculateDistance(
                            userCoords.lat,
                            userCoords.lon,
                            place.lat,
                            place.lon
                        );
                    });

                    // Ordenar por distancia
                    const sortedPlaces = places.sort((a, b) => a.dist - b.dist);

                    allResults = sortedPlaces; // Guardar los resultados ordenados globalmente
                    displayResults(allResults, allImages); // Mostrar los resultados
                } else {
                    displayError("No se encontraron lugares físicos relacionados con tu búsqueda.");
                }
            } else {
                displayError("No se encontraron resultados para tu búsqueda.");
            }
        } catch (error) {
            console.error("Error al consultar la API de Wikipedia:", error);
            displayError("Hubo un problema al obtener los datos. Inténtalo de nuevo.");
        }
    }

    // Obtener detalles de los artículos y filtrar lugares físicos
    async function fetchArticleDetails(titles) {
        const apiUrl = `https://es.wikipedia.org/w/api.php?action=query&titles=${titles
            .map((title) => encodeURIComponent(title))
            .join("|")}&prop=coordinates|pageimages&piprop=thumbnail&pithumbsize=300&format=json&origin=*`;

        try {
            const response = await fetch(apiUrl);
            const data = await response.json();
            const pages = Object.values(data.query.pages);

            // Filtrar artículos con coordenadas (lugares físicos) y excluir términos genéricos
            const filtered = pages
                .filter((page) => page.coordinates) // Solo lugares con coordenadas
                .filter(
                    (page) =>
                        !exclusionKeywords.some((keyword) =>
                            page.title.toLowerCase().includes(keyword)
                        )
                )
                .map((page) => ({
                    title: page.title,
                    lat: page.coordinates[0].lat,
                    lon: page.coordinates[0].lon,
                    image: page.thumbnail ? page.thumbnail.source : null,
                    dist: null, // Calcularemos después
                }));

            return filtered;
        } catch (error) {
            console.error("Error al filtrar artículos:", error);
            return [];
        }
    }

    // Calcular la distancia entre dos coordenadas usando la fórmula de Haversine
    function calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371e3; // Radio de la Tierra en metros
        const toRadians = (angle) => (angle * Math.PI) / 180;

        const φ1 = toRadians(lat1);
        const φ2 = toRadians(lat2);
        const Δφ = toRadians(lat2 - lat1);
        const Δλ = toRadians(lon2 - lon1);

        const a =
            Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
            Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c; // Retorna la distancia en metros
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
