import User from "../models/user.models.js";
import { asyncHandler } from "../utils/asyncHandler.js";
import { findLanLon } from "../utils/extractLatLon.js";

const getSPHeadDetails = asyncHandler(async (req, res) => {
    const { state, month, year } = req.query;

    if (!state || !month || !year) {
        return res.status(400).json({ message: "State, month, and year are required." });
    }

    // Convert month and year to Date range
    const startDate = new Date(`${year}-${month}-01T00:00:00.000Z`);
    const endDate = new Date(`${year}-${month}-31T23:59:59.999Z`);

    const spHeadDetails = await User.aggregate([
        // ✅ Match only SPHeads in the given state
        { $match: { role: "SPHead", state: state } },

        // ✅ Convert `assignedTo` in `EventRequest` to ObjectId and Lookup Events
        {
            $lookup: {
                from: "eventrequests",
                let: { spHeadId: { $toString: "$_id" } }, // Convert `_id` to string
                pipeline: [
                    {
                        $match: {
                            $expr: { $eq: ["$assignedTo", "$$spHeadId"] }, // Match assignedTo
                            requested_date: { $gte: startDate, $lte: endDate } // Filter by date
                        }
                    }
                ],
                as: "events"
            }
        },

        // ✅ Compute event counts
        {
            $addFields: {
                totalEvents: { $size: "$events" },
                pendingEvents: {
                    $size: {
                        $filter: {
                            input: "$events",
                            as: "event",
                            cond: { $in: ["$$event.status", ["Approved", "Pending", "Assigned"]] }
                        }
                    }
                },
                rejectedEvents: {
                    $size: {
                        $filter: {
                            input: "$events",
                            as: "event",
                            cond: { $eq: ["$$event.status", "Rejected"] }
                        }
                    }
                },
                completedEvents: {
                    $size: {
                        $filter: {
                            input: "$events",
                            as: "event",
                            cond: { $eq: ["$$event.status", "Completed"] }
                        }
                    }
                }
            }
        },

        // ✅ Project required fields including PIN Code
        {
            $project: {
                _id: 1,
                name: 1,
                pincode: 1,  // Ensure PIN Code is included
                totalEvents: 1,
                pendingEvents: 1,
                rejectedEvents: 1,
                completedEvents: 1
            }
        }
    ]);
    res.status(200).json(spHeadDetails);
});

// ✅ Fetch all SPHeads
const getSPHeads = asyncHandler(async (req, res) => {
    const user = req.user;
    const spHeads = await User.find({ role: "SPHead" })
        .select("name email phone state district pincode address lat lon");
    res.render("spheadAdminControl", { spHeads,user });
});

// ✅ Create a new SPHead
const createSPHead = asyncHandler(async (req, res) => {
    const { name, email, phone, state, district, pincode, address } = req.body;

    // Check if SPHead with email already exists
    const existingSPHead = await User.findOne({ email });
    if (existingSPHead) {
        return res.status(400).json({ message: "SPHead with this email already exists" });
    }

    // Get latitude & longitude from pin code
    const geoLocation = await findLanLon(pinCode);
    if (!geoLocation) {
        return res.status(400).json({ message: "Invalid pin code or location not found" });
    }

    // Create new SPHead
    const newSPHead = new User({
        name,
        email,
        phone,
        state,
        district,
        pinCode,
        address,
        lat: geoLocation.lat,
        lon: geoLocation.lon,
        role: "SPHead",
        isVerified: true,
        password: "gurudev123" // Default password
    });

    await newSPHead.save();
    res.status(201).json({ message: "SPHead created successfully", newSPHead });
});

// ✅ Update an SPHead
const updateSPHead = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const { name, email, phone, state, district, pinCode, address } = req.body;

    // Get latitude & longitude from pin code
    const geoLocation = await findLanLon(pinCode);
    if (!geoLocation) {
        return res.status(400).json({ message: "Invalid pin code or location not found" });
    }

    const updatedSPHead = await User.findByIdAndUpdate(
        id,
        { name, email, phone, state, district, pinCode, address, lat: geoLocation.lat, lon: geoLocation.lon },
        { new: true }
    );

    if (!updatedSPHead) {
        return res.status(404).json({ message: "SPHead not found" });
    }

    res.status(200).json({ message: "SPHead updated successfully", updatedSPHead });
});

// ✅ Delete an SPHead
const deleteSPHead = asyncHandler(async (req, res) => {
    const { id } = req.params;
    const deletedSPHead = await User.findByIdAndDelete(id);

    if (!deletedSPHead) {
        return res.status(404).json({ message: "SPHead not found" });
    }

    res.status(200).json({ message: "SPHead deleted successfully" });
});

export { getSPHeadDetails,
        deleteSPHead,
        updateSPHead,
        createSPHead,
        getSPHeads
 };
