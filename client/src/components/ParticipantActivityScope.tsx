import { ReactNode, useEffect } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { activityCodeFromPathname, rememberActivityCode } from '../utils/participantActivity';
import { activityLanguages } from '../utils/activityLanguages';
import { useLang } from '../context/LanguageContext';
import OpenInBrowserPrompt from './OpenInBrowserPrompt';

/**
 * Wraps participant play routes — pins the activity code on every mount/navigation
 * so redirects after logout or auth loss never fall through to the landing page,
 * and narrows the interface to the languages this activity was prepared in.
 *
 * The narrowing is what makes an activity read as one piece: a Hebrew-only
 * activity is Hebrew all the way through — station names, buttons, help — even
 * on a device set to English, rather than English chrome wrapped around Hebrew
 * content. Outside the activity the participant's own choice stands again.
 */
export default function ParticipantActivityScope({ children }: { children: ReactNode }) {
  const { code: paramCode } = useParams<{ code?: string }>();
  const { pathname } = useLocation();
  const { restrictToLanguages } = useLang();

  const code = paramCode?.trim() || activityCodeFromPathname(pathname) || undefined;

  useEffect(() => {
    if (code) rememberActivityCode(code);
  }, [code]);

  useEffect(() => {
    // `null` while the activity's config has not been seen on this device yet:
    // unknown is not the same as "no languages", and clamping on a guess would
    // flip the interface to Hebrew and back as the config lands.
    restrictToLanguages(activityLanguages(code));
    return () => restrictToLanguages(null);
  }, [code, pathname, restrictToLanguages]);

  return <>{children}<OpenInBrowserPrompt /></>;
}
