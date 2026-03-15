<template>
    <div class="page">
        <div class="card">
            <!-- Header -->
            <div class="card-header">
                <span class="duck-icon">🦆</span>
                <div>
                    <h1 class="title">Duck Decoder</h1>
                    <p class="subtitle">解密隐写在图片中的数据</p>
                </div>
            </div>

            <p>
                <a
                    href="https://github.com/Vincent-the-gamer/duck"
                    target="_blank"
                    >GitHub</a
                >
            </p>

            <!-- Upload Zone -->
            <div
                class="upload-zone"
                :class="{
                    'drag-over': isDragging,
                    'has-file': !!imageData,
                    disabled: loading,
                }"
                @dragover.prevent="isDragging = true"
                @dragleave.prevent="isDragging = false"
                @drop.prevent="handleDrop"
                @click="!loading && fileInput?.click()"
            >
                <input
                    type="file"
                    accept="image/*"
                    @change="handleImageUpload"
                    :disabled="loading"
                    ref="fileInput"
                    class="file-input"
                />

                <template v-if="!imageData">
                    <div class="upload-icon">
                        {{ isDragging ? "📂" : "🖼️" }}
                    </div>
                    <p class="upload-hint">点击或拖拽图片到此处</p>
                    <p class="upload-sub">支持 PNG / JPG / WebP，最大 100MB</p>
                </template>

                <template v-else>
                    <img
                        :src="imageData.preview"
                        alt="预览"
                        class="preview-img"
                    />
                    <p class="replace-hint">点击或拖拽以替换图片</p>
                </template>
            </div>

            <!-- Status -->
            <div v-if="loading" class="status-bar loading-bar">
                <span class="spinner"></span> 处理中…
            </div>
            <div v-if="error" class="status-bar error-bar">
                <span>⚠️</span> {{ error }}
            </div>
            <div v-if="decodeSuccess" class="status-bar success-bar">
                <span>✅</span> 解密成功，文件已下载
            </div>

            <!-- File Info -->
            <div v-if="imageData" class="info-section">
                <div class="info-row">
                    <span class="info-label">文件名</span>
                    <span class="info-value">{{ imageData.name }}</span>
                </div>
                <div class="info-row">
                    <span class="info-label">大小</span>
                    <span class="info-value"
                        >{{ (imageData.size / 1024).toFixed(2) }} KB</span
                    >
                </div>
                <div class="info-row">
                    <span class="info-label">类型</span>
                    <span class="info-value"
                        ><code>{{ imageData.type }}</code></span
                    >
                </div>
            </div>

            <!-- Base64 -->
            <div v-if="imageData" class="base64-section">
                <div class="base64-header">
                    <span class="info-label">Base64 数据</span>
                    <button
                        class="copy-btn"
                        @click.stop="copyBase64"
                        :class="{ copied: isCopied }"
                    >
                        {{ isCopied ? "✓ 已复制" : "复制" }}
                    </button>
                </div>
                <textarea
                    readonly
                    :value="imageData.base64"
                    rows="3"
                    class="base64-textarea"
                ></textarea>
            </div>

            <!-- Actions -->
            <div v-if="imageData" class="actions">
                <button
                    class="btn btn-primary"
                    :disabled="loading"
                    @click="decodeDuck(imageData!.base64)"
                >
                    <span v-if="loading" class="spinner"></span>
                    <span>{{ loading ? "解密中…" : "🔓 解密鸭子图" }}</span>
                </button>
                <button
                    class="btn btn-ghost"
                    @click="clearImage"
                    :disabled="loading"
                >
                    清除
                </button>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref } from "vue";
import { decryptDuckImageFromBase64 } from "decoder";
import { getMimeTypeFromFileName } from "./utils/mimetype";
import { randomString } from "./utils/string";

interface ImageData {
    base64: string;
    preview: string;
    name: string;
    size: number;
    type: string;
}

const fileInput = ref<HTMLInputElement | null>(null);
const imageData = ref<ImageData | null>(null);
const loading = ref(false);
const error = ref("");
const isDragging = ref(false);
const isCopied = ref(false);
const decodeSuccess = ref(false);

const handleImageUpload = async (event: Event) => {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    await loadFile(file);
};

const handleDrop = async (event: DragEvent) => {
    isDragging.value = false;
    const file = event.dataTransfer?.files?.[0];
    if (!file) return;
    await loadFile(file);
};

