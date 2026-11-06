import { MODULE_ID, OPTION_KEY, SETTINGS, log, warn } from "./constants.js";
import { cleanValue, getDefaultPreset, getPreset, countOverrides } from "./presets.js";
import { fieldKey, getFieldIndex } from "./fields.js";

/**
 * Ids of the scenes an adventure import is about to create (adventures keep their document ids). Adventure scene data
 * carries no import marker of its own, so `preImportAdventure` notes the ids here.
 * @type {Set<string>}
 */
const adventureSceneIds = new Set();

/**
 * `preImportAdventure` handler.
 * @param {Adventure} adventure
 * @param {object} options
 * @param {Record<string, object[]>} toCreate
 */
export function onPreImportAdventure(adventure, options, toCreate) {
  for ( const data of toCreate?.Scene ?? [] ) if ( data._id ) adventureSceneIds.add(data._id);
}

/** `importAdventure` handler: the import is done (or failed), forget the ids. */
export function onImportAdventure() {
  adventureSceneIds.clear();
}

/**
 * How a scene is being created, judged from its creation data.
 * - `duplicate`: Duplicate in the sidebar (`clone(…, {addSource: true})` sets `_stats.duplicateSource`). A
 *   compendium entry that was duplicated inside its pack keeps a `Compendium.…` duplicate source; importing it is
 *   still an import.
 * - `import`: from a compendium (`fromCompendium` / drag and drop set `_stats.compendiumSource`) or an adventure.
 * - `new`: everything else (Create Scene, macros, other modules).
 * @param {object} data
 * @returns {"new"|"import"|"duplicate"}
 */
export function getCreationKind(data = {}) {
  const { duplicateSource, compendiumSource } = data._stats ?? {};
  if ( duplicateSource && !(compendiumSource && duplicateSource.startsWith("Compendium.")) ) return "duplicate";
  if ( compendiumSource || (data._id && adventureSceneIds.has(data._id)) ) return "import";
  return "new";
}

/**
 * Which preset a new scene gets.
 * Order: `options.niksSceneDefaults` (preset id) → default preset. Folder presets and the dialog choice follow later.
 * @param {{presetId?: string}} [options]
 * @returns {object|null}
 */
export function resolvePreset({ presetId } = {}) {
  if ( typeof presetId === "string" ) {
    const preset = getPreset(presetId);
    if ( preset ) return preset;
    warn(`Preset "${presetId}" not found, using the default preset.`);
  }
  return getDefaultPreset();
}

/**
 * The changes a preset makes to a scene created with the given data.
 * Fill only what's missing: a preset value is skipped when the creation data already contains that property. So
 * "Create Scene" (name only) gets the whole preset, while imports and duplicates (full data) stay unchanged.
 * With `force` (imports, when the world setting allows it) every preset value is applied, except geometry fields.
 * @param {object} preset
 * @param {object} [data]          Creation data
 * @param {object} [options]
 * @param {boolean} [options.levelCreated=true]  Whether core creates the default level (no levels in `data`)
 * @param {boolean} [options.force=false]        Apply values even when the data contains them
 * @returns {{scene: Record<string, *>, level: Record<string, *>, skipped: string[]}}  Flat property paths
 */
export function getChanges(preset, data = {}, { levelCreated = true, force = false } = {}) {
  const index = getFieldIndex();
  const result = { scene: {}, level: {}, skipped: [] };
  if ( !preset ) return result;

  for ( const [path, raw] of Object.entries(preset.scene ?? {}) ) {
    const entry = index.get(fieldKey(path));
    if ( !entry ) continue;
    if ( force ? entry.def.geometry : foundry.utils.hasProperty(data, path) ) continue;
    const { value, error } = cleanValue(entry, raw);
    if ( error ) result.skipped.push(path);
    else result.scene[path] = value;
  }

  // Level values go to the level core creates for a new scene; into a level that came with the data only with force
  if ( levelCreated || force ) {
    for ( const [path, raw] of Object.entries(preset.level ?? {}) ) {
      const entry = index.get(fieldKey(path, true));
      if ( !entry ) continue;
      if ( !force && hasLegacyLevelProperty(data, path) ) continue;
      const { value, error } = cleanValue(entry, raw);
      if ( error ) result.skipped.push(path);
      else result.level[path] = value;
    }
  }

  // A linked playlist that was deleted since the preset was saved
  const playlistId = result.scene.playlist;
  if ( playlistId && !game.playlists.has(playlistId) ) {
    delete result.scene.playlist;
    result.skipped.push("playlist");
  }
  return result;
}

