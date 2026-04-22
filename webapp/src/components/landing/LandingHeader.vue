<template>
  <header
    class="main-header"
    :class="{ scrolled: isScrolled, 'menu-open': isMobileMenuOpen }"
  >
    <div class="header-container">
      <!-- Logo avec animation -->
      <router-link to="/" class="logo-wrapper">
        <div class="logo-glow"></div>
        <img
          src="../../assets/logo/logo_background_yellow.svg"
          alt="BLOOP"
          class="logo"
        />
      </router-link>

      <!-- Navigation principale -->
      <nav class="main-nav" :class="{ open: isMobileMenuOpen }">
        <ul class="nav-links">
          <li
            v-for="(link, index) in navLinks"
            :key="link.name"
            :style="{ '--delay': index * 0.1 + 's' }"
          >
            <a :href="link.href" class="nav-link" @click="closeMobileMenu">
              <span class="nav-text">{{ link.name }}</span>
              <span class="nav-underline"></span>
            </a>
          </li>
        </ul>

        <!-- Auth section -->
        <div class="auth-section">
          <!-- Si connecté -->
          <div v-if="isAuthenticated" class="profile-wrapper">
            <button @click.stop="toggleProfileMenu" class="profile-btn">
              <span class="avatar-ring">
                <span class="avatar">{{ userInitials }}</span>
              </span>
              <span class="profile-name">{{
                user?.firstName || "Profil"
              }}</span>
              <svg
                class="dropdown-icon"
                :class="{ rotated: showProfileMenu }"
                width="12"
                height="12"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                stroke-width="2"
              >
                <polyline points="6 9 12 15 18 9"></polyline>
              </svg>
            </button>

            <Transition name="dropdown">
              <div v-if="showProfileMenu" class="profile-dropdown">
                <div class="dropdown-backdrop"></div>
                <div class="dropdown-content">
                  <router-link
                    to="/profile"
                    @click="closeProfileMenu"
                    class="dropdown-item"
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <path
                        d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"
                      ></path>
                      <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                    <span>Mon Profil</span>
                  </router-link>
                  <router-link
                    v-if="isAdmin"
                    to="/admin"
                    @click="closeProfileMenu"
                    class="dropdown-item admin"
                  >
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <circle cx="12" cy="12" r="3"></circle>
                      <path
                        d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"
                      ></path>
                    </svg>
                    <span>Admin</span>
                  </router-link>
                  <button @click="handleLogout" class="dropdown-item logout">
                    <svg
                      width="18"
                      height="18"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      stroke-width="2"
                    >
                      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path>
                      <polyline points="16 17 21 12 16 7"></polyline>
                      <line x1="21" y1="12" x2="9" y2="12"></line>
                    </svg>
                    <span>Déconnexion</span>
                  </button>
                </div>
              </div>
            </Transition>
          </div>

          <!-- Si non connecté -->
          <div v-else class="auth-buttons">
            <router-link to="/login" class="btn-login">
              <span>Connexion</span>
            </router-link>
            <router-link to="/register" class="btn-register">
              <span class="btn-text">Inscription</span>
              <span class="btn-shine"></span>
            </router-link>
          </div>
        </div>
      </nav>

      <!-- Mobile menu toggle -->
      <button
        class="mobile-toggle"
        @click="toggleMobileMenu"
        :class="{ active: isMobileMenuOpen }"
      >
        <span class="toggle-line"></span>
        <span class="toggle-line"></span>
        <span class="toggle-line"></span>
      </button>
    </div>

    <!-- Progress bar -->
    <div class="scroll-progress">
      <div class="progress-bar" :style="{ width: scrollProgress + '%' }"></div>
    </div>
  </header>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import { useAuthStore } from "../../stores/authStore";
import apiClient from "../../lib/utils/apiClient";
import gsap from "gsap";

const router = useRouter();
const authStore = useAuthStore();

// Navigation links
const navLinks = [
  { name: "Produit", href: "#features" },
  { name: "Galerie", href: "#gallery" },
  { name: "Blog", href: "/blog" },
  { name: "À propos", href: "#about" },
  { name: "Support", href: "#support" },
];

