const axios = require("axios");
const logger = require("./logger");

const api = axios.create({
    timeout: 30000, // 30 seconds
    headers: {
        "Content-Type": "application/json",
        Accept: "application/json"
    }
});

// Response interceptor for better error handling
api.interceptors.response.use(
    (response) => response.data,
    (error) => {
        const errorData = error.response ? error.response.data : error.message;
        logger.error(`API Call Failed: ${error.config.url}`, { error: errorData });
        return Promise.reject(errorData);
    }
);

module.exports = api;
