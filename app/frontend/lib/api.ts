/**
 * API client for backend communication
 * Centralized fetch wrapper with error handling
 * Includes Mock Mode for demo purposes
 */

// Ensure API URL always uses HTTPS (fixes mixed content errors)
const getApiUrl = () => {
  const url = process.env.NEXT_PUBLIC_API_URL || 'https://commitment-backend.onrender.com';
  // Force HTTPS if URL starts with http:// (fixes mixed content errors)
  if (url.startsWith('http://')) {
    return url.replace('http://', 'https://');
  }
  return url;
};

const API_URL = getApiUrl();

// Export utility function for use in other files
export function ensureHttpsUrl(url: string): string {
  if (url.startsWith('http://')) {
    return url.replace('http://', 'https://');
  }
  return url;
}

// Enable mock mode via environment variable (NEXT_PUBLIC_USE_MOCK_DATA=true)
const USE_MOCK_DATA = process.env.NEXT_PUBLIC_USE_MOCK_DATA === 'true'; 

export interface PoolCreateRequest {
  pool_id: number;
  pool_pubkey: string;
  creator_wallet: string;
  name: string;
  description?: string;
  goal_type: string;
  goal_metadata: Record<string, any>;
  stake_amount: number;
  duration_days: number;
  max_participants: number;
  min_participants?: number;
  distribution_mode?: string;
  split_percentage_winners?: number;
  charity_address: string;
  start_timestamp: number;
  end_timestamp: number;
  is_public?: boolean;
  recruitment_period_hours?: number;
  require_min_participants?: boolean;
}

export interface PoolResponse {
  pool_id: number;
  pool_pubkey: string;
  creator_wallet: string;
  name: string;
  description?: string;
  goal_type: string;
  goal_metadata: Record<string, any>;
  stake_amount: number;
  duration_days: number;
  max_participants: number;
  participant_count: number;
  distribution_mode: string;
  split_percentage_winners: number;
  charity_address: string;
  total_staked: number;
  yield_earned: number;
  yield_last_updated?: string;
  final_pool_value?: number;
  status: string;
  start_timestamp: number;
  end_timestamp: number;
  is_public: boolean;
  created_at: string;
  updated_at: string;
  recruitment_period_hours?: number;
  scheduled_start_time?: number;
  require_min_participants?: boolean;
}

export interface PoolConfirmRequest {
  pool_id: number;
  pool_pubkey: string;
  transaction_signature: string;
  creator_wallet: string;
  name: string;
  description?: string;
  goal_type: string;
  goal_metadata: Record<string, any>;
  stake_amount: number;
  duration_days: number;
  max_participants: number;
  min_participants?: number;
  distribution_mode?: string;
  split_percentage_winners?: number;
  charity_address: string;
  start_timestamp: number;
  end_timestamp: number;
  is_public?: boolean;
  recruitment_period_hours?: number;
  require_min_participants?: boolean;
}

export interface JoinPoolConfirmRequest {
  transaction_signature: string;
  participant_wallet: string;
}

export interface ForfeitPoolConfirmRequest {
  transaction_signature: string;
  participant_wallet: string;
}


class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public data?: any
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

/**
 * Fetch with timeout and retry logic for Render cold starts
 */
async function fetchWithTimeout(
  url: string,
  options: RequestInit,
  timeout: number = 30000 // 30 seconds default
): Promise<Response> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      // Add mode and credentials for better CORS handling
      mode: 'cors',
      credentials: 'omit', // Don't send cookies to avoid CORS issues
    });
    clearTimeout(timeoutId);
    return response;
  } catch (err: any) {
    clearTimeout(timeoutId);
    if (err.name === 'AbortError') {
      throw new Error(`Request timeout after ${timeout}ms. Backend may be waking up from sleep.`);
    }
    // Preserve the original error for better debugging
    if (err instanceof TypeError && err.message.includes('Failed to fetch')) {
      // This is a network error - could be CORS, connectivity, or server issue
      throw new Error(`Network error: ${err.message}. Check CORS configuration and network connectivity.`);
    }
    throw err;
  }
}

/**
 * Fetch with retry logic for Render cold starts
 */
