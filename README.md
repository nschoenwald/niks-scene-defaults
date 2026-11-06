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

---

## Modules by Nik

### 🧩 Nik's Tweaks
* **[Nik's Foundry Tweaks](https://github.com/nschoenwald/niks-foundry-tweaks)** – System-independent quality-of-life tweaks and the shared settings dashboard of Nik's Tweaks modules.

### 🎲 D&D 5e Specific
* **[Nik's DnD5e Tweaks](https://github.com/nschoenwald/niks-dnd5e-tweaks)** – Consolidated collection of quality-of-life enhancements and combat automation tweaks for DnD5e.

### ⚔️ Combat & Token Tools
* **[Nik's Action HUD](https://github.com/nschoenwald/niks-action-hud)** – Sleek, modern canvas-docked Action HUD for quick access to attacks, spells, inventory, and utility rolls.
* **[Nik's Effects Panel](https://github.com/nschoenwald/niks-effects-panel)** – Floating panel next to the sidebar that shows the selected token's active effects, to check, disable or remove them without opening the character sheet.
* **[Nik's Token Tags](https://github.com/nschoenwald/niks-token-tags)** – Automatically numbers duplicate combatant NPCs (A, B, C…) with color-coded letter overlays.
* **[Nik's Shared NPC Initiative](https://github.com/nschoenwald/niks-shared-npc-initiative)** – Groups NPCs of the same type in combat so they share a single initiative roll.
* **[Nik's Movement Control](https://github.com/nschoenwald/niks-movement-control)** – GM controls to toggle player movement and automatically restrict/allow movement on combat start and end.
* **[Nik's Token Motion](https://github.com/nschoenwald/niks-token-motion)** – Tokens hop square by square like miniatures, lift and set down like chess pieces, or glide smoothly, and long moves no longer crawl across the map.
* **[Nik's Tiny Change Logs](https://github.com/nschoenwald/niks-tiny-changelogs)** – Compact, single-line chat messages logging token HP and Temp HP changes.

### 🎨 Visuals & Display
* **[Nik's Dynamic Roll Area](https://github.com/nschoenwald/niks-dynamic-roll-area)** – Dynamically restricts Dice So Nice 3D dice rolling area to exclude the sidebar / chat log across all screen resolutions and window sizes.

### ⚙️ Utilities & System Management
* **[Nik's Settings Locks](https://github.com/nschoenwald/niks-settings-locks)** – Soft-lock and hard-lock client settings and keybindings across all connected players.
* **[Nik's Compendium Search Tweaks](https://github.com/nschoenwald/niks-compendium-search-tweaks)** – Configure which compendium packs are included or excluded from native sidebar search.
* **[Nik's Copy Environment](https://github.com/nschoenwald/niks-copy-environment)** – Copy the list of systems, modules, and versions, and export/import game and player settings.
* **[Nik's Show & Tell](https://github.com/nschoenwald/niks-show-and-tell)** – Share popout images to chat and paste image files directly into chat messages.
* **[Nik's Zoom / Pan Options](https://github.com/nschoenwald/niks-zoom-pan-options)** – Touchpad and scroll wheel pan/zoom controls and canvas navigation enhancements.
* **[Nik's Scene Transformations](https://github.com/nschoenwald/niks-scene-transformations)** – Rotate scenes or add playable space around them, with tokens, walls, lights, tiles and regions moved along so everything stays in place.
* **[Nik's Wall Height](https://github.com/nschoenwald/niks-wall-height)** – Give walls a bottom and top elevation, so tokens, lights and sounds above or below a wall ignore it.
* **[Nik's Scene Defaults](https://github.com/nschoenwald/niks-scene-defaults)** – Set your own defaults for new scenes (grid, vision, fog, lighting, background and more), so you don't have to change them on every scene.
