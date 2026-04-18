/**
 * Example: Using the API Client for server-side requests
 * 
 * This file demonstrates various ways to use the APIClient module
 * for making HTTP requests from the server
 */

const APIClient = require("./apiClient");

// Example 1: Using the default instance
const apiClient = require("./apiClient").default;

// Example 2: Create a custom instance with your API
const userAPI = new APIClient("https://jsonplaceholder.typicode.com");

/**
 * Example GET request
 */
async function fetchUsers() {
  try {
    const users = await userAPI.get("/users");
    console.log("Users fetched:", users);
    return users;
  } catch (error) {
    console.error("Failed to fetch users:", error.message);
  }
}

/**
 * Example POST request with authentication
 */
async function createPost(userId, title, body) {
  try {
    const postAPI = new APIClient("https://jsonplaceholder.typicode.com");
    postAPI.setAuthToken("your-jwt-token-here");

    const newPost = await postAPI.post("/posts", {
      userId,
      title,
      body
    });

    console.log("Post created:", newPost);
    return newPost;
  } catch (error) {
    console.error("Failed to create post:", error.message);
  }
}

/**
 * Example PUT request (update)
 */
async function updatePost(postId, updatedData) {
  try {
    const postAPI = new APIClient("https://jsonplaceholder.typicode.com");
    const updated = await postAPI.put(`/posts/${postId}`, updatedData);
    console.log("Post updated:", updated);
    return updated;
  } catch (error) {
    console.error("Failed to update post:", error.message);
  }
}

/**
 * Example DELETE request
 */
async function deletePost(postId) {
  try {
    const postAPI = new APIClient("https://jsonplaceholder.typicode.com");
    const result = await postAPI.delete(`/posts/${postId}`);
    console.log("Post deleted:", result);
    return result;
  } catch (error) {
    console.error("Failed to delete post:", error.message);
  }
}

/**
 * Example with custom headers
 */
async function fetchWithCustomHeaders() {
  try {
    const api = new APIClient("https://api.github.com");
    api.setHeaders({
      "X-Custom-Header": "custom-value",
      "Accept": "application/vnd.github.v3+json"
    });

    const repos = await api.get("/users/github/repos");
    console.log("Repos:", repos);
    return repos;
  } catch (error) {
    console.error("Failed to fetch repos:", error.message);
  }
}

/**
 * Example with error handling
 */
async function robustAPICall(endpoint, method = "GET", data = null) {
  try {
    const api = new APIClient("https://api.example.com");

    let response;
    switch (method.toUpperCase()) {
      case "POST":
        response = await api.post(endpoint, data);
        break;
      case "PUT":
        response = await api.put(endpoint, data);
        break;
      case "DELETE":
        response = await api.delete(endpoint);
        break;
      case "GET":
      default:
        response = await api.get(endpoint);
    }

    return { success: true, data: response };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      status: error.response?.status || null
    };
  }
}

// Export functions for use in server routes
module.exports = {
  fetchUsers,
  createPost,
  updatePost,
  deletePost,
  fetchWithCustomHeaders,
  robustAPICall,
  APIClient
};

// Uncomment to test locally:
// (async () => {
//   console.log("=== Testing API Client ===");
//   await fetchUsers();
//   await updatePost(1, { title: "Updated Title" });
// })();
