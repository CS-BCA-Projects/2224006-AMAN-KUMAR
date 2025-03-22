import express from "express";
import { createSPHead, deleteSPHead, getSPHeadDetails, getSPHeads, updateSPHead } from "../controllers/admin.controllers.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.route("/dashboard").get( verifyJWT, (req, res) => {
    const user = req.user;
    res.render("adminDashboard",{user});
});

router.route("/spheads").get( verifyJWT,getSPHeadDetails);
router.route("/sphead-control").get(verifyJWT,getSPHeads);       // Get all SPHeads
router.route("/spheads/add").post(verifyJWT,createSPHead);    // Create a new SPHead
router.route("/spheads/update/:id").put(verifyJWT, updateSPHead); // Update an SPHead
router.route("/spheads/delete/:id").delete(verifyJWT, deleteSPHead); // Delete an SPHead

export default router;
