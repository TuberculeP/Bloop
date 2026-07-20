<script setup lang="ts">
import cgu from "../../assets/data/cgu.json";
import LandingNotice from "../../components/landing/LandingNotice.vue";
</script>

<template>
  <LandingNotice :data="cgu" />
</template>
