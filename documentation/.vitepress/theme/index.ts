import DefaultTheme from "vitepress/theme";
import "vitepress/dist/client/theme-default/styles/vars.css";
import "vitepress/dist/client/theme-default/styles/base.css";
import "vitepress/dist/client/theme-default/styles/utils.css";
import "vitepress/dist/client/theme-default/styles/components/vp-doc.css";
import Layout from "./Layout.vue";
import type { Theme } from "vitepress";
import "./custom.css";

export default {
    extends: DefaultTheme,
    Layout,
} satisfies Theme;
