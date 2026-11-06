# Nik's Scene Defaults

[![Foundry VTT](https://img.shields.io/badge/Foundry%20VTT-V14-orange.svg)](https://foundryvtt.com)
[![Systems](https://img.shields.io/badge/Systems-Any-blue.svg)](https://foundryvtt.com/packages/systems)
[![Latest Release](https://img.shields.io/github/v/release/nschoenwald/niks-scene-defaults?color=purple)](https://github.com/nschoenwald/niks-scene-defaults/releases/latest)

Choose the settings new scenes start with, once, instead of changing them on every scene. Works with **any game system** in **Foundry VTT v14**.

---

## ✨ Features

- **Where to find it**: **Game Settings → Configure Settings → Nik's Scene Defaults → Configure Scene Defaults** (GM only).
- **Pick what to change**: Each setting has a checkbox. Checked settings are used for every new scene; unchecked ones keep Foundry's value, shown greyed out. So your defaults can be as small as "white grid lines".
- **Settings you can preset**, laid out like Scene Configuration:
  - **Basics**: show in navigation, player access, background colour, scene width and height, padding.
  - **Grid**: type, size, distance, units, style, thickness, colour and opacity.
  - **Visibility**: token vision, fog exploration mode, explored and unexplored colours, global illumination and its threshold.
  - **Environment**: base and darkness ambience, darkness level and lock, blend ambience.
  - **Misc**: scene playlist, transition animation, duration and "active only".
- **Copy from a scene**: Right-click a scene in the Scenes sidebar and choose **Save as Scene Defaults**. Every setting of that scene that differs from Foundry's defaults becomes your new default.
- **Imports stay untouched**: Only settings that a new scene doesn't bring along are filled in. Scenes created with **Create Scene** get all your defaults. Scenes from compendiums and adventures keep their own settings.
- **Also apply to imported scenes** (world setting, off by default): Scenes imported from compendiums (sidebar import or drag and drop) and adventures get your defaults too, replacing their own values. Scene size, padding, grid type and grid size are never changed on imports, so walls, tokens and tiles stay aligned with the map. The background colour goes on the scene's starting level.
- **Duplicates are never changed**: A duplicated scene always stays an exact copy, whatever the settings.
- **Switch off** with the setting **Apply to new scenes**.

---

## ⚙️ For GMs

- If the playlist in your defaults has been deleted, new scenes are created without a playlist and you get a warning.
- Grid type, distance and units that aren't checked come from your game system (for example 5 ft squares in D&D 5e).
- New scenes have no background image yet, so the scene size you set is used as is.

---

## 🧑‍💻 For Module Developers

- **Skip the defaults** for a scene you create: `Scene.create(data, { niksSceneDefaults: false })`.
- Scenes are told apart by their data: `_stats.duplicateSource` marks a duplicate, `_stats.compendiumSource` a compendium import, and scenes created by an adventure import are noted from the `preImportAdventure` hook. A scene you create from full data without these markers (e.g. a `clone()` without `addSource`) counts as new: only the settings it doesn't bring along are filled in.
- **API**: on `game.modules.get("niks-scene-defaults").api` and `globalThis.NiksSceneDefaults` after `init`:
  - `getDefaultPreset()`: the stored defaults (`{ id, name, scene, level }`, flat property paths).
  - `getChanges(data = {})`: the changes the defaults would make to a scene created with `data`, plus `kind`.
  - `getCreationKind(data)`: `"new"`, `"import"` or `"duplicate"`.
  - `savePresetFromScene(scene)`: replace the defaults with the settings of a scene.
  - `openConfig()`: open the settings window.
- **Hook** `niks-scene-defaults.preApply(scene, changes, preset, data, options)`: runs before the defaults are applied. Edit `changes.scene` / `changes.level`, or return `false` to skip. `changes.kind` tells how the scene is being created. Not called for duplicates.

---

## 🌐 Languages

🇬🇧 English · 🇩🇪 Deutsch

---

## 📦 Installation

Paste this manifest URL in **Add-on Modules → Install Module**:
```
https://github.com/nschoenwald/niks-scene-defaults/releases/latest/download/module.json
```

Requires **Foundry VTT v14**. Works with any game system.
