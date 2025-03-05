import { haversineDistance } from "./haversineDistance";
import User from "../models/user.models";

try {
    // Find the nearest SPHead within 15 km using Haversine formula
    function findNearestSPHead(userLat, userLon) {
        let nearestSPHead = null;
        let minDistance = Infinity;
    
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
    
        return nearestSPHead; // Returns null if no SPHead is found within range
    }
} catch (error) {
    
}