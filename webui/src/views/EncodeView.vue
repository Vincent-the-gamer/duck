<template>
    <div class="view">
        <div class="card">
            <h2 class="card-title">🦆 {{ $t("encode.title") }}</h2>
            <p class="card-desc">{{ $t("encode.desc") }}</p>

            <!-- Upload zone -->
            <div
                class="dropzone"
                :class="{ dragover: dragging, 'has-file': file }"
                @dragover.prevent="dragging = true"
                @dragleave.prevent="dragging = false"
                @drop.prevent="onDrop"
                @click="triggerInput"
            >
                <input
                    ref="inputRef"
                    type="file"
                    class="hidden-input"
                    @change="onFileSelect"
                />
                <template v-if="!file">
                    <div class="dz-icon">{{ dragging ? "📂" : "📁" }}</div>
                    <p class="dz-text">{{ $t("encode.dropzoneText") }}</p>
                    <p class="dz-sub">{{ $t("encode.dropzoneSub") }}</p>
                </template>
                <template v-else>
                    <div class="file-info">
                        <span class="file-name">{{ file.name }}</span>
                        <span class="file-size">{{ fmtSize(file.size) }}</span>
                    </div>
                </template>
            </div>

            <!-- Options -->
            <div v-if="file" class="options">
                <label class="opt">
                    <span>{{ $t("encode.password") }}</span>
                    <input
                        v-model="password"
                        type="text"
                        :placeholder="$t('encode.passwordPlaceholder')"
                        class="input"
                    />
                </label>
                <label class="opt">
                    <span>{{ $t("encode.titleLabel") }}</span>
                    <input
                        v-model="title"
                        type="text"
                        :placeholder="$t('encode.titlePlaceholder')"
                        maxlength="30"
                        class="input"
                    />
                </label>
                <label class="opt">
                    <span>{{ $t("encode.quality") }}</span>
                    <select v-model.number="compress" class="input select">
                        <option :value="2">
                            {{ $t("encode.qualityHigh") }}
                        </option>
                        <option :value="6">
                            {{ $t("encode.qualityBalanced") }}
                        </option>
                        <option :value="8">
                            {{ $t("encode.qualityMax") }}
                        </option>
                    </select>
                </label>
            </div>

            <!-- Status -->
            <div v-if="loading" class="status info">
                🔄 {{ $t("encode.encoding") }}
            </div>
            <div v-if="error" class="status error">⚠️ {{ error }}</div>
            <div v-if="success" class="status success">
                ✅ {{ $t("encode.done") }}
            </div>

            <!-- Preview -->
            <div v-if="resultUrl" class="preview-box">
                <img :src="resultUrl" alt="Duck preview" class="preview-img" />
            </div>

            <!-- Actions -->
            <div v-if="file" class="actions">
                <button
                    class="btn primary"
                    :disabled="loading"
                    @click="doEncode"
                >
                    🦆 {{ $t("encode.encodeBtn") }}
                </button>
                <button v-if="resultUrl" class="btn ghost" @click="download">
                    ⬇ {{ $t("encode.downloadBtn") }}
                </button>
                <button class="btn ghost" :disabled="loading" @click="reset">
                    {{ $t("encode.clearBtn") }}
                </button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from "vue";
import { useI18n } from "vue-i18n";
import { encodeDuckBlob } from "../utils/encoder";

const { t } = useI18n();

const inputRef = ref<HTMLInputElement>();
const file = ref<File | null>(null);
const password = ref("");
const title = ref("");
const compress = ref(2);
const loading = ref(false);
const error = ref("");
const success = ref(false);
const dragging = ref(false);
const resultUrl = ref("");
let resultBlob: Blob | null = null;

function triggerInput() {
    if (!loading.value) inputRef.value?.click();
}

function onFileSelect(e: Event) {
    const f = (e.target as HTMLInputElement).files?.[0];
    if (f) setFile(f);
}

function onDrop(e: DragEvent) {
    dragging.value = false;
    const f = e.dataTransfer?.files?.[0];
    if (f) setFile(f);
}

function setFile(f: File) {
    file.value = f;
    error.value = "";
    success.value = false;
    if (resultUrl.value) URL.revokeObjectURL(resultUrl.value);
    resultUrl.value = "";
    resultBlob = null;
}

const fmtSize = (n: number) =>
    n < 1024
        ? `${n} B`
        : n < 1024 * 1024
          ? `${(n / 1024).toFixed(1)} KB`
          : `${(n / 1024 / 1024).toFixed(0)} MB`;

