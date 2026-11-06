import { DEFAULT_PRESET_ID, MODULE_ID } from "../constants.js";
import { getCoreValue, getFieldIndex, getFieldTabs } from "../fields.js";
import { cleanValue, emptyPreset, getDefaultPreset, pruneUnknown, savePreset } from "../presets.js";

const { ApplicationV2, HandlebarsApplicationMixin } = foundry.applications.api;

/**
 * Settings window: one checkbox "Override" per scene property, laid out like Scene Configuration.
 * Unchecked properties are disabled and show the value core would use.
 */
export default class SceneDefaultsConfig extends HandlebarsApplicationMixin(ApplicationV2) {

  static DEFAULT_OPTIONS = {
    id: "niks-scene-defaults-config",
    tag: "form",
    classes: ["niks-scene-defaults"],
    window: {
      title: "NSD.Config.Title",
      icon: "fa-solid fa-map",
      contentClasses: ["standard-form"],
      resizable: true
    },
    position: { width: 600, height: 720 },
    form: {
      closeOnSubmit: true,
      handler: SceneDefaultsConfig.#onSubmit
    },
    actions: {
      clearAll: SceneDefaultsConfig.#onClearAll
    }
  };

  static PARTS = {
    header: { template: `modules/${MODULE_ID}/templates/config-header.hbs` },
    tabs: { template: "templates/generic/tab-navigation.hbs" },
    basics: { template: `modules/${MODULE_ID}/templates/config-tab.hbs`, scrollable: [""] },
    grid: { template: `modules/${MODULE_ID}/templates/config-tab.hbs`, scrollable: [""] },
    visibility: { template: `modules/${MODULE_ID}/templates/config-tab.hbs`, scrollable: [""] },
    environment: { template: `modules/${MODULE_ID}/templates/config-tab.hbs`, scrollable: [""] },
    misc: { template: `modules/${MODULE_ID}/templates/config-tab.hbs`, scrollable: [""] },
    footer: { template: "templates/generic/form-footer.hbs" }
  };

  static TABS = {
    sheet: {
      tabs: getFieldTabs().map(({ id, icon }) => ({ id, icon })),
      initial: "basics",
      labelPrefix: "SCENE.TABS.SHEET"
    }
  };

  /**
   * The preset being edited. Several presets follow in a later version.
   * @type {string}
   */
  presetId = DEFAULT_PRESET_ID;

  /* -------------------------------------------- */

  /** @inheritDoc */
  async _prepareContext(options) {
    const context = await super._prepareContext(options);
    context.preset = pruneUnknown(foundry.utils.deepClone(getDefaultPreset() ?? emptyPreset(this.presetId, "")));
    this.presetId = context.preset.id;
    return context;
  }