const loadFile = async (file: File) => {
    loading.value = true;
    error.value = "";
    decodeSuccess.value = false;
    try {
        validateImage(file);
        const base64 = await fileToBase64(file);
        if (imageData.value?.preview)
            URL.revokeObjectURL(imageData.value.preview);
        imageData.value = {
            base64,
            preview: URL.createObjectURL(file),
            name: file.name,
            size: file.size,
            type: file.type,
        };
    } catch (err) {
        error.value = err instanceof Error ? err.message : "上传失败";
    } finally {
        loading.value = false;
        if (fileInput.value) fileInput.value.value = "";
    }
};

const validateImage = (file: File) => {
    if (!file.type.startsWith("image/")) throw new Error("请上传图片文件");
    if (file.size > 100 * 1024 * 1024)
        throw new Error("图片大小不能超过 100MB");
};

const fileToBase64 = (file: File): Promise<string> =>
    new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = () => reject(new Error("读取失败"));
    });

const copyBase64 = async () => {
    if (!imageData.value) return;
    try {
        await navigator.clipboard.writeText(imageData.value.base64);
        isCopied.value = true;
        setTimeout(() => (isCopied.value = false), 2000);
    } catch {}
};

async function decodeDuck(base64: string) {
    loading.value = true;
    error.value = "";
    decodeSuccess.value = false;
    try {
        const fillStr = randomString();
        const result = await decryptDuckImageFromBase64(
            base64,
            { password: "" },
            `image_${fillStr}.png`,
        );
        if (!result.success || !result.extractedData) {
            throw new Error(result.error ?? "解密失败");
        }
        const blob = new Blob([result.extractedData], {
            type: getMimeTypeFromFileName(result.fileName),
        });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = result.fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        decodeSuccess.value = true;
    } catch (err) {
        error.value = err instanceof Error ? err.message : "解密失败";
    } finally {
        loading.value = false;
    }
}

const clearImage = () => {
    if (imageData.value?.preview) URL.revokeObjectURL(imageData.value.preview);
    imageData.value = null;
    error.value = "";
    decodeSuccess.value = false;
};
</script>

<style scoped>
a {
    color: var(--accent);
    text-decoration: none;
    &:hover {
        color: deeppink;
    }
}

.page {
    min-height: 100svh;
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 32px 16px;
    box-sizing: border-box;
}

.card {
    width: 100%;
    max-width: 520px;
    background: var(--bg);
    border: 1px solid var(--border);
    border-radius: 20px;
    box-shadow: var(--shadow);
    padding: 36px 32px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    gap: 20px;
}

/* Header */
.card-header {
    display: flex;
    align-items: center;
    gap: 14px;
}
.duck-icon {
    font-size: 40px;
    line-height: 1;
    flex-shrink: 0;
}
.title {
    font-size: 22px;
    font-weight: 600;
    color: var(--text-h);
    margin: 0;
    letter-spacing: -0.4px;
}
.subtitle {
    font-size: 13px;
    color: var(--text);
    margin: 2px 0 0;
}

/* Upload Zone */
.upload-zone {
    position: relative;
    border: 2px dashed var(--border);
    border-radius: 14px;
    padding: 36px 20px;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 8px;
    cursor: pointer;
    transition:
        border-color 0.2s,
        background 0.2s,
        transform 0.15s;
    min-height: 160px;
    overflow: hidden;
}
.upload-zone:hover:not(.disabled) {
    border-color: var(--accent);
    background: var(--accent-bg);
}
.upload-zone.drag-over {
    border-color: var(--accent);
    background: var(--accent-bg);
    transform: scale(1.01);
}
.upload-zone.has-file {
    padding: 16px;
    min-height: 120px;
}
.upload-zone.disabled {
    cursor: not-allowed;
    opacity: 0.6;
}
.file-input {
    display: none;
}
.upload-icon {
    font-size: 36px;
    line-height: 1;
    transition: transform 0.2s;
}
.upload-zone:hover .upload-icon {
    transform: scale(1.12);
}
.upload-hint {
    font-size: 15px;
    font-weight: 500;
    color: var(--text-h);
    margin: 0;
}
.upload-sub {
    font-size: 12px;
    color: var(--text);
    margin: 0;
}

