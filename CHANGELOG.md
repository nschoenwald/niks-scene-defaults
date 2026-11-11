# Changelog

All notable changes to Nik's Scene Defaults are documented in this file.

## [14.1.0] - 2026-11-07
### Added
- **Export / Import**: Save your scene defaults to a JSON file and load them into another world, with the new **Export** and **Import** buttons in the settings window. The file works like the settings exports of Nik's Foundry Tweaks and Nik's DnD5e Tweaks.

## [14.0.1] - 2026-11-07
### Fixed
- **Settings window**: The checkboxes of the settings you chose are checked again when you reopen the window. Before, they always showed unchecked, and saving again without re-checking them removed your defaults.

## [14.0.0] - 2026-11-06
### Added
- **Scene defaults**: Choose the settings new scenes start with, in a window laid out like Scene Configuration: grid, vision and fog, global illumination, ambience, background colour, size, navigation, player access, playlist and transition. Only the settings you check are changed.
- **Save as Scene Defaults**: Right-click a scene in the Scenes sidebar to use its settings as your defaults.
- **Imported scenes**: Scenes from compendiums and adventures keep their own settings. Turn on **Also apply to imported scenes** to give them your defaults too. Scene size, padding, grid type and grid size are kept, so walls and tokens stay aligned with the map.
- **Duplicated scenes** are never changed.