  /** @inheritDoc */
  async _preparePartContext(partId, context, options) {
    context = await super._preparePartContext(partId, context, options);
    const preset = context.preset;

    if ( partId === "footer" ) {
      context.buttons = [
        { type: "button", action: "clearAll", icon: "fa-solid fa-eraser", label: "NSD.Config.ClearAll" },
        { type: "submit", icon: "fa-solid fa-floppy-disk", label: "SETTINGS.Save" }
      ];
      return context;
    }

    const tab = getFieldTabs().find(t => t.id === partId);
    if ( !tab ) return context;
    context.tab = context.tabs[partId];
    const index = getFieldIndex();
    context.fieldsets = tab.fieldsets.map(fieldset => ({
      legend: fieldset.legend,
      hint: fieldset.hint,
      rows: fieldset.fields
        .map(def => index.get(`${def.level ? "level" : "scene"}:${def.path}`))
        .filter(Boolean)
        .map(entry => this.#renderRow(entry, preset))
        .filter(Boolean)
    }));
    return context;
  }

  /* -------------------------------------------- */

  /**
   * Render one property as a form group with an "Override" checkbox in front.
   * @param {object} entry   Field index entry
   * @param {object} preset
   * @returns {{html: string}|null}
   */
  #renderRow(entry, preset) {
    const store = preset[entry.level ? "level" : "scene"];
    const overridden = Object.hasOwn(store, entry.path);
    const value = overridden ? store[entry.path] : getCoreValue(entry);
    const { def, field } = entry;
    const id = `${this.id}-${entry.key.replace(/[^\w-]/g, "-")}`;

    const inputConfig = { name: `value.${entry.key}`, value, disabled: !overridden, id, localize: true };
    if ( def.step !== undefined ) inputConfig.step = def.step;
    if ( def.choices ) inputConfig.choices = def.choices();
    if ( def.blank !== undefined ) inputConfig.blank = def.blank ? game.i18n.localize(def.blank) : "";

    let group;
    try {
      group = field.toFormGroup({
        label: def.label ?? field.label ?? entry.path,
        hint: field.hint,
        localize: true,
        classes: ["nsd-row"]
      }, inputConfig);
    } catch (err) {
      console.warn(`${MODULE_ID} | Can't render field "${entry.path}":`, err);
      return null;
    }
    group.dataset.key = entry.key;
    group.classList.toggle("nsd-inactive", !overridden);

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.className = "nsd-override";
    checkbox.name = `override.${entry.key}`;
    checkbox.checked = overridden;
    checkbox.dataset.tooltip = "NSD.Config.Override";
    checkbox.setAttribute("aria-label", game.i18n.localize("NSD.Config.Override"));
    group.prepend(checkbox);
    return { html: group.outerHTML };
  }

  /* -------------------------------------------- */

  /** @inheritDoc */
  _onRender(context, options) {
    super._onRender(context, options);
    for ( const checkbox of this.element.querySelectorAll("input.nsd-override") ) {
      checkbox.addEventListener("change", () => this.#toggleRow(checkbox.closest(".nsd-row"), checkbox.checked));
    }
  }

  /**
   * @param {HTMLElement} row
   * @param {boolean} active
   */
  #toggleRow(row, active) {
    if ( !row ) return;
    row.classList.toggle("nsd-inactive", !active);
    for ( const input of row.querySelectorAll(".form-fields [name]") ) input.disabled = !active;
  }

  /* -------------------------------------------- */

  /**
   * Uncheck every property (not saved until the GM clicks Save).
   * @this {SceneDefaultsConfig}
   */
  static #onClearAll() {
    for ( const checkbox of this.element.querySelectorAll("input.nsd-override") ) {
      checkbox.checked = false;
      this.#toggleRow(checkbox.closest(".nsd-row"), false);
    }
  }

  /* -------------------------------------------- */

  /**
   * @this {SceneDefaultsConfig}
   * @param {SubmitEvent} event
   * @param {HTMLFormElement} form
   * @param {FormDataExtended} formData
   */
  static async #onSubmit(event, form, formData) {
    const values = formData.object;
    const current = getDefaultPreset() ?? emptyPreset(this.presetId, game.i18n.localize("NSD.Preset.DefaultName"));
    const preset = emptyPreset(current.id, current.name);
    const errors = [];

    for ( const entry of getFieldIndex().values() ) {
      if ( values[`override.${entry.key}`] !== true ) continue;
      const raw = values[`value.${entry.key}`];
      // A checked row with a disabled input would not be in the form data
      if ( raw === undefined ) continue;
      const { value, error } = cleanValue(entry, raw);
      if ( error ) {
        errors.push(game.i18n.localize(entry.def.label ?? entry.field.label ?? entry.path));
        continue;
      }
      preset[entry.level ? "level" : "scene"][entry.path] = value;
    }

    await savePreset(preset);
    if ( errors.length ) {
      ui.notifications.warn("NSD.Notifications.InvalidValues", { localize: true, format: { fields: errors.join(", ") } });
    }
    else ui.notifications.info("NSD.Notifications.Saved", { localize: true });
  }
}
