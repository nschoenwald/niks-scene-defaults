/**
 * The scene and level properties a preset can set, grouped like the tabs of Scene Configuration.
 *
 * Each entry:
 * - `path`: property path on the Scene (or on the default Level when `level` is true).
 * - `level`: the value lives on the Scene's default Level (V14 moved background colour etc. there).
 * - `label`: localization key, when the schema field has no label of its own (or a misleading one).
 * - `step`, `choices`, `blank`: passed to the input.
 * - `field`: a function returning a custom DataField, for properties without a usable schema field.
 * - `geometry`: changing it on a scene with content would misalign walls, tokens and tiles with the map, so it is
 *   never applied to imported scenes.
 */

const { fields } = foundry.data;

/** Lazily built index of every supported field, keyed by `scene:<path>` / `level:<path>`. */
let fieldIndex = null;

/**
 * @returns {Array<{id: string, icon: string, fieldsets: Array<{legend: string, hint?: string, fields: object[]}>}>}
 */
export function getFieldTabs() {
  return [
    {
      id: "basics",
      icon: "fa-solid fa-image",
      fieldsets: [
        {
          legend: "SCENE.Accessibility",
          fields: [
            { path: "navigation" },
            {
              path: "ownership.default",
              field: () => new fields.NumberField({
                required: true, nullable: false, initial: CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE,
                label: "SCENE.Accessibility",
                choices: {
                  [CONST.DOCUMENT_OWNERSHIP_LEVELS.NONE]: "SCENE.AccessibilityGM",
                  [CONST.DOCUMENT_OWNERSHIP_LEVELS.OBSERVER]: "SCENE.AccessibilityAll"
                }
              }, { name: "ownership.default" })
            }
          ]
        },
        {
          legend: "SCENE.Properties",
          fields: [
            { path: "background.color", level: true, label: "SCENE.FIELDS.backgroundColor.label" },
            { path: "width", geometry: true },
            { path: "height", geometry: true },
            { path: "padding", step: 0.05, geometry: true }
          ]
        }
      ]
    },
    {
      id: "grid",
      icon: "fa-solid fa-grid",
      fieldsets: [
        {
          legend: "SCENE.GridMechanics",
          fields: [
            { path: "grid.type", choices: () => getGridTypes(), geometry: true },
            { path: "grid.size", geometry: true },
            { path: "grid.distance" },
            { path: "grid.units" }
          ]
        },
        {
          legend: "SCENE.GridAppearance",
          fields: [
            { path: "grid.style", choices: () => getGridStyles() },
            { path: "grid.thickness" },
            { path: "grid.color" },
            { path: "grid.alpha", step: 0.05 }
          ]
        }
      ]
    },
    {
      id: "visibility",
      icon: "fa-solid fa-eye",
      fieldsets: [
        {
          legend: "SCENE.FogOfWar",
          fields: [
            { path: "tokenVision" },
            { path: "fog.mode", choices: () => getFogModes() },
            { path: "fog.colors.unexplored" },
            { path: "fog.colors.explored" }
          ]
        },
        {
          legend: "SCENE.GlobalIllumination",
          fields: [
            { path: "environment.globalLight.enabled" },
            { path: "environment.globalLight.darkness.max", step: 0.05 }
          ]
        }
      ]
    },
    {
      id: "environment",
      icon: "fa-solid fa-sun-cloud",
      fieldsets: [
        {
          legend: "SCENE.Environment.Base",
          fields: ["luminosity", "saturation", "shadows", "hue", "intensity"].map(k => ({
            path: `environment.base.${k}`, step: k === "hue" ? undefined : 0.05,
            label: `SCENE.FIELDS.environment.base.${k}.label`
          }))
        },
        {
          legend: "SCENE.Darkness",
          fields: [
            { path: "environment.darknessLevel", step: 0.05 },
            { path: "environment.darknessLock" }
          ]
        },
        {
          legend: "SCENE.Environment.Dark",
          hint: "SCENE.Environment.DarkHint",
          fields: [
            { path: "environment.cycle" },
            ...["luminosity", "saturation", "shadows", "hue", "intensity"].map(k => ({
              path: `environment.dark.${k}`, step: k === "hue" ? undefined : 0.05,
              label: `SCENE.FIELDS.environment.base.${k}.label`
            }))
          ]
        }
      ]
    },
    {
      id: "misc",
      icon: "fa-solid fa-shapes",
      fieldsets: [
        {
          legend: "SCENE.Audio",
          fields: [
            { path: "playlist", choices: () => getPlaylists(), blank: "" }
          ]
        },
        {
          legend: "SCENE.Transition.Animation",
          fields: [
            { path: "transition.type", choices: () => getTransitionTypes(), blank: "COMMON.None" },
            { path: "transition.duration" },
            { path: "transition.activeOnly" }
          ]
        }
      ]
    }
  ];
}

