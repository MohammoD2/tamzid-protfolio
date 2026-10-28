# Website typography versions

Active: Outfit for headings and branding, Manrope for body text and navigation.
The user rejected the Bodoni Moda luxury trial and requested restoration of this previous pairing.
All six pages now preload Outfit and Manrope. css/luxury-typography.css is inactive.
The original template font was Metropolis; restore it only if explicitly requested.

Theme-linked typography: Classic White and Midnight Blue use Outfit + Manrope. Liquid Glass uses locally hosted Montserrat: 800 weight titles and 400 weight descriptions. Game canvas text follows the same theme font family.
Classic White is the existing light palette; Midnight Blue is the existing dark blue palette.
Additional color themes can be registered in js/theme-toggle.js with matching CSS palette rules.

Liquid Glass is a light theme defined in css/liquid-glass.css. Its saved theme ID is glass.

Default theme for a first visit or unavailable storage: Liquid Glass. Explicitly saved Classic White/Midnight Blue selections remain respected.
