import { useDynamicContext } from "@dynamic-labs/sdk-react-core";

export function useAuthToken() {
  const { authToken } = useDynamicContext();

  if (!authToken) {
    throw new Error("No auth token found");
  }

  return authToken;
}
