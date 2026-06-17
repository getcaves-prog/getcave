// ─── Feature flags ──────────────────────────────────────────────────────────
// Central place to toggle features on/off without ripping out code.
//
// COMMUNITIES_ENABLED: when false, every USER-FACING entry point to communities
// is hidden (main menu, profile footer/settings links, "Mis comunidades"
// carousel, "Conviértete en organizador" CTA). The communities pages/services
// still exist — users just can't navigate there. Flip back to true to restore.
export const COMMUNITIES_ENABLED = false;
