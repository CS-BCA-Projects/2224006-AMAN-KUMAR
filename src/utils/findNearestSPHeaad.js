import { haversineDistance } from "./haversineDistance.js";
import { asyncHandler } from "./asyncHandler.js";
import { ApiError } from "./ApiError.js";
import { getMatchingSPHeads } from "./getMatchingSPHeads.js";

const getNearestSPHead = asyncHandler(async function (...userLocation) {
    const [userLat, userLon, userDistrict, userState,name] = userLocation;

    try {
        if (!userLat || !userLon || !userState || !userDistrict) {
            throw new ApiError(400, "Invalid user location details provided");
        }

        let nearestSPHead = null;
        let minDistance = Infinity;

        // Fetch SPHeads based on state & district
        const spHeads = getMatchingSPHeads(userState, userDistrict);

        if (!spHeads || spHeads.length === 0) {
            throw new ApiError(400,"No SPHeads found in this location");
        }

        for (const spHead of spHeads) {
            const distance = haversineDistance(userLat, userLon, spHead.lat, spHead.lon);

            //   If distance is 0, immediately return (Exact match)
            if (distance === 0) return spHead;

            //   Ensure the SPHead is within 15 km and closest so far
            if (distance <= 15 && distance < minDistance) {
                minDistance = distance;
                nearestSPHead = spHead;
            }
        }

        if (!nearestSPHead) {
            throw new ApiError(400,"No SPHead found within 15 km range.");
        }
        return nearestSPHead; // Returns null if no SPHead is found within range
    } catch (error) {
        throw new ApiError(500, "Something went wrong, please retry");
    }
});

export { getNearestSPHead };
