/**
 * Duck CLI - Hide & extract data in duck images.
 *
 * Usage:
 *   duck-cli encode <input-file> [options]
 *   duck-cli decode <duck-image.png> [options]
 */

import { cac } from "cac";
import { encodeAction } from "./encode";
import { decodeAction } from "./decode";
import restoreCursor from "restore-cursor";

const cli = cac("duck-cli");

// --- encode subcommand ---
cli
  .command("encode <input>", "Hide a file inside a duck image")
  .option("-p, --password <pwd>", "Password for encryption")
  .option("-t, --title <title>", "Title text on the duck image")
  .option("-c, --compress <level>", "Compression level: 2, 6, or 8", {
    default: 2,
  })
  .option("-o, --out <path>", "Output file path", {
    default: "duck_payload.png",
  })
  .example("  duck-cli encode secret.png")
  .example("  duck-cli encode secret.png -p mypass -c 6 -o duck.png")
  .example('  duck-cli encode data.txt -t "My Data"')
  .action(encodeAction);

// --- decode subcommand ---
cli
  .command("decode <input>", "Extract hidden data from a duck image")
  .option("-p, --password <pwd>", "Password for decryption (if encrypted)")
  .option("-o, --out <path>", "Output file path (auto-detected if not given)")
  .example("  duck-cli decode duck.png")
  .example("  duck-cli decode duck.png -p mypass")
  .example("  duck-cli decode duck.png -o recovered.png")
  .action(decodeAction);

cli.help();
cli.parse();

restoreCursor()