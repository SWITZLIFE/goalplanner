import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { InsertUser, SelectUser } from "@db/schema";

interface AuthResponse {
  message: string;
  user: SelectUser;
}

// Only do the fetch, no state management here
async function fetchUser(): Promise<SelectUser | null> {
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

    return response.json();
  } catch (error) {
    console.error('Error fetching user:', error);
    return null;
  }
}

export function useUser() {
  const queryClient = useQueryClient();

  // Main user query - only fetch on mount
  const { data: user, isLoading } = useQuery({
    queryKey: ['user'],
    queryFn: fetchUser,
    gcTime: 0, // Don't cache between mounts
    staleTime: Infinity, // Never mark as stale
    retry: false,
    refetchOnMount: true,
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
      // Directly set the user data without invalidating
      queryClient.setQueryData(['user'], data.user);
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
      // Clear everything and redirect
      queryClient.clear();
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
      // Directly set the user data without invalidating
      queryClient.setQueryData(['user'], data.user);
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
