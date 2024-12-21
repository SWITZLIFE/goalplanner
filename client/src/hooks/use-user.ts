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
    headers: body ? { "Content-Type": "application/json" } : undefined,
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
  const response = await fetch('/api/user', {
    credentials: 'include'
  });

  if (!response.ok) {
    if (response.status === 401) {
      return null;
    }
    throw new Error(await response.text());
  }

  return response.json();
}

export function useUser() {
  const queryClient = useQueryClient();

  const { data: user, error, isLoading } = useQuery<SelectUser | null, Error>({
    queryKey: ['user'],
    queryFn: fetchUser,
    staleTime: Infinity,
    retry: false,
    refetchOnWindowFocus: false,
    refetchOnMount: false
  });

  const loginMutation = useMutation<AuthResponse, Error, InsertUser>({
    mutationFn: (userData) => handleAuthRequest('/api/login', 'POST', userData),
    onSuccess: (data) => {
      queryClient.setQueryData(['user'], data.user);
    },
  });

  const logoutMutation = useMutation<void, Error>({
    mutationFn: async () => {
      await handleAuthRequest('/api/logout', 'POST');
      // Clear all queries and reset state
      queryClient.clear();
      window.location.href = '/';
    }
  });

  const registerMutation = useMutation<AuthResponse, Error, InsertUser>({
    mutationFn: (userData) => handleAuthRequest('/api/register', 'POST', userData),
    onSuccess: (data) => {
      queryClient.setQueryData(['user'], data.user);
    },
  });

  return {
    user,
    isLoading,
    error,
    login: loginMutation.mutateAsync,
    logout: logoutMutation.mutateAsync,
    register: registerMutation.mutateAsync,
  };
}
