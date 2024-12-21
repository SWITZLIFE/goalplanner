import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { InsertUser, SelectUser } from "@db/schema";

interface AuthResponse {
  message: string;
  user: SelectUser;
}

async function handleAuthRequest(
  url: string,
  method: string,
  body?: InsertUser
): Promise<AuthResponse> {
  const response = await fetch(url, {
    method,
    headers: {
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    credentials: "include",
  });

  if (!response.ok) {
    const message = await response.text();
    throw new Error(message);
  }

  return response.json();
}

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

  const { data: user, isLoading } = useQuery<SelectUser | null>({
    queryKey: ['user'],
    queryFn: fetchUser,
    staleTime: 300000, // 5 minutes
    cacheTime: 300000, // 5 minutes
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: true,
    refetchInterval: false
  });

  const loginMutation = useMutation({
    mutationFn: async (userData: InsertUser) => {
      const response = await handleAuthRequest('/api/login', 'POST', userData);
      return response;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['user'], data.user);
      // Prevent immediate refetch
      queryClient.invalidateQueries({ queryKey: ['user'], refetchType: 'none' });
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await handleAuthRequest('/api/logout', 'POST');
      queryClient.setQueryData(['user'], null);
      queryClient.clear();
    },
    onSuccess: () => {
      window.location.href = '/';
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (userData: InsertUser) => {
      const response = await handleAuthRequest('/api/register', 'POST', userData);
      return response;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(['user'], data.user);
      // Prevent immediate refetch
      queryClient.invalidateQueries({ queryKey: ['user'], refetchType: 'none' });
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
