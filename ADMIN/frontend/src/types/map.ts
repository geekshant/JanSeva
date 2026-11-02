// ===========================================================================
// Civic Map — types for the map view
// ===========================================================================

import type { ComplaintStatus, ComplaintSeverity, AiDecision, AiMatchLevel, AiEvidenceQuality } from './database';

/** A complaint with minimal fields for map display (from the RPC function). */
export interface MapComplaint {
  id: string;
  complaint_number: string;
  title: string;
  status: ComplaintStatus;
  severity: ComplaintSeverity;
  lat: number;
  lng: number;
  category_id: string | null;
  category_name: string | null;
  assigned_department_id: string | null;
  ward: string | null;
  created_at: string;
  sla_deadline: string | null;
  address: string | null;
}

/** Bounding box (west, south, east, north) in WGS84. */
export interface MapBounds {
  west: number;
  south: number;
  east: number;
  north: number;
}

/** Map display mode — which layers to render. */
export type MapViewMode = 'markers' | 'heatmap' | 'both';

/** Map data source — complaint density or civic incident density. */
export type MapDataSource = 'complaints' | 'incidents';

/** Date range presets for the map. */
export type DateRangePreset = 'all' | 'today' | '7d' | '30d' | '90d' | 'custom';

/** All filters supported by the civic map. */
export interface MapFilters {
  status: ComplaintStatus | '';
  severity: ComplaintSeverity | '';
  categoryId: string;
  departmentId: string;
  ward: string;
  sla: 'all' | 'on_track' | 'due_soon' | 'at_risk' | 'breached' | 'resolved';
  dateFrom: string;
  dateTo: string;
  datePreset: DateRangePreset;
  dataSource: MapDataSource;
}

/** The default empty filter state. */
export const DEFAULT_MAP_FILTERS: MapFilters = {
  status: '',
  severity: '',
  categoryId: '',
  departmentId: '',
  ward: '',
  sla: 'all',
  dateFrom: '',
  dateTo: '',
  datePreset: 'all',
  dataSource: 'complaints',
};

/**
 * Priority-based heat weights for complaint severity. Higher severity =
 * greater heatmap weight so hotspots of critical issues stand out.
 *
 * Centralized here for easy replacement with database-configured values later.
 */
export const PRIORITY_HEAT_WEIGHTS: Record<ComplaintSeverity, number> = {
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 5,
};

/** Marker color scheme keyed by status / SLA state. */
export const MARKER_COLORS: Record<string, string> = {
  SUBMITTED: '#3b82f6',   // blue
  VERIFIED: '#0891b2',    // cyan
  ASSIGNED: '#6366f1',    // indigo
  IN_PROGRESS: '#d97706', // amber
  RESOLVED: '#16a34a',    // green
  REJECTED: '#9ca3af',    // gray
  SLA_BREACHED: '#dc2626',    // red
  SLA_ESCALATED: '#991b1b',   // dark red
  SLA_AT_RISK: '#ea580c',     // orange
  SLA_DUE_SOON: '#ca8a04',    // yellow
};

/** Returns the marker color for a complaint, considering SLA state. */
export function getMarkerColor(
  status: ComplaintStatus,
  severity: ComplaintSeverity,
  slaDeadline: string | null,
): string {
  if (status === 'RESOLVED' || status === 'REJECTED') {
    return MARKER_COLORS[status] ?? '#6b7280';
  }
  if (slaDeadline) {
    const now = Date.now();
    const deadline = new Date(slaDeadline).getTime();
    const hoursLeft = (deadline - now) / (1000 * 60 * 60);
    if (hoursLeft < 0) {
      return (severity === 'HIGH' || severity === 'CRITICAL')
        ? MARKER_COLORS.SLA_ESCALATED
        : MARKER_COLORS.SLA_BREACHED;
    }
    if (hoursLeft < 12) return MARKER_COLORS.SLA_AT_RISK;
    if (hoursLeft < 24) return MARKER_COLORS.SLA_DUE_SOON;
  }
  return MARKER_COLORS[status] ?? '#6b7280';
}

/**
 * Returns a GeoJSON Feature from a MapComplaint for clustering/heatmap.
 * Includes `weight` property based on complaint severity for weighted heatmap.
 */
