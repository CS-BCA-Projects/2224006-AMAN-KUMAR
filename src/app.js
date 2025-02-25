import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import multer from 'multer';

const app = express();

const upload = multer(); // For handling form-data
app.use(upload.none()); // Parses multipart form-data (without files)

app.use(cors({origin : process.env.CORS_ORIGIN,credentials : true}));
app.use(express.json({limit : "32kb"}));
app.use(express.urlencoded({extended: true, limit : "16kb"}))
app.use(express.static('public'))
app.use(cookieParser());

//router import
import userRouter from './routes/user.routes.js'

//routes

app.use("/api/v1/users",userRouter);



export {app}