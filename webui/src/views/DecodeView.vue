<template>
    <div class="view">
        <div class="card">
            <h2 class="card-title">🔓 {{ $t("decode.title") }}</h2>
            <p class="card-desc">{{ $t("decode.desc") }}</p>

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
                    accept="image/*"
                    class="hidden-input"
                    @change="onFileSelect"
                />
                <template v-if="!file">
                    <div class="dz-icon">{{ dragging ? "📂" : "🖼️" }}</div>
                    <p class="dz-text">{{ $t("decode.dropzoneText") }}</p>
                    <p class="dz-sub">{{ $t("decode.dropzoneSub") }}</p>
                </template>
                <template v-else>
                    <img
                        v-if="previewUrl"
                        :src="previewUrl"
                        class="preview-thumb"
                        alt="Preview"
                    />
                    <div class="file-info">
                        <span class="file-name">{{ file.name }}</span>
                        <span class="file-size">{{ fmtSize(file.size) }}</span>
                    </div>
                </template>
            </div>

            <!-- Password -->
            <div v-if="file" class="pw-row">
                <input
                    v-model="password"
                    type="text"
                    :placeholder="$t('decode.passwordPlaceholder')"
                    class="input wide"
                />
            </div>

            <!-- Status -->
            <div v-if="loading" class="status info">
                🔍 {{ $t("decode.decoding") }}
            </div>
            <div v-if="error" class="status error">⚠️ {{ error }}</div>
            <div v-if="success" class="status success">
                ✅
                {{
                    $t("decode.extracted", {
                        ext: resultExt,
                        size: fmtSize(resultSize!),
                    })
                }}
            </div>

            <!-- Actions -->
            <div v-if="file" class="actions">
                <button
                    class="btn primary"
                    :disabled="loading"
                    @click="doDecode"
                >
                    🔓 {{ $t("decode.decodeBtn") }}
                </button>
                <button v-if="resultData" class="btn ghost" @click="download">
                    ⬇ {{ $t("decode.downloadBtn") }}
                </button>
                <button class="btn ghost" :disabled="loading" @click="reset">
                    {{ $t("decode.clearBtn") }}
                </button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref, onUnmounted } from "vue";
import { useI18n } from "vue-i18n";
import { decryptDuckImageFromBase64 } from "decoder";
import { getMimeTypeFromFileName } from "../utils/mimetype";
import { randomString } from "../utils/string";

const { t } = useI18n();

const inputRef = ref<HTMLInputElement>();
const file = ref<File | null>(null);
const password = ref("");
const loading = ref(false);
const error = ref("");
const success = ref(false);
const dragging = ref(false);
const previewUrl = ref("");
const resultData = ref<Uint8Array | null>(null);
const resultExt = ref("");
const resultSize = ref(0);

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
    resultData.value = null;
    if (previewUrl.value) URL.revokeObjectURL(previewUrl.value);
    previewUrl.value = URL.createObjectURL(f);
}

const fmtSize = (n: number) =>
    n < 1024
        ? `${n} B`
        : n < 1024 * 1024
          ? `${(n / 1024).toFixed(1)} KB`
          : `${(n / 1024 / 1024).toFixed(0)} MB`;

async function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error(t("common.readFailed")));
    });
}

async function doDecode() {
    if (!file.value) return;
    loading.value = true;
    error.value = "";
    success.value = false;
    try {
        const base64 = await fileToBase64(file.value);
        const fill = randomString();
        const res = await decryptDuckImageFromBase64(
            base64,
            { password: password.value },
            `image_${fill}.png`,
        );
        if (!res.success || !res.extractedData) {
            throw new Error(res.error ?? t("common.decodeFailed"));
        }
        resultData.value = res.extractedData;
        resultExt.value = res.extractedExt ?? ".bin";
        resultSize.value = res.extractedData.length;
        success.value = true;
    } catch (e: any) {
        error.value = e.message || t("common.decodeFailed");
    } finally {
        loading.value = false;
    }
}

function download() {
    if (!resultData.value) return;
    const ext = resultExt.value.startsWith(".")
        ? resultExt.value
        : `.${resultExt.value}`;
    const name = `duck_recovered${ext}`;
    const blob = new Blob([resultData.value], {
        type: getMimeTypeFromFileName(name),
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    URL.revokeObjectURL(url);
}

function reset() {
    file.value = null;
    password.value = "";
    error.value = "";
    success.value = false;
    resultData.value = null;
    if (previewUrl.value) URL.revokeObjectURL(previewUrl.value);
    previewUrl.value = "";
}

onUnmounted(() => {
    if (previewUrl.value) URL.revokeObjectURL(previewUrl.value);
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
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
}
.dropzone:hover,
.dropzone.dragover {
    border-color: var(--accent);
    background: var(--accent-bg);
}
.dropzone.has-file {
    padding: 12px;
    flex-direction: row;
    gap: 14px;
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
    font-weight: 500;
    margin: 0;
}
.dz-sub {
    font-size: 12px;
    color: var(--sub);
    margin: 0;
}
.preview-thumb {
    width: 56px;
    height: 56px;
    object-fit: cover;
    border-radius: 8px;
    border: 1px solid var(--border);
    flex-shrink: 0;
}
.file-info {
    display: flex;
    flex-direction: column;
    min-width: 0;
}
.file-name {
    font-weight: 600;
    color: var(--fg);
    font-size: 14px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
}
.file-size {
    color: var(--sub);
    font-size: 12px;
}

.pw-row {
    background: var(--input-bg);
    border-radius: 10px;
    padding: 12px 16px;
}
.input.wide {
    width: 100%;
    padding: 8px 12px;
    border: 1px solid var(--border);
    border-radius: 8px;
    background: var(--card);
    color: var(--fg);
    font-size: 14px;
    font-family: inherit;
    outline: none;
    box-sizing: border-box;
    transition: border-color 0.2s;
}
.input.wide:focus {
    border-color: var(--accent);
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
