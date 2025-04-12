// models/UnassignedEventRequest.js

import mongoose from 'mongoose';

const unassignedEventSchema = new mongoose.Schema({
    requestedBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    eventType: {
        type: String,
        required: true
    },
    requested_date: {
        type: String,
        required: true
    },
    requested_time: {
        type: String,
        required: true
    },
    description: {
        type: String
    },
    userLocation: {
        lat: Number,
        lon: Number,
        state: String,
        district: String
    },
    createdAt: {
        type: Date,
        default: Date.now
    }
});

const UnassignedEventRequest = mongoose.model('UnassignedEventRequest', unassignedEventSchema);
export default UnassignedEventRequest;
