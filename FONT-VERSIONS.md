# Website typography versions

Active: Montserrat for headings, branding, body text, and navigation.
This preserves the typography formerly used by Liquid Glass across both remaining themes.
All six pages now preload Montserrat. css/luxury-typography.css is inactive.
The original template font was Metropolis; restore it only if explicitly requested.

Classic White and Midnight Blue both use locally hosted Montserrat: strong, tightly spaced titles and clean 400-weight descriptions. Game canvas text follows the same shared font family.
Classic White is the existing light palette; Midnight Blue is the existing dark blue palette.
Additional color themes can be registered in js/theme-toggle.js with matching CSS palette rules.

Liquid Glass has been removed, including its stylesheet, material-tagging script, and reflection interactions. Old saved Glass selections automatically migrate to Classic White.

Default theme for a first visit or unavailable storage: Classic White. Explicitly saved Midnight Blue selections remain respected.
