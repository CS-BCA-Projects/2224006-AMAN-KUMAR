import mongoose, { mongo } from "mongoose";
import { DB_NAME } from "../constants.js";

const connectDB = async () =>{
    try {
        const conn = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
        console.log(`MONGODB connected !! DB Host : ${conn.connection.host}`)
    } catch (error) {
        console.log("Error found : ",error);
        process.exit(1);
    }
}

export default connectDB 