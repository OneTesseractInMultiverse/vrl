/** Immutable registry records; these are presentation data, not route model semantics. */
export interface IconPath { readonly d: string }
export interface LineStyle { readonly strokeWidth: number; readonly strokeDasharray: string; readonly strokeLinecap: "round" | "butt" }
export interface IconDefinition {
  readonly id: string; readonly label: string; readonly description: string; readonly origin: string;
  readonly category: string; readonly asset: string; readonly paths: readonly IconPath[];
  readonly illustrativeLevel?: number; readonly lineStyle?: LineStyle;
}
export interface IconManifest {
  readonly schemaVersion: 1; readonly license: string; readonly provenance: string;
  readonly viewBox: string; readonly strokeWidth: number; readonly strokeLinecap: string; readonly strokeLinejoin: string;
  readonly categories: readonly { readonly id: string; readonly label: string }[];
  readonly icons: readonly IconDefinition[];
  readonly semanticMappings: {
    readonly elements: Readonly<Record<string, string>>;
    readonly subtypes: Readonly<Record<string, Readonly<Record<string, string>>>>;
    readonly attributes: Readonly<Record<string, Readonly<Record<string, string>>>>;
  };
}
export interface IconOptions { size?: number; color?: string; title?: string; description?: string; decorative?: boolean }
export const iconManifest: IconManifest;
export const iconRegistry: Readonly<Record<string, IconDefinition>>;
export const iconIds: readonly string[];
/**
 * Look up an immutable icon by its exact case-sensitive ID without inherited-property fallback.
 * @responsibility computation
 * @param {string} id - Canonical registry key.
 * @returns {IconDefinition|null} Shared frozen definition or null for unknown IDs.
 */
export function getIcon(id: string): IconDefinition | null;
/**
 * Select definitions without exposing a mutable registry collection.
 * @responsibility computation
 * @param {string} [category] - Optional exact category; omission selects every definition.
 * @returns {IconDefinition[]} New array containing shared immutable definitions; unknown categories are empty.
 */
export function listIcons(category?: string): IconDefinition[];
/**
 * Retrieve reusable stroke parameters without inferring a route relationship.
 * @responsibility computation
 * @param {string} id - Exact icon ID.
 * @returns {LineStyle|null} Frozen line parameters or null for non-line or unknown icons.
 */
export function getLineStyle(id: string): LineStyle | null;
/**
 * Select a primary pictogram from explicit element and subtype values only.
 * @responsibility computation
 * @param {Object|null} element - Optional presentation record with type and raw attribute strings; no source parsing occurs.
 * @returns {string|null} Canonical icon ID with documented pool/hazard fallback, or null for an unknown element.
 */
export function resolveElementIconId(element?: { type?: string; attributes?: { type?: string } } | null): string | null;
/**
 * Map only explicitly supported attribute values without guessing from notes.
 * @responsibility computation
 * @param {string} field - Attribute field such as anchor or landing.
 * @param {string} value - Exact structured attribute value.
 * @returns {string|null} Canonical icon ID or null when no mapping is defined.
 */
export function resolveAttributeIconId(field: string, value: string): string | null;
/**
 * Serialize trusted registry geometry for a parent SVG that owns placement and accessibility.
 * @responsibility coordinator
 * @param {string} id - Canonical icon ID.
 * @returns {string} ID-free path group inheriting currentColor, without title or wrapper SVG.
 * @throws {RangeError} The ID is unknown.
 */
export function renderIconGeometry(id: string): string;
/**
 * Render a standalone square pictogram with escaped text and explicit decorative or named accessibility.
 * @responsibility coordinator
 * @param {string} id - Canonical icon ID.
 * @param {IconOptions} [options] - Defaults to size 32, currentColor, registry text and a named image; arbitrary markup is unsupported.
 * @returns {string} Complete ID-free SVG document retaining exact registry paths.
 * @throws {TypeError} Size, title, description or decorative flag violates its contract.
 * @throws {RangeError} The ID is unknown.
 */
export function renderIcon(id: string, options?: IconOptions): string;
