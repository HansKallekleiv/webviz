<script setup lang="ts">
import { Content, useData } from "vitepress";
import { onMounted, watch, nextTick } from "vue";

const { frontmatter, title, site } = useData();

// Get page title without site suffix (e.g., "MyModule" instead of "MyModule | Webviz Documentation")
function getPageTitle(): string {
    const fullTitle = title.value;
    const siteTitle = site.value.title;
    const suffix = ` | ${siteTitle}`;
    if (fullTitle.endsWith(suffix)) {
        return fullTitle.slice(0, -suffix.length);
    }
    return fullTitle;
}

onMounted(async () => {
    const params = new URLSearchParams(window.location.search);
    const theme = params.get("theme") || "light";

    // Set VitePress dark mode class
    if (theme === "dark") {
        document.documentElement.classList.add("dark");
    } else {
        document.documentElement.classList.remove("dark");
    }

    // Wait for next tick to ensure title is populated
    await nextTick();
    sendPageInfo();
});

// Watch for route changes and send updated info
watch(
    title,
    () => {
        sendPageInfo();
    },
    { immediate: true }
);

function sendPageInfo() {
    if (window.parent && window.parent !== window) {
        window.parent.postMessage(
            {
                type: "webviz-docs-loaded",
                title: getPageTitle(),
                path: window.location.pathname,
            },
            "*"
        );
    }
}
</script>

<template>
    <div class="embed-layout vp-doc">
        <Content />
    </div>
</template>

<style>
.embed-layout {
    max-width: 800px;
    margin: 0 auto;
    padding: 24px;
}
</style>
