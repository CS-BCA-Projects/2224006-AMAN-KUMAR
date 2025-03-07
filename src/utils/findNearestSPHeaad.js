import { haversineDistance } from "./haversineDistance.js";
import { asyncHandler } from "./asyncHandler.js";
import { ApiError } from "./ApiError.js";
import { getMatchingSPHeads } from "./getMatchingSPHeads.js";

const getNearestSPHead = asyncHandler(async function findNearestSPHead(userLat, userLon, userState, userDistrict) {
    try {
        let nearestSPHead = null;
        let minDistance = Infinity;

        console.log(userDistrict)
        const spHeads = await getMatchingSPHeads(userState,userDistrict);
        console.log(spHeads);
    
        for (const spHead of spHeads) {
            const distance = haversineDistance(userLat, userLon, spHead.lat, spHead.lon);
    
            // Ensure the SPHead is within 15 km
            if (distance <= 15) {
                if (distance < minDistance) {
                    minDistance = distance;
                    nearestSPHead = spHead;
                }
            }
        }
    
        return nearestSPHead; // Returns null if no SPHead is found within range)
    } catch (error) {
        throw new ApiError("Something went wrong, please retry");
    }
});

export {getNearestSPHead};