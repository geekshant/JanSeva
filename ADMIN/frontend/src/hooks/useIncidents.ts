import {
  useQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import {
  listIncidents,
  getIncident,
  createIncident,
  updateIncident,
  linkComplaintToIncident,
  unlinkComplaintFromIncident,
  markAsDuplicate,
  mergeIncidents,
  getIncidentComplaints,
  getIncidentLinks,
  getIncidentPhotos,
  findPotentialDuplicates,
  type ListIncidentsParams,
} from '@/services/incidents';
import type {
  CivicIncidentInsert,
  CivicIncidentUpdate,
} from '@/types';

const incidentsKey = ['incidents'] as const;

export function useIncidents(params: ListIncidentsParams = {}) {
  return useQuery({
    queryKey: [...incidentsKey, 'list', params],
    queryFn: () => listIncidents(params),
  });
}

export function useIncident(id: string) {
  return useQuery({
    queryKey: [...incidentsKey, 'detail', id],
    queryFn: () => getIncident(id),
    enabled: !!id,
  });
}

export function useCreateIncident() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CivicIncidentInsert) => createIncident(input),
    onSuccess: () => void qc.invalidateQueries({ queryKey: incidentsKey }),
  });
}

export function useUpdateIncident() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, patch }: { id: string; patch: CivicIncidentUpdate }) =>
      updateIncident(id, patch),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: incidentsKey });
      void qc.invalidateQueries({ queryKey: [...incidentsKey, 'detail', vars.id] });
    },
  });
}

export function useLinkComplaint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      complaintId,
      incidentId,
      linkType,
      linkedBy,
    }: {
      complaintId: string;
      incidentId: string;
      linkType?: 'original' | 'duplicate';
      linkedBy: string | null;
    }) =>
      linkComplaintToIncident(complaintId, incidentId, linkType ?? 'original', linkedBy),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: incidentsKey });
      void qc.invalidateQueries({ queryKey: [...incidentsKey, 'detail', vars.incidentId] });
      void qc.invalidateQueries({ queryKey: [...incidentsKey, 'complaints', vars.incidentId] });
      void qc.invalidateQueries({ queryKey: ['complaints'] });
    },
  });
}

export function useUnlinkComplaint() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      complaintId,
      incidentId,
      unlinkedBy,
    }: {
      complaintId: string;
      incidentId: string;
      unlinkedBy: string | null;
    }) => unlinkComplaintFromIncident(complaintId, incidentId, unlinkedBy),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: incidentsKey });
      void qc.invalidateQueries({ queryKey: [...incidentsKey, 'detail', vars.incidentId] });
      void qc.invalidateQueries({ queryKey: [...incidentsKey, 'complaints', vars.incidentId] });
      void qc.invalidateQueries({ queryKey: ['complaints'] });
    },
  });
}

export function useMarkAsDuplicate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      complaintId,
      incidentId,
      adminId,
    }: {
      complaintId: string;
      incidentId: string;
      adminId: string | null;
    }) => markAsDuplicate(complaintId, incidentId, adminId),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: [...incidentsKey, 'detail', vars.incidentId] });
      void qc.invalidateQueries({ queryKey: [...incidentsKey, 'complaints', vars.incidentId] });
    },
  });
}

export function useMergeIncidents() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({
      sourceIncidentId,
      targetIncidentId,
      adminId,
    }: {
      sourceIncidentId: string;
      targetIncidentId: string;
      adminId: string | null;
    }) => mergeIncidents(sourceIncidentId, targetIncidentId, adminId),
    onSuccess: (_data, vars) => {
      void qc.invalidateQueries({ queryKey: incidentsKey });
      void qc.invalidateQueries({ queryKey: [...incidentsKey, 'detail', vars.targetIncidentId] });
      void qc.invalidateQueries({ queryKey: [...incidentsKey, 'detail', vars.sourceIncidentId] });
      void qc.invalidateQueries({ queryKey: [...incidentsKey, 'complaints', vars.targetIncidentId] });
      void qc.invalidateQueries({ queryKey: [...incidentsKey, 'complaints', vars.sourceIncidentId] });
      void qc.invalidateQueries({ queryKey: ['complaints'] });
    },
  });
}

export function useIncidentComplaints(incidentId: string) {
  return useQuery({
    queryKey: [...incidentsKey, 'complaints', incidentId],
    queryFn: () => getIncidentComplaints(incidentId),
    enabled: !!incidentId,
  });
}

export function useIncidentLinks(incidentId: string) {
  return useQuery({
    queryKey: [...incidentsKey, 'links', incidentId],
    queryFn: () => getIncidentLinks(incidentId),
    enabled: !!incidentId,
  });
}

export function useIncidentPhotos(incidentId: string) {
  return useQuery({
    queryKey: [...incidentsKey, 'photos', incidentId],
    queryFn: () => getIncidentPhotos(incidentId),
    enabled: !!incidentId,
  });
}

export function usePotentialDuplicates(
  lat: number,
  lng: number,
  excludeId?: string,
  enabled = true,
) {
  return useQuery({
    queryKey: [...incidentsKey, 'duplicates', lat, lng, excludeId],
    queryFn: () => findPotentialDuplicates(lat, lng, 500, excludeId),
    enabled: enabled && !!lat && !!lng,
  });
}