export function toGeoJSONFeature(c: MapComplaint): GeoJSON.Feature<GeoJSON.Point> {
  return {
    type: 'Feature',
    properties: {
      id: c.id,
      complaint_number: c.complaint_number,
      title: c.title,
      status: c.status,
      severity: c.severity,
      category_name: c.category_name,
      ward: c.ward,
      created_at: c.created_at,
      sla_deadline: c.sla_deadline,
      address: c.address,
      weight: PRIORITY_HEAT_WEIGHTS[c.severity] ?? 1,
    },
    geometry: {
      type: 'Point',
      coordinates: [c.lng, c.lat],
    },
  };
}

/** Computes date range strings from a preset. Returns {dateFrom, dateTo} in YYYY-MM-DD. */
export function dateRangeFromPreset(preset: DateRangePreset): { dateFrom: string; dateTo: string } {
  if (preset === 'all' || preset === 'custom') return { dateFrom: '', dateTo: '' };
  const now = new Date();
  const to = now.toISOString().split('T')[0];
  const days = preset === 'today' ? 0 : preset === '7d' ? 7 : preset === '30d' ? 30 : 90;
  const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000)
    .toISOString()
    .split('T')[0];
  return { dateFrom: from, dateTo: to };
}

/** Validates that lat/lng are valid geographic coordinates. */
export function isValidCoordinate(lat: number, lng: number): boolean {
  return (
    typeof lat === 'number' &&
    typeof lng === 'number' &&
    !isNaN(lat) &&
    !isNaN(lng) &&
    isFinite(lat) &&
    isFinite(lng) &&
    lat >= -90 &&
    lat <= 90 &&
    lng >= -180 &&
    lng <= 180
  );
}

// ===========================================================================
// Dashboard Map — types for the integrated dashboard civic map
// ===========================================================================

/** A complaint with location info for dashboard map display (from the RPC). */
export interface DashboardMapComplaint {
  id: string;
  complaint_number: string;
  title: string;
  status: ComplaintStatus;
  severity: ComplaintSeverity;
  lat: number | null;
  lng: number | null;
  has_location: boolean;
  category_id: string | null;
  category_name: string | null;
  assigned_department_id: string | null;
  ward: string | null;
  created_at: string;
  sla_deadline: string | null;
  address: string | null;
  ai_decision: AiDecision | null;
  ai_status: string | null;
  ai_reason: string | null;
  ai_category_match: AiMatchLevel | null;
  ai_evidence_quality: AiEvidenceQuality | null;
  ai_image_count: number | null;
  ai_detected_category: string | null;
  ai_selected_category: string | null;
  ai_description_match: AiMatchLevel | null;
  review_decision: string | null;
}

/** Converts a DashboardMapComplaint to a MapComplaint (for CivicMap). */
export function toMapComplaint(c: DashboardMapComplaint): MapComplaint {
  return {
    id: c.id,
    complaint_number: c.complaint_number,
    title: c.title,
    status: c.status,
    severity: c.severity,
    lat: c.lat ?? 0,
    lng: c.lng ?? 0,
    category_id: c.category_id,
    category_name: c.category_name,
    assigned_department_id: c.assigned_department_id,
    ward: c.ward,
    created_at: c.created_at,
    sla_deadline: c.sla_deadline,
    address: c.address,
  };
}

/** Dashboard map filters — a subset of MapFilters (no SLA/dataSource). */
export interface DashboardFilters {
  status: ComplaintStatus | '';
  severity: ComplaintSeverity | '';
  categoryId: string;
  departmentId: string;
  ward: string;
  dateFrom: string;
  dateTo: string;
  datePreset: DateRangePreset;
}

export const DEFAULT_DASHBOARD_FILTERS: DashboardFilters = {
  status: '',
  severity: '',
  categoryId: '',
  departmentId: '',
  ward: '',
  dateFrom: '',
  dateTo: '',
  datePreset: '30d',
};

/** Computes date range from the default preset (30 days). */
export function defaultDateRange(): { dateFrom: string; dateTo: string } {
  return dateRangeFromPreset('30d');
}
