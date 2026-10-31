import axios, { AxiosError, InternalAxiosRequestConfig } from "axios"

export const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || "http://localhost:8000/api/v1"

export class ProofPathApiError extends Error {
  public status: number
  public code: string
  public details?: any

  constructor(message: string, status: number = 0, code: string = "UNKNOWN_ERROR", details?: any) {
    super(message)
    this.name = "ProofPathApiError"
    this.status = status
    this.code = code
    this.details = details
  }
}

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000, // 30s timeout for complex AI reasoning requests
  headers: {
    "Content-Type": "application/json",
  },
})

// Request Interceptor: Ensure correct headers and token injection if configured
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // If uploading FormData, let the browser set the boundary header automatically
    if (config.data instanceof FormData) {
      delete config.headers["Content-Type"]
    }
    return config
  },
  (error) => Promise.reject(error)
)

// Response Interceptor: Centralized Error Mapping
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<any>) => {
    // 1. Network / Disconnection Errors
    if (!error.response) {
      if (error.code === "ECONNABORTED" || error.message.includes("timeout")) {
        console.error("[ProofPath API] Request timeout:", error.config?.url)
        return Promise.reject(
          new ProofPathApiError(
            "Request timed out. The intelligence engine took longer than expected to respond.",
            408,
            "REQUEST_TIMEOUT"
          )
        )
      }
      console.error("[ProofPath API] Network / API disconnection error:", error.message)
      const targetHint = API_BASE_URL.includes("localhost") ? "on http://localhost:8000" : `at ${API_BASE_URL}`
      return Promise.reject(
        new ProofPathApiError(
          `Unable to connect to ProofPath backend. Please ensure the API is running ${targetHint}.`,
          0,
          "NETWORK_DISCONNECTED"
        )
      )
    }

    const { status, data } = error.response
    let userMessage = "An unexpected error occurred."
    let errorCode = "API_ERROR"

    // 2. Parse FastAPI error payload
    let rawDetail = data?.detail || data?.message || data?.error

    switch (status) {
      case 400:
        errorCode = "BAD_REQUEST"
        userMessage = typeof rawDetail === "string" ? rawDetail : "Invalid request data. Please verify your input."
        break

      case 401:
        errorCode = "UNAUTHORIZED"
        userMessage = typeof rawDetail === "string" ? rawDetail : "Authentication required. Access unauthorized."
        break

      case 403:
        errorCode = "FORBIDDEN"
        userMessage = typeof rawDetail === "string" ? rawDetail : "You do not have permission to perform this action."
        break

      case 404:
        errorCode = "NOT_FOUND"
        userMessage = typeof rawDetail === "string" ? rawDetail : "The requested research resource or finding was not found."
        break

      case 422:
        errorCode = "VALIDATION_ERROR"
        if (Array.isArray(rawDetail)) {
          // Format FastAPI validation error details
          const fieldErrors = rawDetail
            .map((err) => {
              const field = err.loc ? err.loc.slice(1).join(".") : "field"
              return `${field}: ${err.msg}`
            })
            .join("; ")
          userMessage = `Validation failed: ${fieldErrors}`
        } else if (typeof rawDetail === "string") {
          userMessage = rawDetail
        } else {
          userMessage = "Provided payload failed schema validation."
        }
        break

      case 429:
        errorCode = "RATE_LIMITED"
        userMessage = "Rate limit exceeded. The AI provider is throttling requests. Please retry in a few moments."
        break

      case 500:
      case 502:
      case 503:
      case 504:
        errorCode = "SERVER_ERROR"
        userMessage =
          typeof rawDetail === "string" && !rawDetail.includes("Traceback")
            ? `Server error: ${rawDetail}`
            : "Internal intelligence engine error. Please check server logs."
        break

      default:
        userMessage = typeof rawDetail === "string" ? rawDetail : `Request failed with status ${status}`
        break
    }

    console.error(`[ProofPath API] Error ${status} [${errorCode}]:`, userMessage)
    return Promise.reject(new ProofPathApiError(userMessage, status, errorCode, rawDetail))
  }
)
