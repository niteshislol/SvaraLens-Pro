/**
 * Integration points. Nothing here is invented: unset values hide or honestly
 * redirect the related UI instead of pointing at dead pages.
 */
const env = import.meta.env

/** Real Workbench entry point (the marketing site stays independent of it). */
export const APP_URL: string = env.VITE_APP_URL || '/app/'

/** Real sign-in route. When unset, "Sign in" opens the Request Access flow. Defaults to Workbench. */
export const AUTH_URL: string = env.VITE_AUTH_URL || '/app/'

/** Real documentation URL. When unset, Documentation links are not rendered. */
export const DOCS_URL: string = env.VITE_DOCS_URL || ''

/** Real Capsule Registry / capsule explainer. Falls back to the in-page section. */
export const CAPSULE_URL: string = env.VITE_CAPSULE_URL || '#capsule'

/** Request-submission endpoint (see /server). */
export const ACCESS_ENDPOINT: string = env.VITE_ACCESS_ENDPOINT || '/api/access-requests'

/** Legal pages. Links render only when these are provided. */
export const PRIVACY_URL: string = env.VITE_PRIVACY_URL || ''
export const TERMS_URL: string = env.VITE_TERMS_URL || ''
