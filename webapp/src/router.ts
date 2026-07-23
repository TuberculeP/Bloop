import { createRouter, createWebHistory } from "vue-router";

import LandingIndex from "./views/landing/LandingIndex.vue";
import ProjectSelectorView from "./views/app/ProjectSelectorView.vue";
import BloopApp from "./views/app/BloopApp.vue";
import LoginView from "./views/auth/LoginView.vue";
import RegisterView from "./views/auth/RegisterView.vue";
import ForgotPasswordView from "./views/auth/ForgotPasswordView.vue";
import ResetPasswordView from "./views/auth/ResetPasswordView.vue";

import { useAuthStore } from "./stores/authStore";
import apiClient from "./lib/utils/apiClient";
import type { User } from "./lib/utils/types";

async function authGuard(to: any, from: any, next: any) {
  const authStore = useAuthStore();
  const check = await apiClient.get<{ user: User }>("/auth/check");
  if (check.error) {
    next({ name: "app-login", query: { redirect: to.fullPath } });
    return;
  }
  if (check.data && check.data.user) {
    authStore.user = check.data.user;
    next();
  } else {
    next({ name: "app-login", query: { redirect: to.fullPath } });
  }
}

async function adminGuard(to: any, from: any, next: any) {
  const authStore = useAuthStore();
  const check = await apiClient.get<{ user: User }>("/auth/check");

  if (check.error || !check.data?.user) {
    next({ name: "app-login", query: { redirect: to.fullPath } });
    return;
  }

  authStore.user = check.data.user;

  if (check.data.user.role !== "ROLE_ADMIN") {
    next({ name: "landing-main" });
    return;
  }

  next();
}
import BlogApp from "./views/blog/BlogApp.vue";
import BlogSearchResults from "./views/blog/BlogSearchResults.vue";
import BlogPostDetail from "./views/blog/BlogPostDetail.vue";
import LearningApp from "./views/learning/LearningApp.vue";
import LearningArticleDetail from "./views/learning/LearningArticleDetail.vue";
import ProfileView from "./views/profile/ProfileView.vue";
import MessagesView from "./views/messages/MessagesView.vue";
import LandingCgu from "./views/landing/LandingCgu.vue";
import LandingCgv from "./views/landing/LandingCgv.vue";
import LandingAbout from "./views/landing/LandingAbout.vue";
import LandingSupport from "./views/landing/LandingSupport.vue";
import ButtonView from "./views/messages/ButtonView.vue";
import LandingContact from "./views/landing/LandingContact.vue";
import PublicProfileView from "./views/profile/PublicProfileView.vue";

const routes = [
  { path: "/", component: LandingIndex, name: "landing-main" },
  { path: "/cgu", component: LandingCgu, name: "landing-cgu" },
  { path: "/cgv", component: LandingCgv, name: "landing-cgv" },
  { path: "/about", component: LandingAbout, name: "landing-about" },
  { path: "/support", component: LandingSupport, name: "landing-support" },
  { path: "/contact", component: LandingContact, name: "landing-contact" },
  { path: "/app", component: ProjectSelectorView, name: "app-main" },
  { path: "/app/sequencer", component: BloopApp, name: "app-sequencer" },
  { path: "/login", component: LoginView, name: "app-login" },
  { path: "/register", component: RegisterView, name: "app-register" },
  {
    path: "/forgot-password",
    component: ForgotPasswordView,
    name: "app-forgot-password",
  },
  {
    path: "/reset-password",
    component: ResetPasswordView,
    name: "app-reset-password",
  },
  { path: "/blog", component: BlogApp, name: "app-blog" },
  {
    path: "/blog/search",
    component: BlogSearchResults,
    name: "blog-search-results",
  },
  {
    path: "/blog/post/:id",
    component: BlogPostDetail,
    name: "blog-post-detail",
  },
  { path: "/learning", component: LearningApp, name: "learning-list" },
  {
    path: "/learning/editor/new",
    component: () => import("./views/learning/LearningArticleEditor.vue"),
    name: "learning-new",
    meta: { requiresAdmin: true },
  },
  {
    path: "/learning/editor/:id",
    component: () => import("./views/learning/LearningArticleEditor.vue"),
    name: "learning-edit",
    meta: { requiresAdmin: true },
  },
  {
    path: "/learning/:slug",
    component: LearningArticleDetail,
    name: "learning-detail",
  },
  { path: "/profile", component: ProfileView, name: "profile" },
  { path: "/messages", component: MessagesView, name: "messages" },
  {
    path: "/public-profile/:slug",
    component: PublicProfileView,
    name: "public-profile",
  },
  // Admin routes
  {
    path: "/admin",
    component: () => import("./views/admin/AdminDashboard.vue"),
    name: "admin-dashboard",
    meta: { requiresAdmin: true },
  },
  {
    path: "/admin/users",
    component: () => import("./views/admin/AdminUsers.vue"),
    name: "admin-users",
    meta: { requiresAdmin: true },
  },
  {
    path: "/admin/samples",
    component: () => import("./views/admin/AdminSamples.vue"),
    name: "admin-samples",
    meta: { requiresAdmin: true },
  },
  {
    path: "/admin/samples/:packId",
    component: () => import("./views/admin/AdminPackDetail.vue"),
    name: "admin-pack-detail",
    meta: { requiresAdmin: true },
  },
  {
    path: "/admin/samples/:packId/:folderId",
    component: () => import("./views/admin/AdminFolderDetail.vue"),
    name: "admin-folder-detail",
    meta: { requiresAdmin: true },
  },
  {
    path: "/admin/projects",
    component: () => import("./views/admin/AdminProjects.vue"),
    name: "admin-projects",
    meta: { requiresAdmin: true },
  },
  {
    path: "/admin/buttons",
    component: ButtonView,
    name: "admin-buttons",
    meta: { requiresAdmin: true },
  },
  {
    path: "/403",
    name: "forbidden",
    component: () => import("./views/error/Forbidden.vue"),
  },
  {
    path: "/:pathMatch(.*)*",
    name: "not-found",
    component: () => import("./views/error/NotFound.vue"),
  },
];

const getGuardedRoutes = () => {
  const guardedMatches = [
    "app",
    "blog",
    "settings",
    "profile",
    "messages",
    "learning",
  ];
  return routes.map((route: any) => {
    if (route.meta?.requiresAdmin) {
      return {
        ...route,
        beforeEnter: adminGuard,
      };
    }
    if (guardedMatches.some((match) => route.path.includes(match))) {
      return {
        ...route,
        beforeEnter: authGuard,
      };
    }
    return route;
  });
};

export const router = createRouter({
  history: createWebHistory(),
  routes: getGuardedRoutes(),
});
