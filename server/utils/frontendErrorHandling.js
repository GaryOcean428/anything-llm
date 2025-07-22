/**
 * Frontend Error Handling Enhancement
 *
 * This script provides better error handling for frontend API calls,
 * specifically addressing the "Failed to fetch logo!" error mentioned
 * in the problem statement.
 */

// Enhanced fetchLogo function with proper error handling
const fetchLogoWithErrorHandling = async () => {
  try {
    const response = await fetch("/api/system/logo", {
      method: "GET",
      headers: {
        Accept: "image/*",
        "Cache-Control": "no-cache",
      },
      // Add timeout to prevent hanging requests
      signal: AbortSignal.timeout(10000), // 10 second timeout
    });

    // Handle different response scenarios
    if (response.status === 204) {
      // No logo available - this is normal, don't log as error
      console.info("No custom logo configured, using default");
      return null;
    }

    if (response.status === 404) {
      console.info("Logo endpoint not found, using default");
      return null;
    }

    if (!response.ok) {
      console.warn(
        `Logo fetch returned ${response.status}: ${response.statusText}`
      );
      return null;
    }

    // Check if response actually contains image data
    const contentType = response.headers.get("content-type");
    if (!contentType || !contentType.startsWith("image/")) {
      console.warn("Logo response does not contain image data");
      return null;
    }

    const blob = await response.blob();

    // Validate blob size (prevent empty responses)
    if (blob.size === 0) {
      console.info("Logo response is empty, using default");
      return null;
    }

    return blob;
  } catch (error) {
    // Handle different error types gracefully
    if (error.name === "AbortError") {
      console.warn("Logo fetch timed out, using default logo");
    } else if (error.name === "TypeError" && error.message.includes("fetch")) {
      console.warn(
        "Logo fetch failed due to network error, using default logo"
      );
    } else {
      console.warn("Logo fetch failed:", error.message, "- using default logo");
    }

    // Always return null instead of throwing, to prevent UI breakage
    return null;
  }
};

// Enhanced request token function with better error handling
const requestTokenWithErrorHandling = async (credentials) => {
  try {
    const response = await fetch("/api/request-token", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify(credentials),
      // Add timeout for auth requests
      signal: AbortSignal.timeout(15000), // 15 second timeout
    });

    const data = await response.json();

    // Handle different response scenarios
    if (!response.ok) {
      if (response.status === 400) {
        throw new Error(data.message || "Invalid credentials format");
      } else if (response.status === 401) {
        throw new Error("Invalid username or password");
      } else if (response.status === 503) {
        throw new Error("Authentication service temporarily unavailable");
      } else {
        throw new Error(
          data.message || `Authentication failed (${response.status})`
        );
      }
    }

    return data;
  } catch (error) {
    if (error.name === "AbortError") {
      throw new Error("Authentication request timed out. Please try again.");
    } else if (error.name === "TypeError" && error.message.includes("fetch")) {
      throw new Error(
        "Network error during authentication. Please check your connection."
      );
    } else {
      // Re-throw the error with context
      throw error;
    }
  }
};

// Utility function to handle API errors consistently
const handleApiError = (error, context = "API request") => {
  console.error(`[${context}] Error:`, error.message);

  // Determine user-friendly error message
  let userMessage = "An unexpected error occurred. Please try again.";

  if (error.message.includes("network") || error.message.includes("fetch")) {
    userMessage = "Network error. Please check your connection and try again.";
  } else if (error.message.includes("timeout")) {
    userMessage = "Request timed out. Please try again.";
  } else if (
    error.message.includes("authentication") ||
    error.message.includes("credentials")
  ) {
    userMessage = error.message; // Use specific auth error message
  }

  return {
    error: true,
    message: userMessage,
    technical: error.message, // For debugging purposes
  };
};

// Export functions for use in frontend
if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    fetchLogoWithErrorHandling,
    requestTokenWithErrorHandling,
    handleApiError,
  };
}

// For browser environments
if (typeof window !== "undefined") {
  window.EnhancedApiHandling = {
    fetchLogoWithErrorHandling,
    requestTokenWithErrorHandling,
    handleApiError,
  };
}
