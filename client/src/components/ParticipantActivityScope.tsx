import { ReactNode, useEffect } from 'react';
import { useLocation, useParams } from 'react-router-dom';
import { activityCodeFromPathname, rememberActivityCode } from '../utils/participantActivity';
import { activityLanguages } from '../utils/activityLanguages';
import { useLang } from '../context/LanguageContext';
import OpenInBrowserPrompt from './OpenInBrowserPrompt';

export default function ParticipantActivityScope({ children }: { children: ReactNode }) {
  const { code: paramCode } = useParams<{ code?: string }>();
  const { pathname } = useLocation();
  const { restrictToLanguages } = useLang();

  const code = paramCode?.trim() || activityCodeFromPathname(pathname) || undefined;

  useEffect(() => {
    if (code) rememberActivityCode(code);
  }, [code]);

  useEffect(() => {
    restrictToLanguages(activityLanguages(code));
    return () => restrictToLanguages(null);
  }, [code, pathname, restrictToLanguages]);

  return <>{children}<OpenInBrowserPrompt /></>;
}
