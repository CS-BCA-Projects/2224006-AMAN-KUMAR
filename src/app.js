import express from 'express';
import session from "express-session"
import cors from 'cors';
import cookieParser from 'cookie-parser';
import multer from 'multer';
import path from "path";
import { fileURLToPath } from "url";
import { errorHandler } from './middlewares/errorHandler.middleware.js';

const app = express();

const upload = multer(); // For handling form-data
app.use(upload.none()); // Parses multipart form-data (without files)

app.use(cors({origin : process.env.CORS_ORIGIN,credentials : true}));
app.use(express.json({limit : "32kb"}));
app.use(express.urlencoded({extended: true, limit : "16kb"}))
app.use(express.static('public'))
app.use(cookieParser());
app.use(
    session({
        secret: process.env.SESSION_SECRET || "mysecret", // Change to a strong secret in .env
        resave: false,
        saveUninitialized: true,
        cookie: {
            secure: false, // Change to `true` in production (only works with HTTPS)
            httpOnly: true,
            maxAge: 24 * 60 * 60 * 1000, // 1 day expiry
        }
    })
);


// Convert import to CommonJS-compatible __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Enable CORS for frontend-backend communication
app.use(cors());

// Set EJS as the template engine
app.set("view engine", "ejs");
app.set("views", path.join(process.cwd(), "frontend", "views"));
app.use(express.static(path.join(process.cwd(), "frontend", "public")));

//router import
import Router from './routes/user.routes.js'
import superAdminRoutes from './routes/superAdmin.routes.js'
import adminRoutes from './routes/admin.routes.js'
import dashboardRoute from './routes/dashboard.routes.js'

app.use("/",dashboardRoute)
app.use("/api/v1",Router);
app.use("/api/v1/superadmin", superAdminRoutes);
app.use("/api/v1/admin", adminRoutes);

// Use the global error handler (must be after routes)
app.use(errorHandler);
export {app}