document.addEventListener('DOMContentLoaded', () => {
    const resultsSection = document.querySelector('.results-section');
    const searchInput = document.getElementById('search-input');
    const searchBtn = document.getElementById('search-btn');

    let userCoords = null; // Coordenadas del usuario
    let allResults = []; // Almacena todos los resultados obtenidos

    // Palabras clave para incluir resultados deseados
    const inclusionKeywords = [
        "montaña",
        "iglesia",
        "monumento",
        "catedral",
        "museo",
        "ermita",
        "parque",
        "castillo",
        "natural",
        "arqueológico",
        "arqueologico",
        "histórico",
        "historico",

    ];

    // Obtener ubicación del usuario
    function getUserLocation() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    userCoords = {
                        lat: position.coords.latitude,
                        lon: position.coords.longitude,
                    };
                    fetchNearbyPlaces(userCoords.lat, userCoords.lon, 10000);
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

    // Consultar lugares cercanos
    async function fetchNearbyPlaces(lat, lon, radius, attempt = 1) {
        const apiUrl = `https://es.wikipedia.org/w/api.php?action=query&list=geosearch&gscoord=${lat}|${lon}&gsradius=${radius}&gslimit=50&format=json&origin=*`;

        try {
            console.log(`Intento ${attempt}: Buscando lugares en un radio de ${radius} metros.`);
            const response = await fetch(apiUrl);
            const data = await response.json();

            if (data.query && data.query.geosearch.length > 0) {
                console.log("Lugares encontrados (sin filtrar):", data.query.geosearch.map((place) => place.title));

                const titles = data.query.geosearch.map((place) => place.title);
                const places = await fetchArticleDetails(titles);

                places.forEach((place) => {
                    place.dist = calculateDistance(lat, lon, place.lat, place.lon);
                });

                allResults = [...new Map([...allResults, ...places].map(item => [item.title, item])).values()];
                console.log(`Resultados acumulados: ${allResults.length} lugares.`);

                if (allResults.length >= 100 || attempt >= 1) {
                    displayResults(allResults.sort((a, b) => a.dist - b.dist));
                } else {
                    fetchNearbyPlaces(lat, lon, radius * 1.5, attempt + 1);
                }
            } else if (attempt < 1) {
                console.log("Pocos resultados, ampliando el radio de búsqueda.");
                fetchNearbyPlaces(lat, lon, radius * 1.5, attempt + 1);
            } else {
                console.log("No se encontraron resultados suficientes.");
                displayError("No se encontraron lugares cercanos.");
            }
        } catch (error) {
            console.error("Error al consultar lugares cercanos:", error);
            displayError("Hubo un problema al obtener los datos. Inténtalo de nuevo.");
        }
    }

    // Obtener detalles de los artículos
    async function fetchArticleDetails(titles) {
        const apiUrl = `https://es.wikipedia.org/w/api.php?action=query&titles=${titles.join("|")}
        &prop=coordinates|pageimages&piprop=thumbnail&pithumbsize=300&format=json&origin=*`;

        try {
            const response = await fetch(apiUrl);
            const data = await response.json();
            const pages = Object.values(data.query.pages);

            console.log("Detalles sin filtrar:", pages.map((page) => page.title));

            // Filtrar solo los lugares que contienen palabras clave relevantes
            const filtered = pages
                .filter((page) => page.coordinates) // Asegurarse de que tienen coordenadas
                .filter((page) => {
                    const title = page.title.toLowerCase();
                    const isIncluded = inclusionKeywords.some((keyword) => {
                        const regex = new RegExp(`\\b${keyword}\\b`, "i");
                        return regex.test(title);
                    });

                    if (isIncluded) {
                        console.log(`Incluyendo: "${page.title}" (coincide con una palabra clave)`);
                    } else {
                        console.log(`Excluyendo: "${page.title}" (no coincide con palabras clave)`);
                    }

                    return isIncluded;
                });

            return filtered.map((page) => ({
                title: page.title,
                lat: page.coordinates[0].lat,
                lon: page.coordinates[0].lon,
                image: page.thumbnail?.source || "https://via.placeholder.com/300",
            }));
        } catch (error) {
            console.error("Error al obtener detalles de artículos:", error);
            return [];
        }
    }

    // Calcular la distancia entre dos coordenadas
    function calculateDistance(lat1, lon1, lat2, lon2) {
        const R = 6371e3; // Radio de la Tierra en metros
        const toRadians = (angle) => (angle * Math.PI) / 180;

        const φ1 = toRadians(lat1);
        const φ2 = toRadians(lat2);
        const Δφ = toRadians(lat2 - lat1);
        const Δλ = toRadians(lon2 - lon1);

        const a =
            Math.sin(Δφ / 2) ** 2 +
            Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;

        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    }

    // Mostrar resultados
    function displayResults(results) {
        resultsSection.innerHTML = "";

        results.forEach((place) => {
            const resultCard = document.createElement("div");
            resultCard.classList.add("result-card");

            const formattedDistance =
                place.dist >= 1000
                    ? `${(place.dist / 1000).toFixed(1)} km`
                    : `${Math.round(place.dist)} metros`;

            resultCard.innerHTML = `
                <img src="${place.image}" alt="${place.title}" class="result-image" />
                <div class="result-info">
                    <p>${place.title}</p>
                    <p><small>A ${formattedDistance}</small></p>
                </div>
            `;

            resultCard.addEventListener("click", () => {
                localStorage.setItem(
                    "selectedPlace",
                    JSON.stringify(place)
                );
                window.location.href = "./resultado.html";
            });

            resultsSection.appendChild(resultCard);
        });
    }


    // Mostrar error
    function displayError(message) {
        resultsSection.innerHTML = `<div class="error-message"><p>${message}</p></div>`;
    }

    // Eventos de búsqueda
    searchBtn.addEventListener("click", () => {
        const query = searchInput.value.trim();
        if (query) fetchWikipediaDataBySearch(query);
    });



    // Manejar evento de borrar búsqueda
    const clearBtn = document.getElementById("clear-btn");
    clearBtn.addEventListener("click", () => {
        searchInput.value = ""; // Limpiar el campo de búsqueda
        if (userCoords) {
            // Mostrar resultados iniciales según la ubicación
            fetchNearbyPlaces(userCoords.lat, userCoords.lon, 10000);
        } else {
            displayError("No se pudo restablecer la búsqueda porque no se conoce la ubicación.");
        }
    });

    getUserLocation();
});