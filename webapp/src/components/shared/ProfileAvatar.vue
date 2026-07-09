<script setup lang="ts">
import { computed } from "vue";
import type { User } from "../../lib/utils/types";

interface Props {
  user?: Partial<User> | null;
  size?: "small" | "medium" | "large";
}

const props = withDefaults(defineProps<Props>(), {
  user: null,
  size: "medium",
});

const initials = computed(() => {
  const first = props.user?.firstName?.charAt(0) || "";
  const last = props.user?.lastName?.charAt(0) || "";
  return `${first}${last}`.toUpperCase();
});

const altText = computed(
  () =>
    [props.user?.firstName, props.user?.lastName].filter(Boolean).join(" ") ||
    "Photo de profil",
);
</script>

<template>
  <div class="profile-avatar" :class="`profile-avatar--${size}`">
    <img
      v-if="user?.profilePicture"
      :src="user.profilePicture"
      :alt="altText"
      class="avatar-image"
    />
    <span v-else class="avatar-initials">{{ initials }}</span>
  </div>
</template>

<style scoped>
.profile-avatar {
  border-radius: 50%;
  background: var(--color-accent3);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  color: var(--color-white);
  overflow: hidden;
  flex-shrink: 0;
  box-shadow: 0 4px 15px rgba(122, 15, 62, 0.4);
}

.avatar-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.profile-avatar--small {
  width: 40px;
  height: 40px;
  font-size: 0.9rem;
}

.profile-avatar--medium {
  width: 72px;
  height: 72px;
  font-size: 1.5rem;
}

.profile-avatar--large {
  width: 80px;
  height: 80px;
  font-size: 2rem;
}
</style>
