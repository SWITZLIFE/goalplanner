import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { InsertUser, SelectUser } from "@db/schema";

interface AuthResponse {
  message: string;
  user: SelectUser;
}

// Cache key for user data
const USER_QUERY_KEY = ['user'] as const;

export function useUser() {
  const queryClient = useQueryClient();

  // Main user query - with proper caching
  const { data: user, isLoading } = useQuery({
    queryKey: USER_QUERY_KEY,
    queryFn: async () => {
      try {
        const response = await fetch('/api/user', {
          credentials: 'include'
        });

        if (response.status === 401) {
          return null;
        }

        if (!response.ok) {
          throw new Error(await response.text());
        }

        return response.json() as Promise<SelectUser>;
      } catch (error) {
        console.error('Error fetching user:', error);
        return null;
      }
    },
    // Prevent unnecessary refetching
    staleTime: Infinity,
    cacheTime: Infinity,
    retry: false,
    refetchOnMount: false,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });

  // Handle login
  const loginMutation = useMutation({
    mutationFn: async (credentials: InsertUser) => {
      const response = await fetch('/api/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json() as Promise<AuthResponse>;
    },
    onSuccess: (data) => {
      // Set the user data in cache without triggering a refetch
      queryClient.setQueryData(USER_QUERY_KEY, data.user);
    },
  });

  // Handle logout
  const logoutMutation = useMutation({
    mutationFn: async () => {
      const response = await fetch('/api/logout', {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }
    },
    onSuccess: () => {
      // Clear user data and reset cache
      queryClient.setQueryData(USER_QUERY_KEY, null);
      queryClient.clear();
      // Redirect to home page
      window.location.href = '/';
    },
  });

  // Handle registration
  const registerMutation = useMutation({
    mutationFn: async (userData: InsertUser) => {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(userData),
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error(await response.text());
      }

      return response.json() as Promise<AuthResponse>;
    },
    onSuccess: (data) => {
      // Set the user data in cache without triggering a refetch
      queryClient.setQueryData(USER_QUERY_KEY, data.user);
    },
  });

  return {
    user,
    isLoading,
    isAuthenticated: !!user,
    login: loginMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    register: registerMutation.mutateAsync,
  };
}
