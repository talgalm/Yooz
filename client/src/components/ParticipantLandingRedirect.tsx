import { Navigate } from 'react-router-dom';
import { participantPlayPath, readStoredActivityCode } from '../utils/participantActivity';
import LandingPage from '../pages/LandingPage';

/** Marketing landing — but bounce back to the last activity login if this device was playing. */
export default function ParticipantLandingRedirect() {
  const code = readStoredActivityCode();
  if (code) {
    return <Navigate to={participantPlayPath(code)} replace />;
  }
  return <LandingPage />;
}
