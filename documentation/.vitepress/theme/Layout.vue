<script setup lang="ts">
import DefaultTheme from "vitepress/theme";
import EmbedLayout from "./EmbedLayout.vue";
import { computed } from "vue";
import { inBrowser } from "vitepress";

const isEmbed = computed(() => {
    if (!inBrowser) return false;
    const params = new URLSearchParams(window.location.search);
    return params.has("embed");
});
</script>

<template>
    <EmbedLayout v-if="isEmbed" />
    <DefaultTheme.Layout v-else />
</template>
