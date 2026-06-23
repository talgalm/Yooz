import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  participantPlayPath,
  rememberActivityCode,
  resolveParticipantActivityCode,
} from '../utils/participantActivity';

/**
 * Leave the activity session but stay on that activity's login — never the marketing landing page.
 */
export function useParticipantExit() {
  const navigate = useNavigate();
  const { logout, participant } = useAuth();

  return useCallback((code?: string | null) => {
    const resolved = code?.trim() || participant?.activityCode || resolveParticipantActivityCode();
    if (resolved) rememberActivityCode(resolved);
    navigate(participantPlayPath(resolved), { replace: true });
    logout();
  }, [navigate, logout, participant?.activityCode]);
}
