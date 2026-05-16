import { supabase } from './supabase';

export type AuditActionType =
  | 'TOGGLE_PROJECT'
  | 'TOGGLE_EVENT'
  | 'UPDATE_EVENT'
  | 'DELETE_EVENT'
  | 'SYNC_CALENDAR'
  | 'PROJECT_DECISION';

export interface AuditLogEntry {
  id?: string;
  action_type: AuditActionType;
  entity_id: string;
  previous_state: any;
  new_state: any;
  created_at?: string;
  reverted?: boolean;
}

export async function logAction(
  actionType: AuditActionType,
  entityId: string,
  previousState: any,
  newState: any
) {
  try {
    await supabase.from('audit_log').insert({
      action_type: actionType,
      entity_id: entityId,
      previous_state: previousState,
      new_state: newState
    });
  } catch (err) {
    console.error('Failed to insert audit log', err);
  }
}

export async function pruneAuditLog(maxAgeDays = 30) {
  try {
    const cutoff = new Date(Date.now() - maxAgeDays * 24 * 60 * 60 * 1000).toISOString();
    await supabase.from('audit_log').delete().lt('created_at', cutoff);
  } catch (err) {
    console.error('Failed to prune audit log', err);
  }
}