async function fetchWithRetry<T>(
  url: string,
  options: RequestInit,
  maxRetries: number = 2,
  retryDelay: number = 2000
): Promise<T> {
  let lastError: any;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      // Increase timeout for retries (backend might be waking up)
      const timeout = attempt === 0 ? 30000 : 45000; // 30s first try, 45s retries
      
      const response = await fetchWithTimeout(url, options, timeout);
      
      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { detail: response.statusText };
        }
        
        const errorMessage = errorData.detail || errorData.error || errorData.message || 'API request failed';
        throw new ApiError(errorMessage, response.status, errorData);
      }
      
      // Handle empty responses
      const contentType = response.headers.get('content-type');
      if (!contentType || !contentType.includes('application/json')) {
        return {} as T;
      }
      
      return await response.json();
    } catch (err: unknown) {
      lastError = err;
      
      // Safely extract error properties for TypeScript
      const errorName = err instanceof Error ? err.name : 
                       (typeof err === 'object' && err !== null && 'name' in err) 
                         ? String((err as { name?: unknown }).name) 
                         : 'Unknown';
      const errorMessage = err instanceof Error ? err.message :
                          (typeof err === 'object' && err !== null && 'message' in err)
                            ? String((err as { message?: unknown }).message)
                            : String(err);
      const errorType = err instanceof Error ? err.constructor?.name : 'Unknown';
      
      console.warn(`[API Retry ${attempt + 1}/${maxRetries + 1}] Error:`, {
        name: errorName,
        message: errorMessage,
        type: errorType,
        url: url,
      });
      
      // Don't retry on client errors (4xx) or if it's the last attempt
      if ((err instanceof ApiError && (err.status >= 400 && err.status < 500)) || attempt === maxRetries) {
        throw err;
      }
      
      // Check if it's a network error
      const isNetworkError = errorMessage.includes('Failed to fetch') || 
                            errorMessage.includes('NetworkError') ||
                            errorName === 'TypeError' ||
                            errorMessage.includes('fetch') ||
                            errorMessage.includes('timeout');
      
      // Check if it's a CORS error
      const isCorsError = errorMessage.includes('CORS') || 
                         errorMessage.includes('cors') ||
                         errorMessage.includes('Access-Control');
      
      if (isCorsError && attempt === 0) {
        // CORS errors shouldn't be retried - they indicate a configuration issue
        throw new ApiError(
          'CORS error: Backend may not be configured to allow requests from this domain. Check CORS_ORIGINS in backend configuration.',
          0,
          err
        );
      }
      
      // Wait before retrying (exponential backoff)
      if (attempt < maxRetries) {
        const delay = retryDelay * Math.pow(2, attempt);
        const errorMsg = isNetworkError 
          ? `Network error. Retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries + 1})`
          : `API request failed. Retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries + 1})`;
        console.warn(errorMsg);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // If we get here, all retries failed
  // Provide a helpful error message for network errors
  const lastErrorMessage = lastError instanceof Error ? lastError.message :
                          (typeof lastError === 'object' && lastError !== null && 'message' in lastError)
                            ? String((lastError as any).message)
                            : String(lastError);
  const lastName = lastError instanceof Error ? lastError.name :
                  (typeof lastError === 'object' && lastError !== null && 'name' in lastError)
                    ? String((lastError as any).name)
                    : '';
  
  if (lastErrorMessage.includes('Failed to fetch') || 
      lastName === 'TypeError' ||
      lastErrorMessage.includes('NetworkError')) {
    throw new ApiError(
      'Unable to connect to backend server after multiple attempts. Please check your network connection and ensure the backend is running.',
      0,
      lastError
    );
  }

  throw lastError;
}

/**
 * Wake up backend server if it's sleeping (Render cold start)
 * This is a lightweight health check that helps wake up the server
 */
async function wakeUpBackend(): Promise<void> {
  try {
    // Try a quick health check to wake up the backend
    // Use a short timeout so we don't block for too long
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout
    
    await fetch(`${API_URL}/health`, {
      method: 'GET',
      signal: controller.signal,
      cache: 'no-store',
    });
    
    clearTimeout(timeoutId);
  } catch (err) {
    // Ignore errors - backend might be waking up
    // The actual request will handle retries
  }
}

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  // Use Mock Data if enabled
  if (USE_MOCK_DATA) {
     console.log(`[MOCK API] ${options.method || 'GET'} ${endpoint}`, options.body);
     await new Promise(resolve => setTimeout(resolve, 800)); // Simulate latency
     return getMockResponse<T>(endpoint, options);
  }

  const url = `${API_URL}${endpoint}`;
  
  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  try {
    // For GET requests, try to wake up backend first (helps with Render cold starts)
    if (!options.method || options.method === 'GET') {
      // Wake up backend in background (don't wait for it)
      wakeUpBackend().catch(() => {
        // Ignore errors - this is just a best-effort wake-up call
      });
    }
    
    const response = await fetchWithRetry<T>(url, {
        ...options,
        headers: {
        ...defaultHeaders,
        ...options.headers,
        },
        // Ensure CORS mode is set
        mode: 'cors',
        credentials: 'omit',
    });
    
    return response;
  } catch (err: unknown) {
      console.error("API request failed:", err);
      if (err instanceof ApiError) {
        throw err;
      }
      
      // Safely extract error properties for TypeScript
      const errorName = err instanceof Error ? err.name : 
                       (typeof err === 'object' && err !== null && 'name' in err) 
                         ? String((err as { name?: unknown }).name) 
                         : 'Unknown';
      let errorMessage = err instanceof Error 
        ? err.message 
        : (typeof err === 'object' && err !== null && 'message' in err)
          ? String((err as { message?: unknown }).message)
          : 'Network error contacting backend API.';
      const errorType = err instanceof Error ? err.constructor?.name : 'Unknown';
      
      // Log the full error for debugging
      console.error('=== API ERROR ===');
      console.error('URL:', url);
      console.error('Method:', options.method || 'GET');
      console.error('Error Type:', errorType);
      console.error('Error Name:', errorName);
      console.error('Error Message:', errorMessage);
      console.error('Full Error:', err);
      
      // Check if it's a CORS error (browser doesn't always expose this clearly)
      const errorStr = String(errorMessage || err || '');
      const isCorsError = errorStr.includes('CORS') || 
                         errorStr.includes('cors') ||
                         errorStr.includes('Access-Control');
      
      if (isCorsError) {
        console.error('CORS Error detected. Check backend CORS_ORIGINS configuration.');
        console.error('Current origin:', typeof window !== 'undefined' ? window.location.origin : 'unknown');
      }
      
      console.error('==================');
      
      // Provide more helpful messages for common network errors
      if (errorMessage.includes('Failed to fetch') || 
          errorMessage.includes('NetworkError') ||
          errorName === 'TypeError') {
        // Check if it might be a CORS issue
        if (isCorsError) {
          errorMessage = 'CORS error: Backend may not be configured to allow requests from this domain. Check CORS_ORIGINS in backend configuration.';
        } else {
          errorMessage = 'Unable to connect to backend server. Check your network connection and ensure the backend is running.';
        }
      }
      
      throw new ApiError(
        errorMessage,
        0,
        err
      );
  }
}