// State
const isScrolled = ref(false);
const scrollProgress = ref(0);
const showProfileMenu = ref(false);
const isMobileMenuOpen = ref(false);

// Auth state
const isAuthenticated = computed(() => authStore.isAuthenticated);
const user = computed(() => authStore.user);
const isAdmin = computed(() => user.value?.role === "ROLE_ADMIN");

const userInitials = computed(() => {
  if (!user.value) return "?";
  const firstName = user.value.firstName || "";
  const lastName = user.value.lastName || "";
  return (firstName.charAt(0) + lastName.charAt(0)).toUpperCase();
});

// Menu handlers
const toggleProfileMenu = () => {
  showProfileMenu.value = !showProfileMenu.value;
};

const closeProfileMenu = () => {
  showProfileMenu.value = false;
};

const toggleMobileMenu = () => {
  isMobileMenuOpen.value = !isMobileMenuOpen.value;
  document.body.style.overflow = isMobileMenuOpen.value ? "hidden" : "";
};

const closeMobileMenu = () => {
  isMobileMenuOpen.value = false;
  document.body.style.overflow = "";
};

// Click outside handler
const handleClickOutside = (event: MouseEvent) => {
  const target = event.target as HTMLElement;
  if (!target.closest(".profile-wrapper")) {
    showProfileMenu.value = false;
  }
};

// Logout handler
const handleLogout = async () => {
  try {
    await apiClient.post("/auth/logout");
    authStore.user = undefined;
    closeProfileMenu();
    await router.push("/");
  } catch (error) {
    console.error("Erreur lors de la déconnexion:", error);
  }
};

// Check auth
const checkAuth = async () => {
  try {
    const response = await apiClient.get<{ user: any }>("/auth/check");
    if (response.data?.user) {
      authStore.user = response.data.user;
    }
  } catch {
    authStore.user = undefined;
  }
};

// Scroll handler
const handleScroll = () => {
  const scrollTop = window.scrollY;
  const docHeight = document.documentElement.scrollHeight - window.innerHeight;

  isScrolled.value = scrollTop > 50;
  scrollProgress.value = docHeight > 0 ? (scrollTop / docHeight) * 100 : 0;
};

onMounted(() => {
  checkAuth();
  window.addEventListener("scroll", handleScroll, { passive: true });
  document.addEventListener("click", handleClickOutside);
  handleScroll();

  // GSAP entrance animations
  gsap.from(".logo-wrapper", {
    opacity: 0,
    x: -30,
    duration: 0.8,
    ease: "power3.out",
  });

  gsap.from(".auth-section", {
    opacity: 0,
    x: 30,
    duration: 0.8,
    ease: "power3.out",
  });
});

onUnmounted(() => {
  window.removeEventListener("scroll", handleScroll);
  document.removeEventListener("click", handleClickOutside);
  document.body.style.overflow = "";
});
</script>

<style scoped>
.main-header {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  z-index: 1000;
  padding: 1.5rem 0;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
}

.main-header::before {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(
    180deg,
    rgb(6, 11, 23, 0.2) 0%,
    rgba(6, 11, 23, 0) 100%
  );
  opacity: 1;
  transition: opacity 0.4s ease;
  pointer-events: none;
}

.main-header.scrolled {
  padding: 0.75rem 0;
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
}

.main-header.scrolled::before {
  background: rgba(6, 11, 23, 0.85);
  opacity: 1;
}

