# SlotSure design system

Tokens use CSS variables in `blacksmith_pro/src/styles/globals.css`, allowing later synchronization with Figma variables. The core palette uses trust blue, availability/confirmation green, held/degraded amber, and conflict red. Spacing follows a 4px base; radii use 8px controls and 14px cards. Focus rings are always visible in trust blue, and reduced-motion preferences disable non-essential animation.

Status labels are always textual as well as colored: available, provisional, held, confirmed, unavailable, conflict, pending, degraded, and critical. Patient layouts collapse at 760px; staff desktop layouts will use a wider breakpoint in the next increment.
