import { Router } from 'express';
import { registerUser} from '../controllers/user.controllers.js';

const router = Router();

// Correct way to define routes
router.route("/register").post(registerUser);

export default router;