.header-container {
  position: relative;
  margin: 0 auto;
  padding: 0 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

/* Logo */
.logo-wrapper {
  position: relative;
  display: flex;
  align-items: center;
  z-index: 10;
}

.logo-glow {
  position: absolute;
  width: 60px;
  height: 60px;
  background: radial-gradient(
    circle,
    rgba(255, 210, 105, 0.4) 0%,
    transparent 70%
  );
  border-radius: 50%;
  filter: blur(10px);
  opacity: 0;
  transition: opacity 0.3s ease;
}

.logo-wrapper:hover .logo-glow {
  opacity: 1;
  animation: pulse-glow 2s ease-in-out infinite;
}

@keyframes pulse-glow {
  0%,
  100% {
    transform: scale(1);
    opacity: 0.4;
  }
  50% {
    transform: scale(1.2);
    opacity: 0.7;
  }
}

.logo {
  width: 100px;
  height: auto;
  transition: transform 0.3s ease;
}

.logo-wrapper:hover .logo {
  transform: scale(1.05);
}

/* Navigation */
.main-nav {
  display: flex;
  align-items: center;
  gap: 3rem;
}

.nav-links {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  list-style: none;
  margin: 0;
  padding: 0;
}

.nav-links li {
  animation: fadeInDown 0.6s ease forwards;
  animation-delay: var(--delay);
  opacity: 0;
}

@keyframes fadeInDown {
  from {
    opacity: 0;
    transform: translateY(-10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

.nav-link {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.75rem 1rem;
  color: var(--color-white);
  text-decoration: none;
  font-weight: 500;
  font-size: 0.95rem;
  transition: color 0.3s ease;
}

.nav-text {
  position: relative;
  z-index: 1;
}

.nav-underline {
  position: absolute;
  bottom: 0.5rem;
  left: 50%;
  transform: translateX(-50%) scaleX(0);
  width: 30px;
  height: 2px;
  background: linear-gradient(
    90deg,
    transparent,
    var(--color-accent),
    transparent
  );
  border-radius: 2px;
  transition: transform 0.3s ease;
}

.nav-link:hover {
  color: var(--color-accent);
}

.nav-link:hover .nav-underline {
  transform: translateX(-50%) scaleX(1);
}

/* Auth section */
.auth-section {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.auth-buttons {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.btn-login {
  position: relative;
  padding: 0.6rem 1.25rem;
  color: var(--color-white);
  text-decoration: none;
  font-weight: 500;
  font-size: 0.9rem;
  border: 1px solid rgba(255, 255, 255, 0.2);
  border-radius: 8px;
  transition: all 0.3s ease;
  overflow: hidden;
}

.btn-login::before {
  content: "";
  position: absolute;
  inset: 0;
  background: linear-gradient(
    135deg,
    rgba(255, 255, 255, 0.1) 0%,
    transparent 50%
  );
  opacity: 0;
  transition: opacity 0.3s ease;
}

.btn-login:hover {
  border-color: rgba(255, 210, 105, 0.5);
  color: var(--color-accent);
}

.btn-login:hover::before {
  opacity: 1;
}

.btn-register {
  position: relative;
  padding: 0.6rem 1.5rem;
  background: linear-gradient(
    135deg,
    var(--color-accent) 0%,
    var(--color-accent2) 100%
  );
  color: var(--color-black);
  text-decoration: none;
  font-weight: 600;
  font-size: 0.9rem;
  border-radius: 8px;
  overflow: hidden;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(255, 210, 105, 0.3);
}

.btn-text {
  position: relative;
  z-index: 1;
}

.btn-shine {
  position: absolute;
  top: 0;
  left: -100%;
  width: 100%;
  height: 100%;
  background: linear-gradient(
    90deg,
    transparent,
    rgba(255, 255, 255, 0.4),
    transparent
  );
  transition: left 0.5s ease;
}

.btn-register:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 25px rgba(255, 210, 105, 0.4);
}

.btn-register:hover .btn-shine {
  left: 100%;
}

/* Profile menu */
.profile-wrapper {
  position: relative;
}

.profile-btn {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.5rem 1rem;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 50px;
  color: var(--color-white);
  cursor: pointer;
  transition: all 0.3s ease;
  margin: 0 !important;
}

.profile-btn:hover {
  background: rgba(255, 255, 255, 0.1);
  border-color: rgba(255, 210, 105, 0.3);
}

.avatar-ring {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar-ring::before {
  content: "";
  position: absolute;
  inset: -2px;
  background: linear-gradient(
    135deg,
    var(--color-accent),
    var(--color-secondary)
  );
  border-radius: 50%;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.profile-btn:hover .avatar-ring::before {
  opacity: 1;
}

.avatar {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  background: linear-gradient(
    135deg,
    var(--color-accent) 0%,
    var(--color-accent-hover) 100%
  );
  border-radius: 50%;
  font-weight: 600;
  font-size: 0.85rem;
  color: var(--color-black);
}

.profile-name {
  font-weight: 500;
  font-size: 0.9rem;
}

.dropdown-icon {
  transition: transform 0.3s ease;
}

.dropdown-icon.rotated {
  transform: rotate(180deg);
}

/* Profile dropdown */
.profile-dropdown {
  position: absolute;
  top: calc(100% + 0.75rem);
  right: 0;
  min-width: 200px;
  z-index: 100;
}

.dropdown-backdrop {
  position: absolute;
  inset: 0;
  background: rgba(6, 11, 23, 0.95);
  backdrop-filter: blur(20px);
  -webkit-backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 12px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);
}

.dropdown-content {
  position: relative;
  padding: 0.5rem;
}

.dropdown-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  width: 100%;
  padding: 0.75rem 1rem;
  background: transparent;
  border: none;
  color: var(--color-white);
  text-decoration: none;
  font-size: 0.9rem;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.dropdown-item:hover {
  background: rgba(255, 255, 255, 0.1);
  color: var(--color-accent);
}

.dropdown-item.logout:hover {
  background: rgba(238, 53, 53, 0.1);
  color: var(--color-error);
}

.dropdown-item.admin {
  color: #ff3fb4;
}

.dropdown-item.admin:hover {
  background: rgba(255, 63, 180, 0.1);
}

/* Dropdown animation */
.dropdown-enter-active,
.dropdown-leave-active {
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
}

.dropdown-enter-from,
.dropdown-leave-to {
  opacity: 0;
  transform: translateY(-10px) scale(0.95);
}

/* Mobile toggle */
.mobile-toggle {
  display: none;
  flex-direction: column;
  justify-content: center;
  gap: 5px;
  width: 40px;
  height: 40px;
  background: transparent;
  border: none;
  cursor: pointer;
  z-index: 100;
}

.toggle-line {
  width: 24px;
  height: 2px;
  background: var(--color-white);
  border-radius: 2px;
  transition: all 0.3s ease;
}

.mobile-toggle.active .toggle-line:nth-child(1) {
  transform: translateY(7px) rotate(45deg);
}

.mobile-toggle.active .toggle-line:nth-child(2) {
  opacity: 0;
  transform: scaleX(0);
}

.mobile-toggle.active .toggle-line:nth-child(3) {
  transform: translateY(-7px) rotate(-45deg);
}

/* Scroll progress */
.scroll-progress {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background: rgba(255, 255, 255, 0.1);
}

.progress-bar {
  height: 100%;
  background: linear-gradient(
    90deg,
    var(--color-accent),
    var(--color-secondary)
  );
  transition: width 0.1s linear;
}

/* Responsive */
@media (max-width: 1024px) {
  .nav-links {
    gap: 0.25rem;
  }

  .nav-link {
    padding: 0.5rem 0.75rem;
    font-size: 0.9rem;
  }
}

@media (max-width: 768px) {
  .header-container {
    padding: 0 1.5rem;
  }

  .mobile-toggle {
    display: flex;
  }

  .main-nav {
    position: fixed;
    top: 0;
    right: -100%;
    width: 100%;
    height: 100vh;
    background: linear-gradient(
      180deg,
      rgba(6, 11, 23, 0.98) 0%,
      rgba(4, 13, 26, 0.98) 100%
    );
    backdrop-filter: blur(20px);
    flex-direction: column;
    justify-content: center;
    gap: 3rem;
    transition: right 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  }

  .main-nav.open {
    right: 0;
  }

  .nav-links {
    flex-direction: column;
    gap: 1rem;
    margin: 20px 0;
  }

  .nav-link {
    font-size: 1.5rem;
    padding: 1rem;
  }

  .auth-section {
    flex-direction: column;
    gap: 1rem;
  }

  .auth-buttons {
    flex-direction: column;
    gap: 1rem;
  }

  .btn-login,
  .btn-register {
    padding: 1rem 2rem;
    font-size: 1rem;
  }

  .profile-name {
    display: block;
  }
}

@media (max-width: 480px) {
  .header-container {
    padding: 0 1rem;
  }

  .logo {
    width: 80px;
  }
}

@media screen and (min-width: 975px) {
  header ul.active {
    transform: none;
  }
}
</style>
