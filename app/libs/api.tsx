import axios from "axios";

// Read the base URL from your environment variables, defaulting to localhost for dev
const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true, // CRITICAL: This allows the browser to send/receive HTTP-only cookies
  headers: {
    "Content-Type": "application/json",
  },
});