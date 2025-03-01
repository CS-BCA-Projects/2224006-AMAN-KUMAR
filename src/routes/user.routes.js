import { Router } from 'express';
import { registerUser,feedContact,verifyEmail, loginUser,logoutUser,refreshAccessToken, forgotPassword, resetPassword} from '../controllers/user.controllers.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { authorizeRoles } from '../middlewares/authorizeRole.middleware.js';

const router = Router();

// Correct way to define routes
router.route("/register").post(registerUser);
router.route("/register/contactDetails").post(feedContact);
router.get("/register/verify-email", verifyEmail); // Verification route
router.route("/login").post(loginUser)
router.route("/login/forgot-password").post(forgotPassword)
router.get("/login/reset-password",resetPassword)

//secured routes
router.route("/logout").post(verifyJWT, logoutUser)
router.route("/refresh-token",refreshAccessToken)

// Protected Routes
router.get("/user-dashboard", verifyJWT, authorizeRoles("User"), (req, res) => {
    res.json({ message: "Welcome to User Dashboard" });
});

router.get("/sphead-dashboard", verifyJWT, authorizeRoles("SPHead"), (req, res) => {
    res.json({ message: "Welcome to SPHead Dashboard" });
});

router.get("/admin-dashboard", verifyJWT, authorizeRoles("Admin"), (req, res) => {
    res.json({ message: "Welcome to Admin Dashboard" });
});

router.get("/superadmin-dashboard", verifyJWT, authorizeRoles("SuperAdmin"), (req, res) => {
    res.json({ message: "Welcome to Super Admin Dashboard" });
});
export default router;
