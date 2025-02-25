const findLanLon = async function geocodeAddress(pincode) {
    const url = `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(pincode)}&format=json`;
    
    try {
        const response = await fetch(url);
        
        if (!response.ok) {
            console.error("Error: Failed to fetch from OpenStreetMap", response.status);
            return null;
        }

        const data = await response.json();
        console.log("Geocode API Response:", data); // Debugging log

        if (data.length > 0) {
            return { lat: parseFloat(data[0].lat), lon: parseFloat(data[0].lon) };
        } else {
            console.error("No results found for given address & pincode.");
            return null;
        }
    } catch (error) {
        console.error("Fetch error:", error);
        return null;
    }
}

export { findLanLon };
