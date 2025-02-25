import { Router } from 'express';
import { registerUser,feedContact} from '../controllers/user.controllers.js';

const router = Router();

// Correct way to define routes
router.route("/register").post(registerUser);
router.route("/register/contactDetails").post(feedContact);

export default router;
