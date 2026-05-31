<template>
    <div class="app-shell">
        <header class="app-header">
            <div class="logo" @click="$router.push('/')">
                <span class="logo-icon">🦆</span>
                <span class="logo-text">Duck</span>
            </div>
            <nav class="nav-tabs">
                <router-link to="/encode" class="tab" active-class="active">
                    <span class="tab-icon">🔒</span> {{ $t("app.tabEncode") }}
                </router-link>
                <router-link to="/decode" class="tab" active-class="active">
                    <span class="tab-icon">🔓</span> {{ $t("app.tabDecode") }}
                </router-link>
            </nav>
            <div class="header-actions">
                <button
                    class="lang-btn"
                    @click="toggleLang"
                    :title="nextLangLabel"
                >
                    {{ currentLang === "en" ? "中" : "EN" }}
                </button>
                <a
                    class="gh-link"
                    href="https://github.com/Vincent-the-gamer/duck"
                    target="_blank"
                    title="GitHub"
                >
                    <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="currentColor"
                    >
                        <path
                            d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"
                        />
                    </svg>
                </a>
            </div>
        </header>

        <main class="app-main">
            <router-view />
        </main>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted } from "vue";
import { useRouter } from "vue-router";
import { useI18n } from "vue-i18n";
import { saveLocale } from "./i18n";

const router = useRouter();

onMounted(() => {
    document.title =
        locale.value === "zh"
            ? "Duck — 隐藏与提取数据"
            : "Duck — Hide & Extract Data";
});
const { locale } = useI18n();

const currentLang = computed(() => locale.value);

const nextLangLabel = computed(() =>
    locale.value === "en" ? "Switch to 中文" : "切换到 English",
);

function toggleLang() {
    const next = locale.value === "en" ? "zh" : "en";
    locale.value = next;
    saveLocale(next);
    document.title =
        next === "en" ? "Duck — Hide & Extract Data" : "Duck — 隐藏与提取数据";
}

// Redirect / to /encode
if (router.currentRoute.value.path === "/") {
    router.replace("/encode");
}
</script>

<style scoped>
.app-shell {
    min-height: 100svh;
    display: flex;
    flex-direction: column;
    background: var(--bg);
}

.app-header {
    display: flex;
    align-items: center;
    gap: 24px;
    padding: 0 24px;
    height: 56px;
    border-bottom: 1px solid var(--border);
    background: var(--card);
    position: sticky;
    top: 0;
    z-index: 10;
    backdrop-filter: blur(12px);
}

.logo {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
    user-select: none;
    flex-shrink: 0;
}
.logo-icon {
    font-size: 24px;
}
.logo-text {
    font-size: 18px;
    font-weight: 700;
    color: var(--fg);
}

.nav-tabs {
    display: flex;
    gap: 4px;
    flex: 1;
}

.tab {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 6px 16px;
    border-radius: 8px;
    font-size: 14px;
    font-weight: 500;
    color: var(--sub);
    text-decoration: none;
    transition: all 0.2s;
}
.tab:hover {
    color: var(--fg);
    background: var(--input-bg);
}
.tab.active {
    color: var(--accent);
    background: var(--accent-bg);
}
.tab-icon {
    font-size: 14px;
}

.header-actions {
    display: flex;
    align-items: center;
    gap: 12px;
    flex-shrink: 0;
}

.lang-btn {
    width: 36px;
    height: 32px;
    border: 1px solid var(--border);
    border-radius: 6px;
    background: transparent;
    color: var(--sub);
    font-size: 12px;
    font-weight: 600;
    font-family: inherit;
    cursor: pointer;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0;
}
.lang-btn:hover {
    color: var(--accent);
    border-color: var(--accent);
}

.gh-link {
    color: var(--sub);
    transition: color 0.2s;
    display: flex;
    align-items: center;
}
.gh-link:hover {
    color: var(--fg);
}

.app-main {
    flex: 1;
    display: flex;
}
</style>