// --- MOCK DATA HANDLER ---

function getMockResponse<T>(endpoint: string, options: RequestInit): T {
    const method = options.method || 'GET';
    
    // Mock: Create Pool
    if (endpoint === '/api/pools/' && method === 'POST') {
        const body = JSON.parse(options.body as string);
        return {
            ...body,
            participant_count: 0,
            total_staked: 0,
            yield_earned: 0,
            status: 'pending',
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
        } as any;
    }

    // Mock: List Pools
    if (endpoint.startsWith('/api/pools') && method === 'GET') {
        return [
            {
                pool_id: 1,
                name: "No Sugar Protocol",
                goal_type: "lifestyle_habit",
                description: "30 days of zero added sugar. Natural fruit sugars allowed.",
                stake_amount: 0.5,
                duration_days: 30,
                participant_count: 142,
                max_participants: 200,
                status: "active",
                goal_metadata: {},
                charity_address: "Charity...",
                creator_wallet: "8x...92kL",
                pool_pubkey: "Pubkey...",
                total_staked: 71,
                yield_earned: 10.5,
                start_timestamp: Date.now() / 1000,
                end_timestamp: (Date.now() / 1000) + 86400 * 30,
                is_public: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                distribution_mode: 'competitive',
                split_percentage_winners: 100
            },
            {
                pool_id: 2,
                name: "06:00 AM Club",
                goal_type: "lifestyle_habit",
                description: "Morning check-ins before 06:15 AM. GPS & Timestamp verified.",
                stake_amount: 0.2,
                duration_days: 14,
                participant_count: 89,
                max_participants: 100,
                status: "active",
                goal_metadata: {},
                charity_address: "Charity...",
                creator_wallet: "8x...92kL",
                pool_pubkey: "Pubkey...",
                total_staked: 17.8,
                yield_earned: 1.2,
                start_timestamp: Date.now() / 1000,
                end_timestamp: (Date.now() / 1000) + 86400 * 14,
                is_public: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                distribution_mode: 'competitive',
                split_percentage_winners: 100
            },
            {
                pool_id: 3,
                name: "Shipping Daily",
                goal_type: "hodl_token", // Crypto
                description: "One commit to public repo every day. API verification.",
                stake_amount: 1.0,
                duration_days: 7,
                participant_count: 312,
                max_participants: 500,
                status: "active",
                goal_metadata: {},
                charity_address: "Charity...",
                creator_wallet: "8x...92kL",
                pool_pubkey: "Pubkey...",
                total_staked: 312,
                yield_earned: 68,
                start_timestamp: Date.now() / 1000,
                end_timestamp: (Date.now() / 1000) + 86400 * 7,
                is_public: true,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                distribution_mode: 'competitive',
                split_percentage_winners: 100
            }
        ] as any;
    }

    // Mock: Get Pool
    if (endpoint.match(/\/api\/pools\/\d+$/) && method === 'GET') {
        return {
            pool_id: 1,
            name: "No Sugar Protocol",
            goal_type: "lifestyle_habit",
            description: "30 days of zero added sugar. Natural fruit sugars allowed.",
            stake_amount: 0.5,
            duration_days: 30,
            participant_count: 142,
            max_participants: 200,
            status: "active",
            goal_metadata: {},
            charity_address: "Charity...",
            creator_wallet: "8x...92kL",
            pool_pubkey: "Pubkey...",
            total_staked: 71,
            yield_earned: 10.5,
            start_timestamp: Date.now() / 1000,
            end_timestamp: (Date.now() / 1000) + 86400 * 30,
            is_public: true,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            distribution_mode: 'competitive',
            split_percentage_winners: 100
        } as any;
    }

    // Mock: Get User Participations
    if (endpoint.includes('/participations')) {
        return [
            {
                pool_id: 1,
                name: "No Sugar Protocol",
                goal_type: "lifestyle_habit",
                description: "30 days of zero added sugar.",
                stake_amount: 0.5,
                duration_days: 30,
                status: "active",
                participant_status: "active",
                days_verified: 11,
                progress: 36,
                days_remaining: 19,
                start_timestamp: Date.now() / 1000,
                end_timestamp: (Date.now() / 1000) + 86400 * 30,
            }
        ] as any;
    }

    return {} as any;
}