/**
 * Whether pre-V14 creation data (no levels) sets a level property the old way, e.g. `backgroundColor` for the level's
 * `background.color`. Core moves these into the level it creates (`Scene#_preCreate`).
 * @param {object} data
 * @param {string} levelPath
 * @returns {boolean}
 */
function hasLegacyLevelProperty(data, levelPath) {
  // Internal core map [scenePath, levelPath]; fall back to the one pair the presets use if it ever disappears
  const map = foundry.documents.Scene._LEVELS_PROPERTY_MAP ?? [["backgroundColor", "background.color"]];
  return map.some(([scenePath, path]) => (path === levelPath) && foundry.utils.hasProperty(data, scenePath));
}

/**
 * `preCreateScene` handler. Runs after core's `Scene#_preCreate`, so the default level already exists.
 * @param {Scene} scene
 * @param {object} data
 * @param {object} options
 * @param {string} userId
 */
export function onPreCreateScene(scene, data, options, userId) {
  if ( userId !== game.user.id ) return;
  const option = options?.[OPTION_KEY];
  if ( option === false ) return;
  if ( (option === undefined) && !game.settings.get(MODULE_ID, SETTINGS.enabled) ) return;

  // Duplicates are never changed; imports only when the world setting allows it
  const kind = getCreationKind(data);
  if ( kind === "duplicate" ) return;
  const force = (kind === "import") && game.settings.get(MODULE_ID, SETTINGS.applyToImports);

  const preset = resolvePreset({ presetId: typeof option === "string" ? option : undefined });
  if ( !countOverrides(preset) ) return;

  const levelCreated = !data.levels?.length;
  const changes = getChanges(preset, data, { levelCreated, force });
  changes.kind = kind;
  if ( Hooks.call(`${MODULE_ID}.preApply`, scene, changes, preset, data, options) === false ) return;

  const update = foundry.utils.expandObject(changes.scene);
  const levelId = scene.initialLevel?.id;
  if ( levelId && Object.keys(changes.level).length ) {
    update.levels = [{ _id: levelId, ...foundry.utils.expandObject(changes.level) }];
  }
  if ( foundry.utils.isEmpty(update) ) return;

  try {
    scene.updateSource(update);
  } catch (err) {
    // One bad value must never block scene creation: apply the fields one by one instead
    warn("Applying the preset at once failed, applying field by field.", err);
    applyOneByOne(scene, changes, levelId);
  }

  if ( changes.skipped.length ) {
    warn(`Preset "${preset.name}": invalid values skipped:`, changes.skipped);
    ui.notifications.warn("NSD.Notifications.Skipped", {
      localize: true, format: { name: preset.name, fields: changes.skipped.join(", ") }
    });
  }
  log(`Applied preset "${preset.name}" to ${kind} scene "${scene.name}".`, changes);
}

/**
 * @param {Scene} scene
 * @param {{scene: object, level: object, skipped: string[]}} changes
 * @param {string} [levelId]
 */
function applyOneByOne(scene, changes, levelId) {
  for ( const [path, value] of Object.entries(changes.scene) ) {
    try {
      scene.updateSource(foundry.utils.expandObject({ [path]: value }));
    } catch {
      changes.skipped.push(path);
    }
  }
  if ( !levelId ) return;
  for ( const [path, value] of Object.entries(changes.level) ) {
    try {
      scene.updateSource({ levels: [{ _id: levelId, ...foundry.utils.expandObject({ [path]: value }) }] });
    } catch {
      changes.skipped.push(path);
    }
  }
}
