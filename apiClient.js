const axios = require("axios");

/**
 * API Client for making server-side HTTP requests
 * Provides a centralized way to handle API calls with error handling and config
 */
class APIClient {
  constructor(baseURL = "https://api.example.com", timeout = 5000) {
    this.baseURL = baseURL;
    this.timeout = timeout;

    // Create axios instance with default config
    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: this.timeout,
      headers: {
        "Content-Type": "application/json"
      }
    });

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => this.handleError(error)
    );
  }

  /**
   * Handle API errors with logging
   */
  handleError(error) {
    if (error.response) {
      // Server responded with error status
      console.error(`API Error: ${error.response.status}`, error.response.data);
    } else if (error.request) {
      // Request made but no response received
      console.error("No response received:", error.request);
    } else {
      // Error in request setup
      console.error("Request error:", error.message);
    }
    return Promise.reject(error);
  }

  /**
   * GET request
   */
  async get(endpoint, config = {}) {
    try {
      const response = await this.client.get(endpoint, config);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * POST request
   */
  async post(endpoint, data = {}, config = {}) {
    try {
      const response = await this.client.post(endpoint, data, config);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * PUT request
   */
  async put(endpoint, data = {}, config = {}) {
    try {
      const response = await this.client.put(endpoint, data, config);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * PATCH request
   */
  async patch(endpoint, data = {}, config = {}) {
    try {
      const response = await this.client.patch(endpoint, data, config);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * DELETE request
   */
  async delete(endpoint, config = {}) {
    try {
      const response = await this.client.delete(endpoint, config);
      return response.data;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Set authorization header
   */
  setAuthToken(token) {
    this.client.defaults.headers.common["Authorization"] = `Bearer ${token}`;
  }

  /**
   * Clear authorization header
   */
  clearAuthToken() {
    delete this.client.defaults.headers.common["Authorization"];
  }

  /**
   * Update base URL
   */
  setBaseURL(baseURL) {
    this.baseURL = baseURL;
    this.client.defaults.baseURL = baseURL;
  }

  /**
   * Add custom headers
   */
  setHeaders(headers) {
    Object.assign(this.client.defaults.headers.common, headers);
  }
}

// Create and export a default instance
const apiClient = new APIClient();

module.exports = APIClient;
module.exports.default = apiClient;