// --- END MOCK DATA ---

/**
 * Get all pools
 */
export async function getPools(params?: {
  status?: string;
  limit?: number;
  offset?: number;
  wallet?: string;  // For filtering private pools
}): Promise<PoolResponse[]> {
  const queryParams = new URLSearchParams();
  if (params?.status) queryParams.append('status', params.status);
  if (params?.limit) queryParams.append('limit', params.limit.toString());
  if (params?.offset) queryParams.append('offset', params.offset.toString());
  if (params?.wallet) queryParams.append('wallet', params.wallet);
  
  const query = queryParams.toString();
  // Backend route is defined as "" (empty string) which maps to /api/pools (no trailing slash)
  // This avoids 307 redirects that cause fetch API issues
  return fetchApi<PoolResponse[]>(`/api/pools${query ? `?${query}` : ''}`);
}

/**
 * Get pool by ID
 */
export async function getPool(poolId: number): Promise<PoolResponse> {
  // No trailing slash needed for ID routes
  return fetchApi<PoolResponse>(`/api/pools/${poolId}`);
}

/**
 * Confirm pool creation after on-chain transaction
 */
export async function confirmPoolCreation(
  data: PoolConfirmRequest
): Promise<PoolResponse> {
  return fetchApi<PoolResponse>('/api/pools/create/confirm', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Confirm pool join after on-chain transaction
 */
export async function confirmPoolJoin(
  poolId: number,
  data: JoinPoolConfirmRequest
): Promise<PoolResponse> {
  return fetchApi<PoolResponse>(`/api/pools/${poolId}/join/confirm`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Forfeit pool participation (no transaction required)
 */
export async function forfeitPool(
  poolId: number,
  participantWallet: string
): Promise<PoolResponse> {
  return fetchApi<PoolResponse>(
    `/api/pools/${poolId}/forfeit?participant_wallet=${encodeURIComponent(participantWallet)}`,
    {
      method: 'POST',
    }
  );
}

/**
 * Create pool (legacy endpoint - may not be used)
 */
export async function createPool(data: PoolCreateRequest): Promise<PoolResponse> {
  return fetchApi<PoolResponse>('/api/pools/', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}


/**
 * Check-in models
 */
export interface CheckInCreate {
  pool_id: number;
  participant_wallet: string;
  day: number;
  success: boolean;
  screenshot_url?: string;
}

export interface CheckInResponse {
  id: number;
  pool_id: number;
  participant_wallet: string;
  day: number;
  success: boolean;
  screenshot_url?: string;
  timestamp: string;
}

/**
 * Submit a check-in for a lifestyle challenge
 */
export async function submitCheckIn(data: CheckInCreate): Promise<CheckInResponse> {
  return fetchApi<CheckInResponse>('/api/checkins', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Get all check-ins for a user in a pool
 */
export async function getUserCheckIns(
  poolId: number,
  wallet: string
): Promise<CheckInResponse[]> {
  return fetchApi<CheckInResponse[]>(`/api/checkins/${poolId}/${wallet}`);
}

/**
 * Get user's pool participations
 */
export interface UserParticipation {
  pool_id: number;
  pool_pubkey: string;
  name: string;
  description?: string;
  goal_type: string;
  goal_metadata: Record<string, any>;
  stake_amount: number;
  duration_days: number;
  status: string;
  participant_status: string;
  days_verified: number;
  progress?: number;
  days_remaining: number;
  joined_at?: string;
  start_timestamp: number;
  end_timestamp: number;
}

export async function getUserParticipations(
  wallet: string
): Promise<UserParticipation[]> {
  return fetchApi<UserParticipation[]>(`/api/users/${wallet}/participations`);
}

/**
 * Invite models
 */
export interface InviteCreate {
  pool_id: number;
  invitee_wallet: string;
}

export interface InviteResponse {
  id: number;
  pool_id: number;
  invitee_wallet: string;
  created_at: string;
}

/**
 * Create a pool invite
 */
export async function createPoolInvite(
  poolId: number,
  data: InviteCreate
): Promise<InviteResponse> {
  return fetchApi<InviteResponse>(`/api/pools/${poolId}/invites`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Check if wallet has invite to pool
 */
export async function checkPoolInvite(
  poolId: number,
  wallet: string
): Promise<{ has_invite: boolean; pool_id: number; invitee_wallet: string }> {
  return fetchApi<{ has_invite: boolean; pool_id: number; invitee_wallet: string }>(
    `/api/pools/${poolId}/invites/check?invitee_wallet=${wallet}`
  );
}

/**
 * Delete all pools (for testing/cleanup)
 * ⚠️ DANGER: This will delete ALL pools from the database!
 */
export async function deleteAllPools(): Promise<{ message: string; deleted_count: number; requested_count: number }> {
  return fetchApi<{ message: string; deleted_count: number; requested_count: number }>('/api/pools/', {
    method: 'DELETE',
  });
}

/**
 * GitHub verification models
 */
export interface GitHubVerifyRequest {
  wallet_address: string;
  github_username: string;
  gist_id: string;
  signature: string;
}

export interface GitHubVerifyResponse {
  verified: boolean;
  message: string;
  github_username?: string;
}

/**
 * Verify GitHub username ownership via Gist
 */
export async function verifyGitHub(data: GitHubVerifyRequest): Promise<GitHubVerifyResponse> {
  return fetchApi<GitHubVerifyResponse>('/api/users/verify-github', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

/**
 * Get verified GitHub username for a wallet
 */
export async function getGitHubUsername(wallet: string): Promise<{ verified_github_username: string | null }> {
  return fetchApi<{ verified_github_username: string | null }>(`/api/users/${wallet}/github`);
}

/**
 * Initiate GitHub OAuth flow
 */
export async function initiateGitHubOAuth(wallet: string): Promise<{ auth_url: string; state: string }> {
  return fetchApi<{ auth_url: string; state: string }>(
    `/api/users/github/oauth/initiate?wallet_address=${encodeURIComponent(wallet)}`
  );
}

/**
 * GitHub OAuth callback (handled by backend, but type defined here)
 */
export interface GitHubOAuthCallbackResponse {
  verified: boolean;
  message: string;
  github_username?: string;
}

/**
 * GitHub repository interface
 */
export interface GitHubRepo {
  full_name: string;
  name: string;
  owner: string;
  private: boolean;
  description: string | null;
  updated_at: string;
}

/**
 * Get user's GitHub repositories
 */
export async function getGitHubRepos(wallet: string): Promise<{ repositories: GitHubRepo[]; message?: string }> {
  return fetchApi<{ repositories: GitHubRepo[]; message?: string }>(`/api/users/${wallet}/github/repos`);
}

/**
 * Verification status interface
 */
export interface VerificationStatus {
  pool_id: number;
  wallet_address: string;
  days_verified: number;
  status: string;
  current_day: number | null;
  verifications: Array<{
    day: number;
    passed: boolean;
    verification_type: string;
    verified_at: string;
  }>;
  total_verifications: number;
  passed_verifications: number;
  next_window_end?: number | null;
}

/**
 * Get participant verification status
 */
export async function getParticipantVerifications(
  poolId: number,
  wallet: string
): Promise<VerificationStatus> {
  return fetchApi<VerificationStatus>(`/api/pools/${poolId}/participants/${wallet}/verifications`);
}

/**
 * AI challenge parsing models
 */
export interface ChallengeBlueprint {
  canonical_name: string;
  short_description: string;
  detailed_description?: string | null;
  challenge_type: string;
  goal_type: string;
  goal_metadata: Record<string, any>;
  suggested_stake_amount: number;
  suggested_duration_days: number;
  suggested_recruitment_hours: number;
  suggested_max_participants: number;
  suggested_min_participants: number;
  verification_summary?: string | null;
  tweet_hook?: string | null;
}

export async function parseChallengeDescription(
  description: string,
  challengeType: string
): Promise<ChallengeBlueprint> {
  return fetchApi<ChallengeBlueprint>('/api/ai/onchain/challenges/parse', {
    method: 'POST',
    body: JSON.stringify({
      description,
      challenge_type: challengeType,
    }),
  });
}

/**
 * Get aggregate pool stats (started / remaining participants)
 */
export async function getPoolStats(
  poolId: number
): Promise<{ pool_id: number; started: number; remaining: number }> {
  return fetchApi<{ pool_id: number; started: number; remaining: number }>(
    `/api/pools/${poolId}/stats`
  );
}

/**
 * Trigger immediate GitHub verification for a user
 */
export async function triggerGitHubVerification(
  poolId: number,
  wallet: string
): Promise<{ verified: boolean; message: string; day?: number }> {
  return fetchApi<{ verified: boolean; message: string; day?: number }>(
    `/api/pools/${poolId}/participants/${wallet}/verify-github`,
    {
      method: 'POST',
    }
  );
}

/**
 * Verify screen time challenge with screenshot upload
 */
export async function verifyScreenTime(
  poolId: number,
  wallet: string,
  file: File
): Promise<{ verified: boolean; message: string; day?: number; screen_time_hours?: number; reason?: string }> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(
    `${API_URL}/api/pools/${poolId}/participants/${wallet}/verify-screen-time`,
    {
      method: 'POST',
      body: formData,
    }
  );

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: 'Failed to verify screen time' }));
    throw new Error(error.detail || error.message || 'Failed to verify screen time');
  }

  return response.json();
}
