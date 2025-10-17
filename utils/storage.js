import fs from "fs";

export function getConfig() {
  return JSON.parse(fs.readFileSync("./config.json"));
}

export function saveConfig(config) {
  fs.writeFileSync("./config.json", JSON.stringify(config, null, 2));
}
