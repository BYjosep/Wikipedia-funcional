document.addEventListener('DOMContentLoaded', () => {
    const resultsSection = document.querySelector('.results-section');
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');

    let userCoords = null; // Coordenadas del usuario
    let allResults = []; // Almacena todos los resultados obtenidos
    const minResults = 10; // Mínimo número de resultados deseados
    const maxAttempts = 3; // Máximo número de intentos para expandir el radio de búsqueda
    const initialRadius = 10000; // Radio inicial de búsqueda en metros

    // Palabras clave aceptadas para resultados específicos (lista blanca)
    const inclusionKeywords = [
        "iglesia",
        "museo",
        "playa",
        "parque",
        "monumento",
        "plaza",
        "estatua",
        "edificio",
        "templo",
        "catedral",
        "teatro",
        "zoológico",
        "bosque",
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
                    fetchNearbyPlaces(userCoords.lat, userCoords.lon, initialRadius);
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

    // Consultar API de Wikipedia para obtener lugares cercanos con un mínimo de resultados
    async function fetchNearbyPlaces(lat, lon, radius, attempt = 1) {
        const limit = 100; // Número máximo de resultados
        const apiUrl = `https://es.wikipedia.org/w/api.php?action=query&list=geosearch&gscoord=${lat}|${lon}&gsradius=${radius}&gslimit=${limit}&format=json&origin=*`;

        try {
            console.log(`Intento ${attempt}: Consultando lugares cercanos con radio ${radius}m...`);
            const response = await fetch(apiUrl);
            const data = await response.json();

            if (data.query && data.query.geosearch.length > 0) {
                const titles = data.query.geosearch.map((place) => place.title);
                const places = await fetchArticleDetails(titles);

                // Calcular distancias con Haversine para todos los lugares
                places.forEach((place) => {
                    place.dist = calculateDistance(lat, lon, place.lat, place.lon);
                });

                // Agregar resultados a la lista general
                allResults = allResults.concat(places);

                // Eliminar duplicados por título
                allResults = allResults.filter(
                    (place, index, self) =>
                        index === self.findIndex((p) => p.title === place.title)
                );

                // Si ya tenemos el mínimo deseado, mostrar resultados
                if (allResults.length >= minResults || attempt >= maxAttempts) {
                    const sortedPlaces = allResults.sort((a, b) => a.dist - b.dist);
                    displayResults(sortedPlaces);
                } else {
                    // Expandir el radio y volver a intentar
                    const newRadius = radius * 1.5; // Incrementar el radio en un 50%
                    fetchNearbyPlaces(lat, lon, newRadius, attempt + 1);
                }
            } else if (attempt < maxAttempts) {
                // Expandir el radio si no hay suficientes resultados
                const newRadius = radius * 1.5;
                fetchNearbyPlaces(lat, lon, newRadius, attempt + 1);
            } else {
                // Mostrar lo que tengamos después de agotar los intentos
                displayResults(allResults);
            }
        } catch (error) {
            console.error("Error al consultar la API de Wikipedia:", error);
            displayError("Hubo un problema al obtener los datos. Inténtalo de nuevo.");
        }
    }

    // Consultar API de Wikipedia por término de búsqueda
    async function fetchWikipediaDataBySearch(query) {
        if (!userCoords) {
            displayError("No se pudo obtener la ubicación para ordenar los resultados.");
            return;
        }

        const limit = 100; // Número máximo de resultados
        const apiUrl = `https://es.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
            query
        )}&srprop=snippet&srnamespace=0&srlimit=${limit}&format=json&origin=*`;

        try {
            const response = await fetch(apiUrl);
            const data = await response.json();

            if (data.query && data.query.search.length > 0) {
                const titles = data.query.search.map((result) => result.title);
                const places = await fetchArticleDetails(titles);

                if (places.length > 0) {
                    // Calcular distancias con Haversine para todos los lugares
                    places.forEach((place) => {
                        place.dist = calculateDistance(
                            userCoords.lat,
                            userCoords.lon,
                            place.lat,
                            place.lon
                        );
                    });

                    // Ordenar por proximidad
                    const sortedPlaces = places.sort((a, b) => a.dist - b.dist);
                    allResults = sortedPlaces;
                    displayResults(allResults);
                } else {
                    displayError("No se encontraron lugares relacionados con tu búsqueda.");
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

            return pages
                .filter((page) => page.coordinates) // Solo lugares con coordenadas
                .filter((page) =>
                    inclusionKeywords.some((keyword) =>
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
    function displayResults(results) {
        resultsSection.innerHTML = ""; // Limpiar resultados previos

        results.forEach((place) => {
            const resultCard = document.createElement("div");
            resultCard.classList.add("result-card");

            const imageSrc = place.image || "https://via.placeholder.com/300";

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

            resultCard.addEventListener("click", () => {
                localStorage.setItem(
                    "selectedPlace",
                    JSON.stringify({
                        title: place.title,
                        image: imageSrc,
                        distance: formattedDistance,
                        lat: place.lat,
                        lon: place.lon,
                    })
                );
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
            fetchNearbyPlaces(userCoords.lat, userCoords.lon, initialRadius);
        }
    });

    // Obtener ubicación al cargar
    getUserLocation();
});
