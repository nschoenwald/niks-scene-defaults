import { DATA_VERSION, DEFAULT_PRESET_ID, MODULE_ID, SETTINGS, warn } from "./constants.js";
import { fieldKey, getCoreValue, getFieldIndex } from "./fields.js";

/**
 * Stored data (world setting `presets`):
 * {
 *   version: 1,
 *   defaultPreset: "default",
 *   presets: [{ id, name, scene: { "grid.color": "#ffffff", … }, level: { "background.color": "#000000" } }]
 * }
 * `scene` and `level` hold only overridden fields, keyed by flat property path.
 */

/** @returns {object} */
export function emptyData() {
  return {
    version: DATA_VERSION,
    defaultPreset: DEFAULT_PRESET_ID,
    presets: [emptyPreset(DEFAULT_PRESET_ID, game.i18n.localize("NSD.Preset.DefaultName"))]
  };
}

/**
 * @param {string} id
 * @param {string} name
 * @returns {object}
 */
export function emptyPreset(id, name) {
  return { id, name, scene: {}, level: {} };
}

/** @returns {object} A copy of the stored data, filled up to the current shape. */
export function getData() {
  const stored = foundry.utils.deepClone(game.settings.get(MODULE_ID, SETTINGS.presets) ?? {});
  const data = foundry.utils.mergeObject(emptyData(), stored, { inplace: false });
  if ( !Array.isArray(data.presets) || !data.presets.length ) data.presets = emptyData().presets;
  for ( const preset of data.presets ) {
    preset.scene ??= {};
    preset.level ??= {};
  }
  return data;
}

/**
 * @param {object} data
 * @returns {Promise}
 */
export async function setData(data) {
  data.version = DATA_VERSION;
  return game.settings.set(MODULE_ID, SETTINGS.presets, data);
}

/** @returns {object[]} */
export function getPresets() {
  return getData().presets;
}

/**
 * @param {string} id
 * @returns {object|null}
 */
export function getPreset(id) {
  return getPresets().find(p => p.id === id) ?? null;
}

/** @returns {object|null} */
export function getDefaultPreset() {
  const data = getData();
  return data.presets.find(p => p.id === data.defaultPreset) ?? data.presets[0] ?? null;
}

/**
 * Replace one preset (matched by id) and save.
 * @param {object} preset
 * @returns {Promise}
 */
export async function savePreset(preset) {
  const data = getData();
  const index = data.presets.findIndex(p => p.id === preset.id);
  if ( index === -1 ) data.presets.push(preset);
  else data.presets[index] = preset;
  return setData(data);
}

/**
 * Number of fields a preset overrides.
 * @param {object} preset
 * @returns {number}
 */
export function countOverrides(preset) {
  return Object.keys(preset?.scene ?? {}).length + Object.keys(preset?.level ?? {}).length;
}

/**
 * Clean and validate a value for a supported field.
 * @param {{field: DataField}} entry
 * @param {*} raw
 * @returns {{value?: *, error?: string}}
 */
export function cleanValue(entry, raw) {
  const { field } = entry;
  try {
    let value = raw;
    if ( (value === "") && field.nullable ) value = null;
    value = field.clean(value);
    const failure = field.validate(value);
    if ( failure ) return { error: failure.message ?? String(failure) };
    return { value };
  } catch (err) {
    return { error: err.message };
  }
}

/**
 * Build a preset from an existing scene: every supported field whose value differs from what core gives a new scene.
 * @param {Scene} scene
 * @param {{id?: string, name?: string}} [options]
 * @returns {object}
 */
export function presetFromScene(scene, { id = DEFAULT_PRESET_ID, name } = {}) {
  const preset = emptyPreset(id, name ?? getPreset(id)?.name ?? game.i18n.localize("NSD.Preset.DefaultName"));
  const levelSource = scene.initialLevel?._source ?? scene.levels?.contents?.[0]?._source ?? {};
  for ( const entry of getFieldIndex().values() ) {
    const source = entry.level ? levelSource : scene._source;
    if ( !foundry.utils.hasProperty(source, entry.path) ) continue;
    const value = foundry.utils.getProperty(source, entry.path);
    if ( isEqual(value, getCoreValue(entry)) ) continue;
    const { value: clean, error } = cleanValue(entry, value);
    if ( error ) {
      warn(`Field "${entry.path}" of scene "${scene.name}" not saved: ${error}`);
      continue;
    }
    preset[entry.level ? "level" : "scene"][entry.path] = clean;
  }
  return preset;
}

/**
 * Drop fields that are no longer supported (e.g. after a core update) from a preset, with a console warning.
 * @param {object} preset
 * @returns {object}
 */
export function pruneUnknown(preset) {
  const index = getFieldIndex();
  for ( const part of ["scene", "level"] ) {
    for ( const path of Object.keys(preset[part] ?? {}) ) {
      if ( index.has(fieldKey(path, part === "level")) ) continue;
      warn(`Preset "${preset.name}": unknown field "${path}" ignored.`);
      delete preset[part][path];
    }
  }
  return preset;
}

/**
 * @param {*} a
 * @param {*} b
 * @returns {boolean}
 */
function isEqual(a, b) {
  if ( (a === undefined || a === null) && (b === undefined || b === null) ) return true;
  if ( (typeof a === "object") || (typeof b === "object") ) return foundry.utils.equals(a ?? {}, b ?? {});
  return String(a) === String(b);
}
