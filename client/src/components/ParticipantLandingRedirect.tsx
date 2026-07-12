import { Navigate } from 'react-router-dom';
import { participantPlayPath, readStoredActivityCode } from '../utils/participantActivity';
import PublicityPage from '../pages/PublicityPage';

/** Admin-managed publicity site — but bounce back to the last activity login if this device was playing. */
export default function ParticipantLandingRedirect() {
  const code = readStoredActivityCode();
  if (code) {
    return <Navigate to={participantPlayPath(code)} replace />;
  }
  return <PublicityPage />;
}