async function doEncode() {
    if (!file.value) return;
    loading.value = true;
    error.value = "";
    success.value = false;
    try {
        const buf = await file.value.arrayBuffer();
        const ext = file.value.name.split(".").pop() || "bin";
        resultBlob = await encodeDuckBlob(new Uint8Array(buf), ext, {
            password: password.value,
            title: title.value,
            compress: compress.value,
        });
        if (resultUrl.value) URL.revokeObjectURL(resultUrl.value);
        resultUrl.value = URL.createObjectURL(resultBlob);
        success.value = true;
    } catch (e: any) {
        error.value = e.message || t("common.encodeFailed");
    } finally {
        loading.value = false;
    }
}

function download() {
    if (!resultBlob || !file.value) return;
    const url = URL.createObjectURL(resultBlob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `duck_${file.value.name.replace(/\.[^.]+$/, "")}.png`;
    a.click();
    URL.revokeObjectURL(url);
}

function reset() {
    file.value = null;
    password.value = "";
    title.value = "";
    compress.value = 2;
    error.value = "";
    success.value = false;
    if (resultUrl.value) URL.revokeObjectURL(resultUrl.value);
    resultUrl.value = "";
    resultBlob = null;
}

onUnmounted(() => {
    if (resultUrl.value) URL.revokeObjectURL(resultUrl.value);
});
</script>

<style scoped>
.view {
    flex: 1;
    display: flex;
    justify-content: center;
    padding: 24px 16px;
}
.card {
    width: 100%;
    max-width: 480px;
    background: var(--card);
    border: 1px solid var(--border);
    border-radius: 16px;
    padding: 32px;
    display: flex;
    flex-direction: column;
    gap: 18px;
}
.card-title {
    font-size: 24px;
    font-weight: 700;
    color: var(--fg);
    margin: 0;
}
.card-desc {
    font-size: 14px;
    color: var(--sub);
    margin: -12px 0 0;
}

.dropzone {
    border: 2px dashed var(--border);
    border-radius: 12px;
    padding: 36px;
    text-align: center;
    cursor: pointer;
    transition: all 0.2s;
}
.dropzone:hover,
.dropzone.dragover {
    border-color: var(--accent);
    background: var(--accent-bg);
}
.dropzone.has-file {
    padding: 16px 20px;
}
.hidden-input {
    display: none;
}
.dz-icon {
    font-size: 36px;
}
.dz-text {
    font-size: 15px;
    color: var(--fg);
    margin: 8px 0 0;
    font-weight: 500;
}
.dz-sub {
    font-size: 12px;
    color: var(--sub);
    margin: 4px 0 0;
}
.file-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
}
.file-name {
    font-weight: 600;
    color: var(--fg);
    font-size: 14px;
    overflow: hidden;
    text-overflow: ellipsis;
}
.file-size {
    color: var(--sub);
    font-size: 12px;
    flex-shrink: 0;
    margin-left: 12px;
}

.options {
    display: flex;
    flex-direction: column;
    gap: 12px;
    background: var(--input-bg);
    border-radius: 10px;
    padding: 16px;
}
.opt {
    display: flex;
    align-items: center;
    gap: 12px;
    font-size: 14px;
    color: var(--fg);
}
.opt span {
    width: 72px;
    flex-shrink: 0;
    font-weight: 500;
}
.input {
    flex: 1;
    padding: 8px 12px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--card);
    color: var(--fg);
    font-size: 14px;
    font-family: inherit;
    outline: none;
    transition: border-color 0.2s;
}
.input:focus {
    border-color: var(--accent);
}
.select {
    cursor: pointer;
}

.status {
    padding: 10px 14px;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 500;
}
.status.info {
    background: var(--accent-bg);
    color: var(--accent);
}
.status.error {
    background: #fef2f2;
    color: #dc2626;
}
.status.success {
    background: #f0fdf4;
    color: #16a34a;
}

.preview-box {
    border-radius: 12px;
    overflow: hidden;
    border: 1px solid var(--border);
}
.preview-img {
    width: 100%;
    display: block;
}

.actions {
    display: flex;
    gap: 10px;
}
.btn {
    flex: 1;
    padding: 11px 16px;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 600;
    cursor: pointer;
    border: none;
    font-family: inherit;
    transition: all 0.2s;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
}
.btn:disabled {
    opacity: 0.45;
    cursor: not-allowed;
}
.btn.primary {
    background: var(--accent);
    color: #fff;
}
.btn.primary:hover:not(:disabled) {
    filter: brightness(1.08);
}
.btn.ghost {
    background: transparent;
    border: 1px solid var(--border);
    color: var(--fg);
    flex: 0 0 auto;
}
.btn.ghost:hover:not(:disabled) {
    border-color: var(--accent);
    color: var(--accent);
}
</style>
