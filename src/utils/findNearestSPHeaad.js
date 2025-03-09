import { haversineDistance } from "./haversineDistance.js";
import { asyncHandler } from "./asyncHandler.js";
import { ApiError } from "./ApiError.js";
import { getMatchingSPHeads } from "./getMatchingSPHeads.js";

const getNearestSPHead = asyncHandler(async function (...userLocation) {
    console.log("🔍 Inside getNearestSPHead function");
    const [userLat, userLon, userDistrict, userState,name] = userLocation;
    console.log("Received Location Data:", { userLat, userLon, userDistrict, userState, name});
    try {
        if (!userLat || !userLon || !userState || !userDistrict) {
            throw new ApiError(400, "Invalid user location details provided");
        }

        let nearestSPHead = null;
        let minDistance = Infinity;

        console.log(`🔍 Searching for SPHeads in: ${userDistrict}, ${userState}`);

        // Fetch SPHeads based on state & district
        const spHeads = getMatchingSPHeads(userState, userDistrict);

        if (!spHeads || spHeads.length === 0) {
            console.log("⚠️ No SPHeads found in this location");
            return null;
        }

        console.log(`✅ Found ${spHeads.length} SPHeads, calculating distances...`);

        for (const spHead of spHeads) {
            const distance = haversineDistance(userLat, userLon, spHead.lat, spHead.lon);

            console.log(`📏 Distance to SPHead (${spHead.name}): ${distance.toFixed(2)} km`);

            // ✅ If distance is 0, immediately return (Exact match)
            if (distance === 0) return spHead;

            // ✅ Ensure the SPHead is within 15 km and closest so far
            if (distance <= 15 && distance < minDistance) {
                minDistance = distance;
                nearestSPHead = spHead;
            }
        }

        if (!nearestSPHead) {
            console.log("❌ No SPHead found within 15 km range.");
        } else {
            console.log(`🎯 Nearest SPHead: ${nearestSPHead.name} (${minDistance.toFixed(2)} km away)`);
        }

        return nearestSPHead; // Returns null if no SPHead is found within range
    } catch (error) {
        console.error("❌ Error in getNearestSPHead:", error);
        throw new ApiError(500, "Something went wrong, please retry");
    }
});

export { getNearestSPHead };
