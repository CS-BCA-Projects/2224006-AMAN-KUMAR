import express from "express";
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { authorizeRoles } from '../middlewares/authorizeRole.middleware.js';
import { addAdmin, deleteAdmin, getAdmin, getAllAdmins, superAdminDashboard, updateAdmin } from "../controllers/superAdmin.controllers.js";

const router = express.Router();

router.route('/dashboard').get(verifyJWT,authorizeRoles("SuperAdmin"),superAdminDashboard)
//   Fetch all Admins
router.route("/admins").get(verifyJWT,authorizeRoles("SuperAdmin"),getAllAdmins)
//fetch a single admin
router.route("/admins/:id").get(verifyJWT,authorizeRoles("SuperAdmin"),getAdmin)
//   Add a new Admin
router.route("/admins/add").post(verifyJWT,authorizeRoles("SuperAdmin"),addAdmin)
//   Update Admin
router.route("/admins/update/:id").put(verifyJWT,authorizeRoles("SuperAdmin"),updateAdmin)
//   Delete Admin
router.route("/admins/delete/:id").delete(verifyJWT,authorizeRoles("SuperAdmin"),deleteAdmin)




export default router;
