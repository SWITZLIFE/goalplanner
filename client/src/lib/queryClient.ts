import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      queryFn: async ({ queryKey }) => {
        const res = await fetch(queryKey[0] as string, {
          credentials: "include",
          headers: {
            'Accept': 'application/json',
            'Content-Type': 'application/json',
          },
        });

        if (!res.ok) {
          if (res.status === 401) {
            throw new Error("Unauthorized: Please log in to continue");
          }
          if (res.status >= 500) {
            throw new Error(`Server error: ${res.statusText}`);
          }
          const errorText = await res.text();
          throw new Error(errorText || res.statusText);
        }

        return res.json();
      },
      refetchInterval: false,
      refetchOnWindowFocus: false,
      staleTime: Infinity,
      retry: (failureCount, error) => {
        // Don't retry on 401 unauthorized
        if (error.message.includes("Unauthorized")) {
          return false;
        }
        return failureCount < 3;
      },
    },
    mutations: {
      retry: false,
    }
  },
});
