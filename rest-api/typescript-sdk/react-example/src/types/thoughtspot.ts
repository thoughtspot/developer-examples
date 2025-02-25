export interface UserDetails {
  name: string;
  email: string;
  userStatus: string;
}

export interface MetadataInfo {
  totalLiveboards: number;
  totalAnswers: number;
  recentItems: Array<{
    id: string;
    name: string;
    type: string;
    description?: string;
  }>;
} 