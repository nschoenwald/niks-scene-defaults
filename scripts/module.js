import { DATA_VERSION, DEFAULT_PRESET_ID, MODULE_ID, SETTINGS } from "./constants.js";
import { getChanges, getCreationKind, onImportAdventure, onPreCreateScene, onPreImportAdventure, resolvePreset }
  from "./apply.js";
import { countOverrides, getDefaultPreset, getPreset, getPresets, presetFromScene, savePreset } from "./presets.js";
import { exportData, importData } from "./backup.js";
import SceneDefaultsConfig from "./apps/scene-defaults-config.js";

Hooks.once("init", () => {
  registerSettings();
  Hooks.on("preCreateScene", onPreCreateScene);
  Hooks.on("preImportAdventure", onPreImportAdventure);
  Hooks.on("importAdventure", onImportAdventure);
  Hooks.on("getSceneContextOptions", addSceneContextOptions);

  const api = {
    getPresets,
    getPreset,
    getDefaultPreset,
    resolvePreset,
    /**
     * The flat changes a preset would make to a scene created with `data`.
     * @param {object} [data]
     * @param {string} [presetId]
     */
    getChanges: (data = {}, presetId) => {
      const kind = getCreationKind(data);
      if ( kind === "duplicate" ) return { scene: {}, level: {}, skipped: [], kind };
      const force = (kind === "import") && game.settings.get(MODULE_ID, SETTINGS.applyToImports);
      return { ...getChanges(resolvePreset({ presetId }), data, { levelCreated: !data.levels?.length, force }), kind };
    },
    getCreationKind,
    savePresetFromScene: (scene, options) => savePreset(presetFromScene(scene, options)),
    exportData,
    importData,
    openConfig: () => new SceneDefaultsConfig().render({ force: true })
  };
  game.modules.get(MODULE_ID).api = api;
  globalThis.NiksSceneDefaults = api;
});

function registerSettings() {
  game.settings.register(MODULE_ID, SETTINGS.enabled, {
    name: "NSD.Settings.Enabled.Name",
    hint: "NSD.Settings.Enabled.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: true
  });

  game.settings.register(MODULE_ID, SETTINGS.applyToImports, {
    name: "NSD.Settings.ApplyToImports.Name",
    hint: "NSD.Settings.ApplyToImports.Hint",
    scope: "world",
    config: true,
    type: Boolean,
    default: false
  });

  game.settings.register(MODULE_ID, SETTINGS.presets, {
    scope: "world",
    config: false,
    type: Object,
    default: { version: DATA_VERSION, defaultPreset: DEFAULT_PRESET_ID, presets: [] },
    onChange: () => foundry.applications.instances.get("niks-scene-defaults-config")?.render()
  });

  game.settings.registerMenu(MODULE_ID, SETTINGS.menu, {
    name: "NSD.Settings.Menu.Name",
    label: "NSD.Settings.Menu.Label",
    hint: "NSD.Settings.Menu.Hint",
    icon: "fa-solid fa-map",
    type: SceneDefaultsConfig,
    restricted: true
  });
}

/**
 * Scene directory context menu: "Save as Scene Defaults".
 * @param {SceneDirectory} app
 * @param {ContextMenuEntry[]} options
 */
function addSceneContextOptions(app, options) {
  options.push({
    label: "NSD.Context.SaveAsDefaults",
    icon: "fa-solid fa-map",
    visible: () => game.user.isGM,
    onClick: (event, li) => {
      const scene = game.scenes.get(li.dataset.entryId);
      if ( scene ) saveSceneAsDefaults(scene);
    }
  });
}

/**
 * Ask, then replace the default preset with the settings of a scene.
 * @param {Scene} scene
 */
async function saveSceneAsDefaults(scene) {
  const preset = presetFromScene(scene, { id: getDefaultPreset()?.id ?? DEFAULT_PRESET_ID });
  const count = countOverrides(preset);
  const name = foundry.utils.escapeHTML(scene.name);
  const content = count
    ? game.i18n.format("NSD.Dialog.SaveContent", { name, count })
    : game.i18n.format("NSD.Dialog.SaveNone", { name });
  const confirmed = await foundry.applications.api.DialogV2.confirm({
    window: { title: "NSD.Dialog.SaveTitle", icon: "fa-solid fa-map" },
    content: `<p>${content}</p>`
  });
  if ( !confirmed ) return;
  await savePreset(preset);
  ui.notifications.info("NSD.Notifications.SavedFromScene", { localize: true, format: { name: scene.name } });
}
