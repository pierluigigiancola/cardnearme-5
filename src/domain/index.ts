/**
 * The domain module (ADR 0001): pure TypeScript trading rules shared by the
 * mock services today and the Supabase-backed server functions later. No
 * React, Supabase or mock-service imports; types from `#/services/types` only.
 */
export * from './caps'
export * from './collection'
export * from './give'
export * from './tradeValue'
