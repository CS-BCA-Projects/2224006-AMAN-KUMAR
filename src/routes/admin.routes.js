import express from "express";
import { createSPHead, deleteSPHead, getSPHeadDetails, getSPHeads, updateSPHead } from "../controllers/admin.controllers.js";
import { verifyJWT } from "../middlewares/auth.middleware.js";
import { authorizeRoles } from "../middlewares/authorizeRole.middleware.js";

const router = express.Router();

router.route("/dashboard").get( verifyJWT,authorizeRoles("Admin"), (req, res) => {
    const user = req.user;
    res.render("adminDashboard",{user});
});

router.route("/spheads").get( verifyJWT,authorizeRoles("Admin"),getSPHeadDetails);
router.route("/sphead-control").get(verifyJWT,authorizeRoles("Admin"),getSPHeads);       // Get all SPHeads
router.route("/spheads/add").post(verifyJWT,authorizeRoles("Admin"),createSPHead);    // Create a new SPHead
router.route("/spheads/update/:id").put(verifyJWT, authorizeRoles("Admin"),updateSPHead); // Update an SPHead
router.route("/spheads/delete/:id").delete(verifyJWT,authorizeRoles("Admin"), deleteSPHead); // Delete an SPHead

export default router;
