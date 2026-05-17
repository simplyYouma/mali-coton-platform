import { useMutation, useQueryClient } from '@tanstack/react-query';
import {
  markSampleReceived,
  markSampleSent,
  patchMeasurement,
  rejectBordereau,
  rejectCollection,
  refuseSample,
  requestCorrection,
  transmitBordereau,
  validateCollection,
  type ReceiveSampleInput,
  type RefuseSampleInput,
  type RejectBordereauInput,
  type SendSampleInput,
  type TransmitBordereauInput,
} from '../api/collections';
import type { Measurement } from '../api/collection.types';

interface ValidateInput {
  id: string;
  validatedBy: string;
  notes?: string;
}

interface RejectInput {
  id: string;
  validatedBy: string;
  rejectionReason: string;
}

interface CorrectionInput {
  id: string;
  requestedBy: string;
  notes: string;
  targetSteps?: string[];
}

interface PatchMeasurementInput {
  collectionId: string;
  indicatorId: string;
  patch: Partial<Measurement>;
}

export function useValidateCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, validatedBy, notes }: ValidateInput) =>
      validateCollection(id, validatedBy, notes),
    onSuccess: (collection) => {
      qc.invalidateQueries({ queryKey: ['collections'] });
      qc.setQueryData(['collections', collection.id], collection);
    },
  });
}

export function useRejectCollection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, validatedBy, rejectionReason }: RejectInput) =>
      rejectCollection(id, validatedBy, rejectionReason),
    onSuccess: (collection) => {
      qc.invalidateQueries({ queryKey: ['collections'] });
      qc.setQueryData(['collections', collection.id], collection);
    },
  });
}

export function useRequestCorrection() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, requestedBy, notes, targetSteps }: CorrectionInput) =>
      requestCorrection(id, requestedBy, notes, targetSteps),
    onSuccess: (collection) => {
      qc.invalidateQueries({ queryKey: ['collections'] });
      qc.setQueryData(['collections', collection.id], collection);
    },
  });
}

export function usePatchMeasurement() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ collectionId, indicatorId, patch }: PatchMeasurementInput) =>
      patchMeasurement(collectionId, indicatorId, patch),
    onSuccess: (collection) => {
      qc.invalidateQueries({ queryKey: ['collections'] });
      qc.setQueryData(['collections', collection.id], collection);
    },
  });
}

export function useMarkSampleSent() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: SendSampleInput) => markSampleSent(input),
    onSuccess: (collection) => {
      qc.invalidateQueries({ queryKey: ['collections'] });
      qc.setQueryData(['collections', collection.id], collection);
    },
  });
}

export function useMarkSampleReceived() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: ReceiveSampleInput) => markSampleReceived(input),
    onSuccess: (collection) => {
      qc.invalidateQueries({ queryKey: ['collections'] });
      qc.setQueryData(['collections', collection.id], collection);
    },
  });
}

export function useRefuseSample() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: RefuseSampleInput) => refuseSample(input),
    onSuccess: (collection) => {
      qc.invalidateQueries({ queryKey: ['collections'] });
      qc.setQueryData(['collections', collection.id], collection);
    },
  });
}

export function useTransmitBordereau() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: TransmitBordereauInput) => transmitBordereau(input),
    onSuccess: (collection) => {
      qc.invalidateQueries({ queryKey: ['collections'] });
      qc.setQueryData(['collections', collection.id], collection);
    },
  });
}

export function useRejectBordereau() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: RejectBordereauInput) => rejectBordereau(input),
    onSuccess: (collection) => {
      qc.invalidateQueries({ queryKey: ['collections'] });
      qc.setQueryData(['collections', collection.id], collection);
    },
  });
}
