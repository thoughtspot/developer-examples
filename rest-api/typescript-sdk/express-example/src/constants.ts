import dotenv from 'dotenv';
dotenv.config();

// Server config
export const PORT = process.env.PORT || 4123;

// ThoughtSpot config
export const THOUGHTSPOT_HOST = process.env.THOUGHTSPOT_HOST || '';

// Cluster Secret key
export const SECRET_KEY = process.env.SECRET_KEY || ''