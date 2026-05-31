<div>
    <h1 align="center">Duck 🦆</h1>
    <p align="center">
        <em>
        LSB Steganography Tool — Hide and extract any file inside adorable duck images.
        </em>
    </p>
    <p align="center">
      <strong>English</strong> | <a href="./README_zh.md">中文</a>
    </p>
</div>

## Features

- **🔒 Encode** — Hide any file type inside a duck PNG image
- **🔓 Decode** — Extract hidden original files from duck images
- **🔐 Password Protection** — Optional XOR + SHA-256 encryption with a 16-byte random salt
- **📦 Multi-level Embedding** — 3 LSB embedding levels: 2-bit (high quality), 6-bit (balanced), 8-bit (maximum capacity)
- **📝 Custom Title** — Display custom text on the duck image (up to 30 characters)
- **🖼️ BinPNG Conversion** — Large files are automatically stored as PNG pixels, bypassing capacity limits
- **📎 Additional Payload** — Nest extra content (e.g., QR code data) within the hidden data
- **📂 Batch Decoding** — Decode multiple duck images at once
- **💻 CLI Tool** — Command-line interface for scripting and automation
- **🌐 Web Interface** — Browser-based GUI built with Vue 3

## Usage

Use the web version: https://duck.vince-g.xyz

## Preview

![preview1](.github/preview-1.png)

![preview2](.github/preview-2.png)

## License

[MIT License](./LICENSE.md) | Copyright (c) 2026-PRESENT Vincent-the-gamer
