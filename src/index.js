import dotenv from 'dotenv'
import connectDB from './db/index.js';
import { app } from './app.js';

const port = process.env.PORT || 3001;

dotenv.config({
    path: "./env"
})

connectDB()
.then(() =>{
    app.listen(port,() => {
        console.log(`Sever is running on port ${port}`)
    })
}).catch((err) => {
    console.log("MongoDB connection failed : ",err)
})
