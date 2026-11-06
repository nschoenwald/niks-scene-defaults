export const MODULE_ID = "niks-scene-defaults";

/** Setting keys. */
export const SETTINGS = {
  enabled: "enabled",
  applyToImports: "applyToImports",
  presets: "presets",
  menu: "configMenu"
};

/** Version of the stored preset data, for later migrations. */
export const DATA_VERSION = 1;

/** Id of the only preset for now. Several presets are planned for a later version. */
export const DEFAULT_PRESET_ID = "default";

/** Key in the creation options: `false` skips the module, a string forces a preset. */
export const OPTION_KEY = "niksSceneDefaults";

export const log = (...args) => console.log(`${MODULE_ID} |`, ...args);
export const warn = (...args) => console.warn(`${MODULE_ID} |`, ...args);
