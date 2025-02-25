import { Router } from 'express';
import { registerUser,feedContact,verifyEmail} from '../controllers/user.controllers.js';

const router = Router();

// Correct way to define routes
router.route("/register").post(registerUser);
router.route("/register/contactDetails").post(feedContact);
router.get("/register/verify-email", verifyEmail); // Verification route

export default router;
