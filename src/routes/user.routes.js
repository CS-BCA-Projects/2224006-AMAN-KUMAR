import { Router } from 'express';
import { dashboard,login,signUp, registerUser,feedContact,verifyEmail, loginUser,logoutUser,refreshAccessToken, forgotPassword, resetPassword, verifyEmailPage, contactDetails, resetPasswordPage, userDashboard, addEvent,registerEvent, about, contactPage, spHeadDashboard} from '../controllers/user.controllers.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';
import { authorizeRoles } from '../middlewares/authorizeRole.middleware.js';

const router = Router();

// Correct way to define routes
router.get("/dashboard",dashboard)
router.get("/login",login)
router.get("/sign-up",signUp)
router.get("/verifyEmailForSignup",verifyEmailPage)
router.get("/contact-details",verifyJWT,contactDetails)
router.get('/login/reset-password',resetPasswordPage)
router.route("/register").post(registerUser);
router.get("/register/verify-email", verifyEmail); // Verification route
router.route("/submit-contactDetails").post(verifyJWT,feedContact);
router.route("/login").post(loginUser)
router.route("/login/forgot-password").post(forgotPassword)
router.get("/login/reset-password",resetPassword)

//secured routes
router.route("/logout").post(verifyJWT, logoutUser)
router.route("/refresh-token",refreshAccessToken)
router.route('/add-event').post(verifyJWT,registerEvent);


// Protected Routes
router.get("/user-dashboard", verifyJWT, authorizeRoles("User"), userDashboard);
router.get("/about",about);
router.get('/contact',contactPage)
router.get("/spHead-dashboard", verifyJWT,authorizeRoles("SPHead"), spHeadDashboard);
router.get("/user-dashboard/add-event",verifyJWT,authorizeRoles("User"),addEvent)

router.get("/admin-dashboard", verifyJWT, authorizeRoles("Admin"), (req, res) => {
    res.json({ message: "Welcome to Admin Dashboard" });
});

router.get("/superadmin-dashboard", verifyJWT, authorizeRoles("SuperAdmin"), (req, res) => {
    res.json({ message: "Welcome to Super Admin Dashboard" });
});

export default router;
