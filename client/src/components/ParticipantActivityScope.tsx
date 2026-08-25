import { ReactNode, useEffect } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { activityCodeFromPathname, rememberActivityCode } from '../utils/participantActivity';
import OpenInBrowserPrompt from './OpenInBrowserPrompt';

/**
 * Wraps participant play routes — pins the activity code on every mount/navigation
 * so redirects after logout or auth loss never fall through to the landing page.
 */
export default function ParticipantActivityScope({ children }: { children: ReactNode }) {
  const { code: paramCode } = useParams<{ code?: string }>();
  const { pathname } = useLocation();

  useEffect(() => {
    const code = paramCode?.trim() || activityCodeFromPathname(pathname);
    if (code) rememberActivityCode(code);
  }, [paramCode, pathname]);

  return <>{children}<OpenInBrowserPrompt /></>;
}
