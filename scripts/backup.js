import { DATA_VERSION, DEFAULT_PRESET_ID, MODULE_ID, SETTINGS, warn } from "./constants.js";
import { fieldKey, getFieldIndex } from "./fields.js";
import { cleanValue, countOverrides, emptyPreset, getData, setData } from "./presets.js";

/**
 * Export file, same shape as the settings exports of Nik's Foundry Tweaks and Nik's DnD5e Tweaks (format 2):
 * {
 *   format: 2,
 *   title: "Nik's Scene Defaults Export",
 *   exportedAt: "2026-11-07T12:00:00.000Z",
 *   exportedBy: "Gamemaster",
 *   modules: { "niks-scene-defaults": { version: "14.1.0", settings: { enabled, applyToImports, presets } } }
 * }
 * `settings` holds the world settings by key, so the Tweaks dashboard can import this file too (and vice versa,
 * if a Tweaks export ever contains this module).
 */
export const EXPORT_FORMAT = 2;

/** World settings included in an export. */
const EXPORTED_SETTINGS = [SETTINGS.enabled, SETTINGS.applyToImports, SETTINGS.presets];

/** @returns {object} The export payload of the current world. */
export function exportData() {
  const settings = {};
  for ( const key of EXPORTED_SETTINGS ) {
    settings[key] = key === SETTINGS.presets ? getData() : game.settings.get(MODULE_ID, key);
  }
  return {
    format: EXPORT_FORMAT,
    title: "Nik's Scene Defaults Export",
    exportedAt: new Date().toISOString(),
    exportedBy: game.user.name,
    modules: {
      [MODULE_ID]: { version: game.modules.get(MODULE_ID)?.version ?? "", settings }
    }
  };
}

/** Download the export as a JSON file. */
export function exportToFile() {
  const filename = `${MODULE_ID}-${new Date().toISOString().slice(0, 10)}.json`;
  foundry.utils.saveDataToFile(JSON.stringify(exportData(), null, 2), "application/json", filename);
  ui.notifications.info("NSD.Notifications.Exported", { localize: true, format: { filename } });
}

/**
 * Read and check an export payload.
 * @param {object} payload  Parsed export file.
 * @returns {{settings: object, count: number, skipped: string[]}}  Cleaned settings, ready to store.
 * @throws {Error} With a localized message when the file can't be used.
 */
export function readExport(payload) {
  const settings = (payload?.format === EXPORT_FORMAT) ? payload.modules?.[MODULE_ID]?.settings : null;
  if ( !settings || (typeof settings !== "object") ) throw new Error(game.i18n.localize("NSD.Import.NotAnExport"));

  const result = { settings: {}, count: 0, skipped: [] };
  for ( const key of [SETTINGS.enabled, SETTINGS.applyToImports] ) {
    if ( typeof settings[key] === "boolean" ) result.settings[key] = settings[key];
  }

  const data = settings[SETTINGS.presets];
  if ( data !== undefined ) {
    if ( !data || (typeof data !== "object") || !Array.isArray(data.presets) ) {
      throw new Error(game.i18n.localize("NSD.Import.NotAnExport"));
    }
    if ( Number(data.version) > DATA_VERSION ) throw new Error(game.i18n.localize("NSD.Import.NewerVersion"));
    const presets = data.presets
      .filter(p => p && (typeof p === "object") && (typeof p.id === "string") && p.id)
      .map(p => cleanPreset(p, result.skipped));
    if ( presets.length ) {
      const defaultPreset = presets.some(p => p.id === data.defaultPreset) ? data.defaultPreset : presets[0].id;
      result.settings[SETTINGS.presets] = { version: DATA_VERSION, defaultPreset, presets };
      result.count = countOverrides(presets.find(p => p.id === defaultPreset));
    }
  }

  if ( !Object.keys(result.settings).length ) throw new Error(game.i18n.localize("NSD.Import.NotAnExport"));
  return result;
}

/**
 * Store an export payload, replacing the current scene defaults. No confirmation.
 * @param {object} payload  Parsed export file.
 * @returns {Promise<{count: number, skipped: string[]}>}
 */
export async function importData(payload) {
  const { settings, count, skipped } = readExport(payload);
  for ( const [key, value] of Object.entries(settings) ) {
    if ( key === SETTINGS.presets ) await setData(value);
    else await game.settings.set(MODULE_ID, key, value);
  }
  return { count, skipped };
}

/** Pick a JSON file, confirm, and import it. */
export async function importFromFile() {
  const file = await pickFile();
  if ( !file ) return;

  let payload;
  let parsed;
  try {
    payload = JSON.parse(await foundry.utils.readTextFromFile(file));
    parsed = readExport(payload);
  } catch (err) {
    warn("Import failed:", err);
    ui.notifications.error("NSD.Notifications.ImportFailed", { localize: true, format: { error: err.message } });
    return;
  }

  const name = foundry.utils.escapeHTML(file.name);
  const content = parsed.settings[SETTINGS.presets]
    ? game.i18n.format("NSD.Import.Content", { name, count: parsed.count })
    : game.i18n.format("NSD.Import.ContentSettingsOnly", { name });
  const confirmed = await foundry.applications.api.DialogV2.confirm({
    window: { title: "NSD.Import.Title", icon: "fa-solid fa-file-import" },
    content: `<p>${content}</p>`,
    modal: true
  });
  if ( !confirmed ) return;

  const { skipped } = await importData(payload);
  ui.notifications.info("NSD.Notifications.Imported", { localize: true, format: { name: file.name } });
  if ( skipped.length ) {
    ui.notifications.warn("NSD.Notifications.ImportSkipped", { localize: true, format: { fields: skipped.join(", ") } });
  }
}

/* -------------------------------------------- */

/**
 * A preset from a file, with every value checked like the settings window does. Unknown fields (e.g. from a newer
 * Foundry version) and invalid values are dropped and listed in `skipped`.
 * @param {object} raw
 * @param {string[]} skipped
 * @returns {object}
 */
function cleanPreset(raw, skipped) {
  const name = (typeof raw.name === "string") && raw.name
    ? raw.name
    : raw.id === DEFAULT_PRESET_ID ? game.i18n.localize("NSD.Preset.DefaultName") : raw.id;
  const preset = emptyPreset(raw.id, name);
  const index = getFieldIndex();
  for ( const part of ["scene", "level"] ) {
    const values = raw[part];
    if ( !values || (typeof values !== "object") ) continue;
    for ( const [path, rawValue] of Object.entries(values) ) {
      const entry = index.get(fieldKey(path, part === "level"));
      const { value, error } = entry ? cleanValue(entry, rawValue) : { error: "unknown field" };
      if ( error ) {
        warn(`Import: field "${path}" of preset "${name}" ignored: ${error}`);
        skipped.push(entry ? game.i18n.localize(entry.def.label ?? entry.field.label ?? path) : path);
        continue;
      }
      preset[part][path] = value;
    }
  }
  return preset;
}

/**
 * Open the browser's file picker for one JSON file.
 * @returns {Promise<File|null>}
 */
function pickFile() {
  return new Promise(resolve => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json,application/json";
    input.addEventListener("change", () => resolve(input.files?.[0] ?? null), { once: true });
    input.addEventListener("cancel", () => resolve(null), { once: true });
    input.click();
  });
}
