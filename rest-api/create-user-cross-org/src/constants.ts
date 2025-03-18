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

// User identifier
export const USER_IDENTIFIER = process.env.USER_IDENTIFIER || '';

// User email
export const USER_EMAIL = process.env.USER_EMAIL || '';

// Org identifier1
export const ORG_IDENTIFIER1 = process.env.ORG_IDENTIFIER1 || '';

// Org identifier2
export const ORG_IDENTIFIER2 = process.env.ORG_IDENTIFIER2 || '';