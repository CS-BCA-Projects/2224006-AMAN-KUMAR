import { ApiError } from "./ApiError.js";


const findLanLon = async function geocodeAddress(pinCode) {
    const url = `https://api.opencagedata.com/geocode/v1/json?q=${encodeURIComponent(pinCode)}&key=${process.env.OPENCAGE_API_KEY}`;

    try {
        const response = await fetch(url);
        console.log("Response Status:", response.status);

        if (!response.ok) {
            throw new ApiError(`Error fetching from OpenCage API: ${response.status}`);
        }

        const data = await response.json();
        console.log("Geocode API Response:", data);

        if (data.results.length > 0) {
            return {
                lat: data.results[0].geometry.lat,
                lon: data.results[0].geometry.lng
            };
        } else {
            console.error("No results found for the given pin code.");
            return null;
        }
    } catch (error) {
        console.error("Fetch error:", error);
        throw new ApiError(400, "Something went wrong while fetching location.");
    }
};

export { findLanLon };
