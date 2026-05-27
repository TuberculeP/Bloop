import js from "@eslint/js";
import globals from "globals";
import tseslint from "typescript-eslint";
import pluginVue from "eslint-plugin-vue";
import vueParser from "vue-eslint-parser";
import eslintPluginPrettierRecommended from "eslint-plugin-prettier/recommended";
import eslintPluginUnusedImports from "eslint-plugin-unused-imports";

const sharedConfig = {
  plugins: {
    "@typescript-eslint": tseslint.plugin,
    "unused-imports": eslintPluginUnusedImports,
  },
  rules: {
    "no-console": "off",
    "no-unused-vars": "off",
    "unused-imports/no-unused-imports": "warn",
    "unused-imports/no-unused-vars": [
      "warn",
      {
        vars: "all",
        varsIgnorePattern: "^_",
        args: "after-used",
        argsIgnorePattern: "^_",
      },
    ],
    "prettier/prettier": [
      "error",
      {
        endOfLine: "auto",
      },
    ],
  },
};

const serverConfig = {
  files: ["server/**/*.{js,ts}"],
  languageOptions: {
    ecmaVersion: 2021,
    sourceType: "module",
    globals: globals.node,
    parser: tseslint.parser, // Ajout du parser TypeScript
  },
  plugins: {
    js,
  },
  rules: {
    ...js.configs.recommended.rules,
    ...tseslint.configs.recommended.rules,
    "no-console": "off",
    "no-undef": "off", // Désactivé car géré par TypeScript
  },
};

const webappConfig = {
  files: ["webapp/**/*.{js,ts,vue}"],
  languageOptions: {
    ecmaVersion: 2021,
    sourceType: "module",
    globals: globals.browser,
    parser: vueParser, // Utilisation correcte du parser Vue.js
    parserOptions: {
      parser: tseslint.parser, // TypeScript pour les blocs <script lang="ts">
    },
  },
  plugins: {
    js,
    vue: pluginVue,
  },
  rules: {
    ...js.configs.recommended.rules,
    ...tseslint.configs.recommended.rules,
    ...pluginVue.configs["flat/essential"].rules,
    "vue/no-unused-vars": "warn",
    "vue/no-console": ["warn", { allow: ["warn", "error"] }],
    "no-console": "warn",
    "no-undef": "off", // Désactivé car géré par TypeScript
  },
};

export default [
  {
    ignores: [
      "**/node_modules/**",
      "**/dist/**",
      "**/build/**",
      "**/.nuxt/**",
      "**/.output/**",
      ".git/**",
      "coverage/**",
      "*.min.js",
    ],
  },
  serverConfig,
  webappConfig,
  sharedConfig,
  eslintPluginPrettierRecommended,
];
