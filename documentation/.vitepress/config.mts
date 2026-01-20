import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitepress";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

interface SidebarItem {
    text: string;
    link?: string;
    items?: SidebarItem[];
    collapsed?: boolean;
}

function getPageTitle(filePath: string): string {
    // Try to extract title from markdown frontmatter or first heading
    const content = fs.readFileSync(filePath, "utf-8");

    // Check frontmatter for title
    const frontmatterMatch = content.match(/^---\s*\n[\s\S]*?title:\s*(.+)\n[\s\S]*?---/);
    if (frontmatterMatch) {
        return frontmatterMatch[1].trim().replace(/^["']|["']$/g, "");
    }


    // Check first h1 heading
    const headingMatch = content.match(/^#\s+(.+)$/m);
    if (headingMatch) {
        return headingMatch[1].trim();
    }

    // Fall back to filename
    return path.basename(filePath, ".md");
}

function scanDirectory(dir: string, urlPrefix: string): SidebarItem[] {
    if (!fs.existsSync(dir)) {
        return [];
    }

    const items: SidebarItem[] = [];
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    // Process markdown files (except index.md which is handled by parent)
    const mdFiles = entries
        .filter((e) => e.isFile() && e.name.endsWith(".md") && e.name !== "index.md")
        .sort((a, b) => a.name.localeCompare(b.name));

    for (const file of mdFiles) {
        const filePath = path.join(dir, file.name);
        const name = file.name.replace(".md", "");
        items.push({
            text: getPageTitle(filePath),
            link: `${urlPrefix}${name}`,
        });
    }

    // Process subdirectories
    const subDirs = entries.filter((e) => e.isDirectory()).sort((a, b) => a.name.localeCompare(b.name));

    for (const subDir of subDirs) {
        const subDirPath = path.join(dir, subDir.name);
        const indexPath = path.join(subDirPath, "index.md");
        const hasIndex = fs.existsSync(indexPath);
        const subItems = scanDirectory(subDirPath, `${urlPrefix}${subDir.name}/`);

        if (hasIndex || subItems.length > 0) {
            const item: SidebarItem = {
                text: hasIndex ? getPageTitle(indexPath) : subDir.name,
                collapsed: true,
            };

            if (hasIndex) {
                item.link = `${urlPrefix}${subDir.name}/`;
            }

            if (subItems.length > 0) {
                item.items = subItems;
            }

            items.push(item);
        }
    }

    return items;
}

function getModulesSidebar(): SidebarItem[] {
    const modulesDir = path.resolve(__dirname, "../modules");
    const modules = scanDirectory(modulesDir, "/modules/");

    return [
        {
            text: "Modules",
            items: modules,
        },
    ];
}

function getFrameworkSidebar(): SidebarItem[] {
    const frameworkDir = path.resolve(__dirname, "../framework");
    const framework = scanDirectory(frameworkDir, "/framework/");

    return [
        {
            text: "Framework",
            items: framework,
        },
    ];
}

function getDataInputSidebar(): SidebarItem[] {
    const dataInputDir = path.resolve(__dirname, "../datainput");
    const dataInput = scanDirectory(dataInputDir, "/datainput/");

    return [
        {
            text: "Data Input",
            items: dataInput,
        },
    ];
}

export default defineConfig({
    title: "FMU Analysis Documentation",
    description: "User documentation",
    base: "/docs/",
    head: [
        ['link', { rel: 'icon', href: '/docs/assets/icons/fmu_logo_dark_mode.svg' }],
        ['link', { href: 'https://cdn.eds.equinor.com/font/equinor-font.css', rel: 'stylesheet' }]
    ],
    themeConfig: {
        nav: [
            { text: "Home", link: "/" },
            { text: "Framework", link: "/framework/" },
            { text: "Data Input", link: "/datainput/" },
            { text: "Modules", link: "/modules/" },
        ],
        logo: { light: "/docs/assets/icons/fmu_logo_light_mode.svg", dark: "/docs/assets/icons/fmu_logo_dark_mode.svg" },
        sidebar: {
            "/framework/": getFrameworkSidebar(),
            "/datainput/": getDataInputSidebar(),
            "/modules/": getModulesSidebar(),
        },
        
        socialLinks: [{ icon: "github", link: "https://github.com/equinor/webviz" }],
    },
});
