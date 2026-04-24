<template>
  <div class="login-container">
    <div class="form-container">
      <LoginForm :redirect-path="redirect" @success="handleSuccess" />
    </div>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";
import LoginForm from "../../components/auth/LoginForm.vue";

const router = useRouter();
const redirect = router.currentRoute.value.query.redirect as string;

function handleSuccess() {
  router.push({ name: redirect ?? "landing-main" });
}
</script>

<style scoped>
.login-container {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 80vh;
  padding: 20px;
}

.form-container {
  max-width: 400px;
  width: 100%;
}

@media (max-width: 480px) {
  .form-container {
    padding: 24px;
    margin: 16px;
  }

  .login-container {
    min-height: 70vh;
  }
}
</style>
