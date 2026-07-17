// services/learning.ts
import apiClient from "../lib/utils/apiClient";
import type {
  LearningArticle,
  CreateLearningArticleData,
} from "../lib/utils/types";

export interface GetArticlesParams {
  q?: string;
  sort?: "recent" | "votes";
}

export const getAllArticles = async (
  params?: GetArticlesParams,
): Promise<LearningArticle[]> => {
  const { data, error } = await apiClient.get<{ body: LearningArticle[] }>(
    "/learning",
    params,
  );
  if (!data || error) {
    console.error("Error fetching learning articles:", error);
    return [];
  } else {
    return data.body;
  }
};

export const getMyArticles = async (): Promise<LearningArticle[]> => {
  const { data, error } = await apiClient.get<{ body: LearningArticle[] }>(
    "/learning/mine",
  );
  if (!data || error) {
    console.error("Error fetching my learning articles:", error);
    return [];
  } else {
    return data.body;
  }
};

export const getArticleBySlugOrId = async (
  idOrSlug: string,
): Promise<LearningArticle> => {
  const { data, error } = await apiClient.get<{ body: LearningArticle }>(
    `/learning/${idOrSlug}`,
  );
  if (!data || error) {
    console.error("Error fetching learning article:", error);
    throw new Error("Article not found");
  } else {
    return data.body;
  }
};

export const createArticle = async (
  payload: CreateLearningArticleData,
): Promise<LearningArticle> => {
  const { data, error } = await apiClient.post<{ body: LearningArticle }>(
    "/learning",
    payload,
  );
  if (!data || error) {
    console.error("Error creating learning article:", error);
    throw new Error("Failed to create article");
  } else {
    return data.body;
  }
};

export const updateArticle = async (
  id: string,
  payload: Partial<CreateLearningArticleData>,
): Promise<LearningArticle> => {
  const { data, error } = await apiClient.patch<{ body: LearningArticle }>(
    `/learning/${id}`,
    payload,
  );
  if (!data || error) {
    console.error("Error updating learning article:", error);
    throw new Error("Failed to update article");
  } else {
    return data.body;
  }
};

export const deleteArticle = async (id: string): Promise<void> => {
  await apiClient.delete(`/learning/${id}`);
};

export const uploadLearningImage = async (file: File): Promise<string> => {
  const formData = new FormData();
  formData.append("file", file);

  const { data, error } = await apiClient.post<{
    body: { url: string; key: string; filename: string };
  }>("/learning/upload-image", formData);

  if (!data || error) {
    console.error("Error uploading learning image:", error);
    throw new Error("Failed to upload image");
  }

  return data.body.url;
};

export const voteArticle = async (
  id: string,
  value: 1 | -1,
): Promise<{ score: number; myVote: number }> => {
  const { data, error } = await apiClient.post<{
    body: { score: number; myVote: number };
  }>(`/learning/${id}/vote`, { value });

  if (!data || error) {
    console.error("Error voting on learning article:", error);
    throw new Error("Failed to vote");
  }

  return data.body;
};
