document.addEventListener("DOMContentLoaded", async () => {
    // Recuperar la información del lugar desde localStorage
    const placeData = JSON.parse(localStorage.getItem("selectedPlace"));

    if (placeData) {
        // Actualizar la página con los datos básicos
        document.getElementById("place-title").textContent = placeData.title;
        document.getElementById("place-image").src = placeData.image;
        document.getElementById("place-distance").textContent = `Distancia: ${placeData.distance}`;

        // Consultar resumen del lugar en Wikipedia
        await fetchPlaceSummary(placeData.title);

        // Configurar el iframe de Google Maps basado en coordenadas
        if (placeData.lat && placeData.lon) {
            const mapsIframe = document.getElementById("google-maps-iframe");
            const mapsLink = document.getElementById("google-maps-link");
            const mapsUrl = `https://www.google.com/maps?q=${placeData.lat},${placeData.lon}&z=15`;

            mapsIframe.src = mapsUrl + "&output=embed";
            mapsLink.href = mapsUrl;
        } else {
            document.querySelector(".place-location").innerHTML = `
        <p>No se encontraron coordenadas para este lugar.</p>
      `;
        }
    } else {
        // Si no hay datos, mostrar mensaje de error
        document.querySelector(".container").innerHTML = `
      <p>No se encontraron datos del lugar seleccionado.</p>
      <a href="./index.html" class="back-button">Volver al inicio</a>
    `;
    }
});

// Función para obtener el resumen de Wikipedia
async function fetchPlaceSummary(title) {
    const apiUrl = `https://es.wikipedia.org/w/api.php?action=query&prop=extracts&exintro&explaintext&titles=${encodeURIComponent(
        title
    )}&format=json&origin=*`;

    try {
        const response = await fetch(apiUrl);
        const data = await response.json();

        const pages = data.query.pages;
        const page = Object.values(pages)[0]; // Obtener la primera página
        if (page && page.extract) {
            document.getElementById("place-summary").textContent = page.extract;
        } else {
            document.getElementById("place-summary").textContent =
                "No se encontró información sobre este lugar.";
        }
    } catch (error) {
        console.error("Error al obtener el resumen:", error);
        document.getElementById("place-summary").textContent =
            "Hubo un problema al obtener la información.";
    }
}