/* Preview */
.preview-img {
    width: 88px;
    height: 88px;
    object-fit: cover;
    border-radius: 10px;
    border: 1px solid var(--border);
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.12);
}
.replace-hint {
    font-size: 12px;
    color: var(--text);
    margin: 0;
}

/* Status Bars */
.status-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 10px 14px;
    border-radius: 10px;
    font-size: 14px;
    font-weight: 500;
}
.loading-bar {
    background: var(--accent-bg);
    color: var(--accent);
    border: 1px solid var(--accent-border);
}
.error-bar {
    background: rgba(239, 68, 68, 0.1);
    color: #ef4444;
    border: 1px solid rgba(239, 68, 68, 0.3);
}
.success-bar {
    background: rgba(34, 197, 94, 0.1);
    color: #16a34a;
    border: 1px solid rgba(34, 197, 94, 0.3);
}

/* Info Section */
.info-section {
    display: flex;
    flex-direction: column;
    border: 1px solid var(--border);
    border-radius: 12px;
    overflow: hidden;
}
.info-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 10px 14px;
    font-size: 14px;
    border-bottom: 1px solid var(--border);
}
.info-row:last-child {
    border-bottom: none;
}
.info-label {
    color: var(--text);
    font-size: 13px;
    flex-shrink: 0;
    margin-right: 12px;
}
.info-value {
    color: var(--text-h);
    font-weight: 500;
    text-align: right;
    word-break: break-all;
}
.info-value code {
    font-size: 12px;
    padding: 2px 6px;
}

/* Base64 */
.base64-section {
    display: flex;
    flex-direction: column;
    gap: 8px;
}
.base64-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
}
.base64-textarea {
    width: 100%;
    box-sizing: border-box;
    background: var(--code-bg);
    border: 1px solid var(--border);
    border-radius: 10px;
    padding: 10px 12px;
    font-family: var(--mono);
    font-size: 11px;
    color: var(--text);
    resize: vertical;
    line-height: 1.6;
    outline: none;
    transition: border-color 0.2s;
}
.base64-textarea:focus {
    border-color: var(--accent-border);
}

/* Buttons */
.copy-btn {
    font-size: 12px;
    padding: 4px 10px;
    border-radius: 6px;
    border: 1px solid var(--border);
    background: transparent;
    color: var(--text);
    cursor: pointer;
    transition: all 0.2s;
    font-family: var(--sans);
}
.copy-btn:hover {
    border-color: var(--accent-border);
    color: var(--accent);
}
.copy-btn.copied {
    border-color: rgba(34, 197, 94, 0.4);
    color: #16a34a;
    background: rgba(34, 197, 94, 0.08);
}

.actions {
    display: flex;
    gap: 10px;
}
.btn {
    flex: 1;
    padding: 12px 20px;
    border-radius: 12px;
    font-size: 15px;
    font-weight: 500;
    cursor: pointer;
    border: none;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 8px;
    transition: all 0.2s;
    font-family: var(--sans);
}
.btn:disabled {
    opacity: 0.55;
    cursor: not-allowed;
}
.btn-primary {
    background: var(--accent);
    color: #fff;
    box-shadow: 0 2px 12px rgba(170, 59, 255, 0.3);
}
.btn-primary:hover:not(:disabled) {
    filter: brightness(1.1);
    box-shadow: 0 4px 18px rgba(170, 59, 255, 0.45);
    transform: translateY(-1px);
}
.btn-primary:active:not(:disabled) {
    transform: translateY(0);
}
.btn-ghost {
    flex: 0 0 auto;
    background: transparent;
    color: var(--text);
    border: 1px solid var(--border);
    padding: 12px 18px;
}
.btn-ghost:hover:not(:disabled) {
    border-color: var(--accent-border);
    color: var(--accent);
    background: var(--accent-bg);
}

/* Spinner */
.spinner {
    display: inline-block;
    width: 14px;
    height: 14px;
    border: 2px solid currentColor;
    border-top-color: transparent;
    border-radius: 50%;
    animation: spin 0.7s linear infinite;
    flex-shrink: 0;
}
@keyframes spin {
    to {
        transform: rotate(360deg);
    }
}

/* Responsive */
@media (max-width: 560px) {
    .card {
        padding: 24px 18px;
        border-radius: 16px;
    }
    .title {
        font-size: 20px;
    }
}
</style>
