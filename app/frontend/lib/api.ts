/**
 * API client for backend communication
 * Centralized fetch wrapper with error handling
 */

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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
}

export interface JoinPoolConfirmRequest {
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

async function fetchApi<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_URL}${endpoint}`;
  
  const defaultHeaders: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  const response = await fetch(url, {
    ...options,
    headers: {
      ...defaultHeaders,
      ...options.headers,
    },
  });
  
  if (!response.ok) {
    let errorData;
    try {
      errorData = await response.json();
    } catch {
      errorData = { detail: response.statusText };
    }
    
    throw new ApiError(
      errorData.detail || errorData.error || 'API request failed',
      response.status,
      errorData
    );
  }
  
  // Handle empty responses
  const contentType = response.headers.get('content-type');
  if (!contentType || !contentType.includes('application/json')) {
    return {} as T;
  }
  
  return response.json();
}

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
  return fetchApi<PoolResponse[]>(`/api/pools${query ? `?${query}` : ''}`);
}

/**
 * Get pool by ID
 */
export async function getPool(poolId: number): Promise<PoolResponse> {
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
  progress: number;
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

