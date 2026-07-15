<script setup lang="ts">
import cgv from "../../assets/data/cgv.json";
import LandingNotice from "../../components/landing/LandingNotice.vue";
</script>

<template>
  <LandingNotice :data="cgv" />
</template>
