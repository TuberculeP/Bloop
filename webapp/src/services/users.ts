import apiClient from "../lib/utils/apiClient";
import type { User } from "../lib/utils/types";

export const updateUserProfile = async (
  payload: Partial<User>,
): Promise<User> => {
  const { data, error } = await apiClient.patch<{ user: User }>(
    "/user",
    payload,
  );
  if (!data || error) {
    console.error("Error updating user profile:", error);
    throw new Error("Failed to update user profile");
  } else {
    return data.user;
  }
};
