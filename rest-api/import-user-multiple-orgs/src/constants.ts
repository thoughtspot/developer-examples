import dotenv from 'dotenv';
dotenv.config();

// ThoughtSpot config
export const THOUGHTSPOT_HOST = process.env.THOUGHTSPOT_HOST || '';

// Cluster Secret key
export const SECRET_KEY = process.env.SECRET_KEY || ''

// Username
export const THOUGHTSPOT_USERNAME = process.env.THOUGHTSPOT_USERNAME || '';

// Password
export const THOUGHTSPOT_PASSWORD = process.env.THOUGHTSPOT_PASSWORD || '';

// Org identifier1
export const ORG_IDENTIFIER1 = process.env.ORG_IDENTIFIER1 || '';

// Org identifier2
export const ORG_IDENTIFIER2 = process.env.ORG_IDENTIFIER2 || '';