/**
 * All supported fields, each with its resolved DataField.
 * @returns {Map<string, {key: string, path: string, level: boolean, field: DataField, def: object}>}
 */
export function getFieldIndex() {
  if ( fieldIndex ) return fieldIndex;
  fieldIndex = new Map();
  for ( const tab of getFieldTabs() ) {
    for ( const fieldset of tab.fieldsets ) {
      for ( const def of fieldset.fields ) {
        const field = resolveField(def);
        if ( !field ) {
          console.warn(`niks-scene-defaults | Unknown scene field "${def.path}", skipped.`);
          continue;
        }
        const key = fieldKey(def.path, def.level);
        fieldIndex.set(key, { key, path: def.path, level: !!def.level, field, def });
      }
    }
  }
  return fieldIndex;
}

/**
 * @param {string} path
 * @param {boolean} [level]
 * @returns {string}
 */
export function fieldKey(path, level = false) {
  return `${level ? "level" : "scene"}:${path}`;
}

/**
 * The value core gives a new scene for this field (system grid values included).
 * @param {{field: DataField}} entry
 * @returns {*}
 */
export function getCoreValue(entry) {
  try {
    return entry.field.getInitialValue({});
  } catch {
    return undefined;
  }
}

/**
 * @param {object} def
 * @returns {DataField|null}
 */
function resolveField(def) {
  if ( def.field ) return def.field();
  const model = def.level ? foundry.documents.Level : foundry.documents.Scene;
  return model.schema.getField(def.path) ?? null;
}

function getGridTypes() {
  const labels = {
    GRIDLESS: "SCENE.GridGridless",
    SQUARE: "SCENE.GridSquare",
    HEXODDR: "SCENE.GridHexOddR",
    HEXEVENR: "SCENE.GridHexEvenR",
    HEXODDQ: "SCENE.GridHexOddQ",
    HEXEVENQ: "SCENE.GridHexEvenQ"
  };
  return Object.entries(CONST.GRID_TYPES).reduce((types, [key, value]) => {
    types[value] = game.i18n.localize(labels[key] ?? key);
    return types;
  }, {});
}

function getGridStyles() {
  return Object.entries(CONFIG.Canvas.gridStyles).reduce((styles, [key, value]) => {
    styles[key] = game.i18n.localize(value.label);
    return styles;
  }, {});
}

function getFogModes() {
  return Object.entries(CONST.FOG_EXPLORATION_MODES).reduce((modes, [key, value]) => {
    const k = `SCENE.FIELDS.fog.MODES.${key}`;
    modes[value] = game.i18n.has(k) ? game.i18n.localize(k) : key;
    return modes;
  }, {});
}

function getTransitionTypes() {
  return Object.entries(CONFIG.Canvas.sceneTransitions).reduce((types, [key, value]) => {
    types[key] = game.i18n.localize(value.label ?? `SCENE.Transition.Types.${key}`);
    return types;
  }, {});
}

function getPlaylists() {
  return Object.fromEntries(game.playlists.contents
    .sort((a, b) => a.name.localeCompare(b.name, game.i18n.lang))
    .map(p => [p.id, p.name]));
}
