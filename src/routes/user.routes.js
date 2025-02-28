import { Router } from 'express';
import { registerUser,feedContact,verifyEmail, loginUser,logoutUser} from '../controllers/user.controllers.js';
import { verifyJWT } from '../middlewares/auth.middleware.js';

const router = Router();

// Correct way to define routes
router.route("/register").post(registerUser);
router.route("/register/contactDetails").post(feedContact);
router.get("/register/verify-email", verifyEmail); // Verification route
router.route("/login").post(loginUser)
router.route("/logout").post(verifyJWT, logoutUser)

export default router;
