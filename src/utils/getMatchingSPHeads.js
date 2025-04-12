import User from "../models/user.models.js";
import { asyncHandler } from "./asyncHandler.js";
import { ApiError } from "./ApiError.js";

const getMatchingSPHeads = async function (userState, userDistrict) {
    try {
        let spHeads = await User.aggregate([
            {
                $match: { 
                    role: "SPHead", 
                    state: userState, 
                    district: userDistrict 
                }
            },
            {
                $project: { 
                    name: 1, 
                    email: 1, 
                    state: 1, 
                    district: 1, 
                    location: 1,
                    email :1,
                    phone : 1,
                    lat :1,
                    lon:1,
                }
            }
        ]);

        if (!spHeads.length) {
            spHeads = null
        }

        return spHeads; // Returns an array of matching SPHeads
    } catch (error) {
        throw new ApiError(500, "Something went wrong while fetching SPHeads.");
    }
};

export { getMatchingSPHeads };
