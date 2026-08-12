import { useState, useEffect, FormEvent } from 'react';
import { useNavigate, useParams, useSearchParams, useLocation } from 'react-router-dom';
import { styled } from '@mui/material/styles';
import { useTranslations } from '../../../context/LanguageContext';
import { texts } from './AdminStationConfigPage.i18n';
import { adminApiFetch } from '../../../utils/adminApi';
import FileUploadButton from '../../../components/FileUploadButton';
import {
  AdminPage,
  AdminHeader,
  AdminContent,
  Form,
  Input,
  PrimaryButton,
  ErrorText,
  SelectionButton,
  SelectionGroup,
} from '../../../components/styled';
import {
  AdminCardWide,
  PageTitle,
  PageTopRow,
  DesktopFormGrid,
  FormSectionCard,
  FormSectionCardWide,
  SectionLabel,
  SectionLabelNoMargin,
  SectionDescription,
  SmallOutlineButton,
  ToggleButton,
  InlineRow,
  InlineRowGap12,
  FlexInput,
  VerticalStack,
  SelectionSubtextSmall,
  SelectionGroupWrap,
} from '../styled';

const TextArea = styled('textarea')({
  width: '100%',
  padding: '12px 14px',
  fontSize: 14,
  border: '1px solid #d8dce5',
  borderRadius: 10,
  outline: 'none',
  background: '#ffffff',
  color: '#1a1a2e',
  fontFamily: 'inherit',
  resize: 'vertical',
  minHeight: 80,
  boxSizing: 'border-box',
  '&:focus': { borderColor: '#6c5ce7' },
});

type StationTypeOption = 'text' | 'video' | 'image' | 'narrative' | 'badge' | 'collage' | 'feedback' | 'riddle' | 'avatar' | 'avatarQuiz' | 'enteringText';

interface AvatarVideoConfig {
  url: string;
  matchingWords: string[];
}

/** One entry in an avatarQuiz question bank (admin-side shape — strings for numeric inputs). */
interface AvatarQuizQuestionConfig {
  text: string;
  idealAnswer: string;
  teachingPoint: string;
  acceptableKeywords: string[];
  commonWrongAnswers: { text: string; rebuttal: string }[];
  hintText: string;
  hintImageUrl: string;
  hintPenalty: string;
  mediaUrl: string;
  mediaType: 'image' | 'video';
  points: string;
  learnMoreUrl: string;
}

function emptyQuizQuestion(): AvatarQuizQuestionConfig {
  return {
    text: '',
    idealAnswer: '',
    teachingPoint: '',
    acceptableKeywords: [],
    commonWrongAnswers: [],
    hintText: '',
    hintImageUrl: '',
    hintPenalty: '2',
    mediaUrl: '',
    mediaType: 'image',
    points: '',
    learnMoreUrl: '',
  };
}

interface AvatarNamedEntry {
  name: string;
  description: string;
}

interface AvatarKnowledgeGate {
  trigger: string;
  reveal: string;
}

interface EnteringTextField {
  statement: string;
  placeholder: string;
  rightAnswer: string;
  keywordsBank: string;
}

interface StationData {
  _id: string;
  name: string;
  type: StationTypeOption;
  description?: string;
  customer?: string;
  theme?: string;
  tags?: string[];
  settings: Record<string, unknown>;
}

const HintToggleRow = styled(InlineRowGap12)({
  marginBottom: 8,
});

/**
 * Station-type picker. The shared `SelectionGroup` is a non-wrapping flex row
 * and `SelectionButton` is `flex: 1` with the default `min-width: auto`, so
 * items can't shrink past their content — past ~8 types the row overflowed the
 * card. Scoped here rather than changing the shared components, which other
 * admin screens size around.
 */
const StationTypeGroup = styled(SelectionGroupWrap)({
  // Grid rather than wrapping flex: with `flex: 1` the last row's leftover
  // tile stretches to the full card width. Even columns keep every tile the
  // same size no matter how many types exist.
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
  gap: 8,
  rowGap: 10,
  '& > button': { minWidth: 0 },
});

const RandomButton = styled('button')({
  background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
  color: '#fff',
  fontSize: 13,
  fontWeight: 700,
  padding: '8px 18px',
  borderRadius: 8,
  border: '2px solid #b45309',
  cursor: 'pointer',
  fontFamily: 'inherit',
  boxShadow: '0 2px 0 #92400e',
  transition: 'all 0.1s ease',
  '&:active': { transform: 'translateY(2px)', boxShadow: 'none' },
});

export default function AdminStationConfigPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const t = useTranslations(texts);

  const creatableTypes: StationTypeOption[] = ['text', 'video', 'image', 'collage', 'feedback', 'riddle', 'avatar', 'avatarQuiz', 'enteringText'];
  // avatarQuiz has a per-question hint (with its own point penalty); the
  // station-level clue on top of that is redundant and surfaced a clue button
  // in stations where nobody asked for one.
  const stationTypesWithoutHint: StationTypeOption[] = ['feedback', 'avatar', 'avatarQuiz'];
  const typeFromUrl = searchParams.get('type') as StationTypeOption | null;
  const defaultType: StationTypeOption =
    typeFromUrl && creatableTypes.includes(typeFromUrl) ? typeFromUrl : 'text';

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  /** avatar + avatarQuiz only: render `description` as an arrival popup instead of static text. */
  const [descriptionAsPopup, setDescriptionAsPopup] = useState(false);
  const [customer, setCustomer] = useState('');
  const [theme, setTheme] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [stationType, setStationType] = useState<StationTypeOption>(defaultType);

  // Hint
  const [hintEnabled, setHintEnabled] = useState(false);
  const [hintText, setHintText] = useState('');
  const [hintImageUrl, setHintImageUrl] = useState('');
  const [hintFree, setHintFree] = useState(false);

  // Text station
  const [textContent, setTextContent] = useState('');
  // Video/Image station
  const [mediaUrl, setMediaUrl] = useState('');
  const [descPosition, setDescPosition] = useState<'before' | 'after'>('before');
  // Narrative station
  const [narrativeTitle, setNarrativeTitle] = useState('');
  const [narrativeBody, setNarrativeBody] = useState('');
  const [narrativeButtonText, setNarrativeButtonText] = useState('');
  const [narrativeBgImage, setNarrativeBgImage] = useState('');
  // Badge station
  const [badgeTitle, setBadgeTitle] = useState('');
  const [badgeSubtitle, setBadgeSubtitle] = useState('');
  const [badgeImageUrl, setBadgeImageUrl] = useState('');
  // Collage station
  const [collageHeader, setCollageHeader] = useState('');
  const [collageDescription, setCollageDescription] = useState('');
  const [collageLogoUrl, setCollageLogoUrl] = useState('');
  const [collageMissions, setCollageMissions] = useState<{ title: string; description: string; referenceImageUrl?: string }[]>([
    { title: '', description: '' },
  ]);
  const [collageMultiSelect, setCollageMultiSelect] = useState(false);
  const [collageMultiSelectCount, setCollageMultiSelectCount] = useState('6');
  const [collageTemplate, setCollageTemplate] = useState<'default' | 'gan-yehoshua'>('default');
  const [collageDisclaimer, setCollageDisclaimer] = useState('');
  // Feedback station
  const [feedbackTitle, setFeedbackTitle] = useState('');
  const [feedbackIntroText, setFeedbackIntroText] = useState('');
  const [feedbackQuestions, setFeedbackQuestions] = useState<{ text: string }[]>([{ text: '' }]);
  const [feedbackNotesEnabled, setFeedbackNotesEnabled] = useState(true);
  const [feedbackNotesPlaceholder, setFeedbackNotesPlaceholder] = useState('');
  // Riddle station
  const [riddleClue, setRiddleClue] = useState('');
  const [riddleAnswer, setRiddleAnswer] = useState('');
  const [riddleMediaUrl, setRiddleMediaUrl] = useState('');
  const [riddleMediaType, setRiddleMediaType] = useState<'image' | 'video'>('image');
  const [riddleMaxScore, setRiddleMaxScore] = useState('100');
  const [riddleSuccessMsg, setRiddleSuccessMsg] = useState('');
  const [riddleFailureMsg, setRiddleFailureMsg] = useState('');
  const [riddleContinueBtnText, setRiddleContinueBtnText] = useState('');
  const [riddleSuccessImageUrl, setRiddleSuccessImageUrl] = useState('');
  const [riddleUnlimitedAttempts, setRiddleUnlimitedAttempts] = useState(false);
  // Avatar station
  const [avatarCharacterName, setAvatarCharacterName] = useState('');
  const [avatarCharacterImageUrl, setAvatarCharacterImageUrl] = useState('');
  const [avatarDetectiveRiddle, setAvatarDetectiveRiddle] = useState('');
  const [avatarInstructions, setAvatarInstructions] = useState('');
  const [avatarOptionalAnswers, setAvatarOptionalAnswers] = useState<string[]>([]);
  const [avatarForbiddenPhrases, setAvatarForbiddenPhrases] = useState<string[]>([]);
  const [avatarVideos, setAvatarVideos] = useState<AvatarVideoConfig[]>([]);
  const [avatarCharacters, setAvatarCharacters] = useState<AvatarNamedEntry[]>([]);
  const [avatarClues, setAvatarClues] = useState<AvatarNamedEntry[]>([]);
  const [avatarKnowledgeGates, setAvatarKnowledgeGates] = useState<AvatarKnowledgeGate[]>([]);
  const [avatarHintStrategy, setAvatarHintStrategy] = useState('');
  const [avatarVoiceType, setAvatarVoiceType] = useState<'man' | 'woman'>('man');
  // Entering text station
  const [quizCharacterName, setQuizCharacterName] = useState('');
  const [quizCharacterImageUrl, setQuizCharacterImageUrl] = useState('');
  const [quizVoiceType, setQuizVoiceType] = useState<'man' | 'woman'>('woman');
  const [quizTopic, setQuizTopic] = useState('');
  const [quizIntroText, setQuizIntroText] = useState('');
  const [quizOutroText, setQuizOutroText] = useState('');
  const [quizPersonaInstructions, setQuizPersonaInstructions] = useState('');
  const [quizStrictness, setQuizStrictness] = useState<'lenient' | 'balanced' | 'strict'>('balanced');
  const [quizPointsPerQuestion, setQuizPointsPerQuestion] = useState('10');
  const [quizQuestionCount, setQuizQuestionCount] = useState('0');
  const [quizShuffleQuestions, setQuizShuffleQuestions] = useState(false);
  const [quizAllowRetry, setQuizAllowRetry] = useState(false);
  const [quizAllowSkip, setQuizAllowSkip] = useState(false);
  const [quizAutoAdvance, setQuizAutoAdvance] = useState(false);
  const [quizQuestions, setQuizQuestions] = useState<AvatarQuizQuestionConfig[]>([emptyQuizQuestion()]);
  const [quizVideoAsking, setQuizVideoAsking] = useState('');
  const [quizVideoCorrect, setQuizVideoCorrect] = useState('');
  const [quizVideoPartial, setQuizVideoPartial] = useState('');
  const [quizVideoIncorrect, setQuizVideoIncorrect] = useState('');
  const [quizInvalidRows, setQuizInvalidRows] = useState<number[]>([]);

  const [enteringTextTitle, setEnteringTextTitle] = useState('');
  const [enteringTextFields, setEnteringTextFields] = useState<EnteringTextField[]>([{ statement: '', placeholder: '', rightAnswer: '', keywordsBank: '' }]);
  const [enteringTextSubmitButtonText, setEnteringTextSubmitButtonText] = useState('');
  const [enteringTextReturnButtonText, setEnteringTextReturnButtonText] = useState('');
  const [enteringTextMaxAttempts, setEnteringTextMaxAttempts] = useState('3');
  const [enteringTextSuccessTitle, setEnteringTextSuccessTitle] = useState('');
  const [enteringTextSuccessSubtitle, setEnteringTextSuccessSubtitle] = useState('');
  const [enteringTextSuccessMediaType, setEnteringTextSuccessMediaType] = useState<'image' | 'video' | ''>('');
  const [enteringTextSuccessMediaUrl, setEnteringTextSuccessMediaUrl] = useState('');
  const [enteringTextLastStep, setEnteringTextLastStep] = useState(false);
  const [enteringTextSolutionHintEnabled, setEnteringTextSolutionHintEnabled] = useState(false);
  const [enteringTextShowBackButton, setEnteringTextShowBackButton] = useState(true);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(!!id);

  /** Shared by the edit-load and the library-prefill paths. */
  const applyQuizSettings = (settings: Record<string, unknown>) => {
    if (settings.characterName) setQuizCharacterName(settings.characterName as string);
    if (settings.characterImageUrl) setQuizCharacterImageUrl(settings.characterImageUrl as string);
    if (settings.voiceType === 'man' || settings.voiceType === 'woman') setQuizVoiceType(settings.voiceType);
    setDescriptionAsPopup(!!settings.descriptionAsPopup);
    if (settings.topic) setQuizTopic(settings.topic as string);
    if (settings.introText) setQuizIntroText(settings.introText as string);
    if (settings.outroText) setQuizOutroText(settings.outroText as string);
    if (settings.personaInstructions) setQuizPersonaInstructions(settings.personaInstructions as string);
    if (settings.strictness === 'lenient' || settings.strictness === 'balanced' || settings.strictness === 'strict') {
      setQuizStrictness(settings.strictness);
    }
    if (typeof settings.pointsPerQuestion === 'number') setQuizPointsPerQuestion(String(settings.pointsPerQuestion));
    if (typeof settings.questionCount === 'number') setQuizQuestionCount(String(settings.questionCount));
    setQuizShuffleQuestions(settings.shuffleQuestions === true);
    setQuizAllowRetry(settings.allowRetry === true);
    setQuizAllowSkip(settings.allowSkip === true);
    setQuizAutoAdvance(settings.autoAdvance === true);
    const rv = (settings.reactionVideos || {}) as Record<string, unknown>;
    if (rv.asking) setQuizVideoAsking(rv.asking as string);
    if (rv.correct) setQuizVideoCorrect(rv.correct as string);
    if (rv.partial) setQuizVideoPartial(rv.partial as string);
    if (rv.incorrect) setQuizVideoIncorrect(rv.incorrect as string);
    if (Array.isArray(settings.questions) && settings.questions.length > 0) {
      setQuizQuestions((settings.questions as Array<Record<string, unknown>>).map((q) => {
        const hint = (q.hint || {}) as Record<string, unknown>;
        return {
          text: (q.text as string) || '',
          idealAnswer: (q.idealAnswer as string) || '',
          teachingPoint: (q.teachingPoint as string) || '',
          acceptableKeywords: Array.isArray(q.acceptableKeywords) ? (q.acceptableKeywords as string[]) : [],
          commonWrongAnswers: Array.isArray(q.commonWrongAnswers)
            ? (q.commonWrongAnswers as Array<Record<string, unknown>>).map((w) => ({
                text: (w.text as string) || '',
                rebuttal: (w.rebuttal as string) || '',
              }))
            : [],
          hintText: (hint.text as string) || '',
          hintImageUrl: (hint.imageUrl as string) || '',
          hintPenalty: typeof hint.penalty === 'number' ? String(hint.penalty) : '2',
          mediaUrl: (q.mediaUrl as string) || '',
          mediaType: q.mediaType === 'video' ? 'video' : 'image',
          points: typeof q.points === 'number' ? String(q.points) : '',
          learnMoreUrl: (q.learnMoreUrl as string) || '',
        };
      }));
    }
  };

  useEffect(() => {
    if (!id) return;
    adminApiFetch<{ station: StationData }>(`/api/admin/stations/${id}`)
      .then((data) => {
        const s = data.station;
        setName(s.name);
        setStationType(s.type || 'text');
        setDescription(s.description || '');
        setCustomer(s.customer || '');
        setTheme(s.theme || '');
        setTags(s.tags || []);

        const settings = s.settings || {};
        if (settings.hint && typeof settings.hint === 'object') {
          const h = settings.hint as Record<string, unknown>;
          setHintEnabled(!!h.enabled);
          setHintText((h.text as string) || '');
          setHintImageUrl((h.imageUrl as string) || '');
          setHintFree(!!h.free);
        }
        if (settings.content) setTextContent(settings.content as string);
        if (settings.mediaUrl) setMediaUrl(settings.mediaUrl as string);
        if (settings.title) setNarrativeTitle(settings.title as string);
        if (settings.bodyText) setNarrativeBody(settings.bodyText as string);
        if (settings.buttonText) setNarrativeButtonText(settings.buttonText as string);
        if (settings.backgroundImage) setNarrativeBgImage(settings.backgroundImage as string);
        if (s.type === 'badge') {
          if (settings.title) setBadgeTitle(settings.title as string);
          if (settings.subtitle) setBadgeSubtitle(settings.subtitle as string);
          if (settings.badgeImageUrl) setBadgeImageUrl(settings.badgeImageUrl as string);
        }
        if (s.type === 'collage') {
          if (settings.header) setCollageHeader(settings.header as string);
          if (settings.description) setCollageDescription(settings.description as string);
          if (settings.logoUrl) setCollageLogoUrl(settings.logoUrl as string);
          if (Array.isArray(settings.missions) && (settings.missions as unknown[]).length > 0) {
            setCollageMissions(settings.missions as { title: string; description: string; referenceImageUrl?: string }[]);
          }
          setCollageMultiSelect(!!settings.multiSelect);
          if (typeof settings.multiSelectCount === 'number') {
            setCollageMultiSelectCount(String(settings.multiSelectCount));
          }
          if (settings.template === 'gan-yehoshua' || settings.template === 'default') {
            setCollageTemplate(settings.template);
          }
          if (settings.disclaimer) setCollageDisclaimer(settings.disclaimer as string);
        }
        if (s.type === 'feedback') {
          if (settings.title) setFeedbackTitle(settings.title as string);
          if (settings.introText) setFeedbackIntroText(settings.introText as string);
          if (Array.isArray(settings.questions) && (settings.questions as unknown[]).length > 0) {
            setFeedbackQuestions(settings.questions as { text: string }[]);
          }
          setFeedbackNotesEnabled(settings.notesEnabled !== false);
          if (settings.notesPlaceholder) setFeedbackNotesPlaceholder(settings.notesPlaceholder as string);
        }
        if (s.type === 'riddle') {
          if (settings.clue) setRiddleClue(settings.clue as string);
          if (settings.answer) setRiddleAnswer(settings.answer as string);
          if (settings.mediaUrl) setRiddleMediaUrl(settings.mediaUrl as string);
          if (settings.mediaType) setRiddleMediaType(settings.mediaType as 'image' | 'video');
          if (typeof settings.maxScore === 'number') setRiddleMaxScore(String(settings.maxScore));
          if (settings.successMessage) setRiddleSuccessMsg(settings.successMessage as string);
          if (settings.failureMessage) setRiddleFailureMsg(settings.failureMessage as string);
          if (settings.continueButtonText) setRiddleContinueBtnText(settings.continueButtonText as string);
          if (settings.successImageUrl) setRiddleSuccessImageUrl(settings.successImageUrl as string);
          setRiddleUnlimitedAttempts(settings.unlimitedAttempts === true);
        }
        if (s.type === 'avatar') {
          if (settings.characterName) setAvatarCharacterName(settings.characterName as string);
          if (settings.characterImageUrl) setAvatarCharacterImageUrl(settings.characterImageUrl as string);
          if (settings.detectiveRiddle) setAvatarDetectiveRiddle(settings.detectiveRiddle as string);
          if (settings.instructions) setAvatarInstructions(settings.instructions as string);
          if (Array.isArray(settings.optionalAnswers)) setAvatarOptionalAnswers(settings.optionalAnswers as string[]);
          if (Array.isArray(settings.forbiddenPhrases)) setAvatarForbiddenPhrases(settings.forbiddenPhrases as string[]);
          if (Array.isArray(settings.videos)) setAvatarVideos(settings.videos as AvatarVideoConfig[]);
          if (Array.isArray(settings.characters)) setAvatarCharacters(settings.characters as AvatarNamedEntry[]);
          if (Array.isArray(settings.clues)) setAvatarClues(settings.clues as AvatarNamedEntry[]);
          if (Array.isArray(settings.knowledgeGates)) setAvatarKnowledgeGates(settings.knowledgeGates as AvatarKnowledgeGate[]);
          if (settings.hintStrategy) setAvatarHintStrategy(settings.hintStrategy as string);
          if (settings.voiceType === 'man' || settings.voiceType === 'woman') setAvatarVoiceType(settings.voiceType);
          setDescriptionAsPopup(!!settings.descriptionAsPopup);
        }
        if (s.type === 'avatarQuiz') {
          applyQuizSettings(settings);
        }
        if (s.type === 'enteringText') {
          if (settings.title) setEnteringTextTitle(settings.title as string);
          if (Array.isArray(settings.fields) && (settings.fields as unknown[]).length > 0) {
            setEnteringTextFields((settings.fields as Array<Record<string, unknown>>).map((f) => ({
              statement: (f.statement as string) || '',
              placeholder: (f.placeholder as string) || (f.description as string) || '',
              rightAnswer: (f.rightAnswer as string) || '',
              keywordsBank: (f.keywordsBank as string) || '',
            })));
          }
          if (settings.submitButtonText) setEnteringTextSubmitButtonText(settings.submitButtonText as string);
          if (settings.returnButtonText) setEnteringTextReturnButtonText(settings.returnButtonText as string);
          if (typeof settings.maxAttempts === 'number') setEnteringTextMaxAttempts(String(settings.maxAttempts));
          if (settings.successTitle) setEnteringTextSuccessTitle(settings.successTitle as string);
          if (settings.successSubtitle) setEnteringTextSuccessSubtitle(settings.successSubtitle as string);
          if (settings.successMediaType) setEnteringTextSuccessMediaType(settings.successMediaType as 'image' | 'video');
          if (settings.successMediaUrl) setEnteringTextSuccessMediaUrl(settings.successMediaUrl as string);
          setEnteringTextLastStep(!!settings.lastStep);
          if (settings.solutionHint && typeof settings.solutionHint === 'object') {
            const sh = settings.solutionHint as Record<string, unknown>;
            setEnteringTextSolutionHintEnabled(!!sh.enabled);
          }
          setEnteringTextShowBackButton(settings.showBackButton !== false);
        }
        setInitialLoading(false);
      })
      .catch(() => navigate('/admin/dashboard?tab=stations'));
  }, [id, navigate]);

  // Prefill from library item (export from Content Library)
  useEffect(() => {
    if (id) return; // only in create mode
    const lib = (location.state as { libraryItem?: { name: string; type: string; description?: string; customer?: string; tags?: string[]; settings?: Record<string, unknown> } })?.libraryItem;
    if (!lib) return;

    setName(lib.name || '');
    if (lib.type && creatableTypes.includes(lib.type as StationTypeOption)) {
      setStationType(lib.type as StationTypeOption);
    }
    setDescription(lib.description || '');
    setCustomer(lib.customer || '');
    setTags((lib.tags || []).filter(t => t !== 'imported'));

    const settings = lib.settings || {};
    if (settings.hint && typeof settings.hint === 'object') {
      const h = settings.hint as Record<string, unknown>;
      setHintEnabled(!!h.enabled);
      setHintText((h.text as string) || '');
      setHintImageUrl((h.imageUrl as string) || '');
      setHintFree(!!h.free);
    }
    if (settings.content) setTextContent(settings.content as string);
    if (settings.mediaUrl) setMediaUrl(settings.mediaUrl as string);
    if (settings.descPosition === 'after') setDescPosition('after');
    if (settings.title) setNarrativeTitle(settings.title as string);
    if (settings.bodyText) setNarrativeBody(settings.bodyText as string);
    if (settings.buttonText) setNarrativeButtonText(settings.buttonText as string);
    if (settings.backgroundImage) setNarrativeBgImage(settings.backgroundImage as string);
    if (lib.type === 'badge') {
      if (settings.title) setBadgeTitle(settings.title as string);
      if (settings.subtitle) setBadgeSubtitle(settings.subtitle as string);
      if (settings.badgeImageUrl) setBadgeImageUrl(settings.badgeImageUrl as string);
    }
    if (lib.type === 'collage') {
      if (settings.header) setCollageHeader(settings.header as string);
      if (settings.description) setCollageDescription(settings.description as string);
      if (settings.logoUrl) setCollageLogoUrl(settings.logoUrl as string);
      if (Array.isArray(settings.missions) && (settings.missions as unknown[]).length > 0) {
        setCollageMissions(settings.missions as { title: string; description: string; referenceImageUrl?: string }[]);
      }
      setCollageMultiSelect(!!settings.multiSelect);
      if (typeof settings.multiSelectCount === 'number') {
        setCollageMultiSelectCount(String(settings.multiSelectCount));
      }
      if (settings.template === 'gan-yehoshua' || settings.template === 'default') {
        setCollageTemplate(settings.template);
      }
      if (settings.disclaimer) setCollageDisclaimer(settings.disclaimer as string);
    }
    if (lib.type === 'feedback') {
      if (settings.title) setFeedbackTitle(settings.title as string);
      if (settings.introText) setFeedbackIntroText(settings.introText as string);
      if (Array.isArray(settings.questions) && (settings.questions as unknown[]).length > 0) {
        setFeedbackQuestions(settings.questions as { text: string }[]);
      }
      setFeedbackNotesEnabled(settings.notesEnabled !== false);
      if (settings.notesPlaceholder) setFeedbackNotesPlaceholder(settings.notesPlaceholder as string);
    }
    if (lib.type === 'riddle') {
      if (settings.clue) setRiddleClue(settings.clue as string);
      if (settings.answer) setRiddleAnswer(settings.answer as string);
      if (settings.mediaUrl) setRiddleMediaUrl(settings.mediaUrl as string);
      if (settings.mediaType) setRiddleMediaType(settings.mediaType as 'image' | 'video');
      if (typeof settings.maxScore === 'number') setRiddleMaxScore(String(settings.maxScore));
      if (settings.successMessage) setRiddleSuccessMsg(settings.successMessage as string);
      if (settings.failureMessage) setRiddleFailureMsg(settings.failureMessage as string);
      if (settings.continueButtonText) setRiddleContinueBtnText(settings.continueButtonText as string);
      if (settings.successImageUrl) setRiddleSuccessImageUrl(settings.successImageUrl as string);
      setRiddleUnlimitedAttempts(settings.unlimitedAttempts === true);
    }
    if (lib.type === 'avatarQuiz') {
      applyQuizSettings(settings);
    }
    if (lib.type === 'avatar') {
      if (settings.characterName) setAvatarCharacterName(settings.characterName as string);
      if (settings.characterImageUrl) setAvatarCharacterImageUrl(settings.characterImageUrl as string);
      if (settings.detectiveRiddle) setAvatarDetectiveRiddle(settings.detectiveRiddle as string);
      if (settings.instructions) setAvatarInstructions(settings.instructions as string);
      if (Array.isArray(settings.optionalAnswers)) setAvatarOptionalAnswers(settings.optionalAnswers as string[]);
      if (Array.isArray(settings.forbiddenPhrases)) setAvatarForbiddenPhrases(settings.forbiddenPhrases as string[]);
      if (Array.isArray(settings.videos)) setAvatarVideos(settings.videos as AvatarVideoConfig[]);
      if (Array.isArray(settings.characters)) setAvatarCharacters(settings.characters as AvatarNamedEntry[]);
      if (Array.isArray(settings.clues)) setAvatarClues(settings.clues as AvatarNamedEntry[]);
      if (Array.isArray(settings.knowledgeGates)) setAvatarKnowledgeGates(settings.knowledgeGates as AvatarKnowledgeGate[]);
      if (settings.hintStrategy) setAvatarHintStrategy(settings.hintStrategy as string);
      if (settings.voiceType === 'man' || settings.voiceType === 'woman') setAvatarVoiceType(settings.voiceType);
      setDescriptionAsPopup(!!settings.descriptionAsPopup);
    }
    if (lib.type === 'enteringText') {
      if (settings.title) setEnteringTextTitle(settings.title as string);
      if (Array.isArray(settings.fields) && (settings.fields as unknown[]).length > 0) {
        setEnteringTextFields((settings.fields as Array<Record<string, unknown>>).map((f) => ({
          statement: (f.statement as string) || '',
          placeholder: (f.placeholder as string) || (f.description as string) || '',
          rightAnswer: (f.rightAnswer as string) || '',
          keywordsBank: (f.keywordsBank as string) || '',
        })));
      }
      if (settings.submitButtonText) setEnteringTextSubmitButtonText(settings.submitButtonText as string);
      if (settings.returnButtonText) setEnteringTextReturnButtonText(settings.returnButtonText as string);
      if (typeof settings.maxAttempts === 'number') setEnteringTextMaxAttempts(String(settings.maxAttempts));
      if (settings.successTitle) setEnteringTextSuccessTitle(settings.successTitle as string);
      if (settings.successSubtitle) setEnteringTextSuccessSubtitle(settings.successSubtitle as string);
      if (settings.successMediaType) setEnteringTextSuccessMediaType(settings.successMediaType as 'image' | 'video');
      if (settings.successMediaUrl) setEnteringTextSuccessMediaUrl(settings.successMediaUrl as string);
      setEnteringTextLastStep(!!settings.lastStep);
      if (settings.solutionHint && typeof settings.solutionHint === 'object') {
        const sh = settings.solutionHint as Record<string, unknown>;
        setEnteringTextSolutionHintEnabled(!!sh.enabled);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const settings: Record<string, unknown> = {};
      const allowStationHint = !stationTypesWithoutHint.includes(stationType);
      if (allowStationHint && hintEnabled && (hintText.trim() || hintImageUrl.trim())) {
        settings.hint = { enabled: true, text: hintText.trim(), imageUrl: hintImageUrl.trim() || undefined, free: hintFree || undefined };
      }
      if (stationType === 'text') {
        settings.content = textContent.trim();
      }
      if (stationType === 'video' || stationType === 'image') {
        settings.mediaUrl = mediaUrl.trim();
        settings.descPosition = descPosition;
      }
      if (stationType === 'narrative') {
        settings.title = narrativeTitle.trim();
        settings.bodyText = narrativeBody.trim();
        if (narrativeButtonText.trim()) settings.buttonText = narrativeButtonText.trim();
        if (narrativeBgImage.trim()) settings.backgroundImage = narrativeBgImage.trim();
      }
      if (stationType === 'badge') {
        settings.title = badgeTitle.trim();
        settings.subtitle = badgeSubtitle.trim();
        settings.badgeImageUrl = badgeImageUrl.trim();
      }
      if (stationType === 'collage') {
        settings.header = collageHeader.trim();
        settings.description = collageDescription.trim();
        if (collageLogoUrl.trim()) settings.logoUrl = collageLogoUrl.trim();
        settings.missions = collageMissions
          .filter((m) => m.title.trim())
          .map((m) => ({
            title: m.title.trim(),
            description: m.description.trim(),
            ...(m.referenceImageUrl?.trim() ? { referenceImageUrl: m.referenceImageUrl.trim() } : {}),
          }));
        settings.multiSelect = collageMultiSelect;
        if (collageMultiSelect) {
          const n = parseInt(collageMultiSelectCount, 10);
          settings.multiSelectCount = Number.isFinite(n) && n > 0 ? n : 1;
        }
        settings.template = collageTemplate;
        const disc = collageDisclaimer.trim();
        if (disc) settings.disclaimer = disc;
      }
      if (stationType === 'feedback') {
        settings.title = feedbackTitle.trim();
        settings.introText = feedbackIntroText.trim();
        settings.questions = feedbackQuestions
          .filter((q) => q.text.trim())
          .map((q) => ({ text: q.text.trim() }));
        settings.notesEnabled = feedbackNotesEnabled;
        settings.notesPlaceholder = feedbackNotesPlaceholder.trim() || undefined;
      }
      if (stationType === 'riddle') {
        settings.clue = riddleClue.trim();
        settings.answer = riddleAnswer.trim();
        if (riddleMediaUrl.trim()) {
          settings.mediaUrl = riddleMediaUrl.trim();
          settings.mediaType = riddleMediaType;
        }
        const parsedScore = parseInt(riddleMaxScore, 10);
        settings.maxScore = isNaN(parsedScore) || parsedScore <= 0 ? 100 : parsedScore;
        if (riddleSuccessMsg.trim()) settings.successMessage = riddleSuccessMsg.trim();
        if (riddleFailureMsg.trim()) settings.failureMessage = riddleFailureMsg.trim();
        if (riddleContinueBtnText.trim()) settings.continueButtonText = riddleContinueBtnText.trim();
        if (riddleSuccessImageUrl.trim()) settings.successImageUrl = riddleSuccessImageUrl.trim();
        settings.unlimitedAttempts = riddleUnlimitedAttempts;
      }
      if (stationType === 'avatar') {
        settings.characterName = avatarCharacterName.trim();
        settings.characterImageUrl = avatarCharacterImageUrl.trim();
        settings.detectiveRiddle = avatarDetectiveRiddle.trim();
        settings.instructions = avatarInstructions.trim();
        settings.optionalAnswers = avatarOptionalAnswers.map((a) => a.trim()).filter(Boolean);
        settings.forbiddenPhrases = avatarForbiddenPhrases.map((p) => p.trim()).filter(Boolean);
        settings.videos = avatarVideos
          .filter((v) => v.url.trim())
          .map((v) => ({
            url: v.url.trim(),
            matchingWords: v.matchingWords.map((w) => w.trim()).filter(Boolean),
          }));
        settings.characters = avatarCharacters
          .map((c) => ({ name: c.name.trim(), description: c.description.trim() }))
          .filter((c) => c.name || c.description);
        settings.clues = avatarClues
          .map((c) => ({ name: c.name.trim(), description: c.description.trim() }))
          .filter((c) => c.name || c.description);
        settings.knowledgeGates = avatarKnowledgeGates
          .map((g) => ({ trigger: g.trigger.trim(), reveal: g.reveal.trim() }))
          .filter((g) => g.trigger && g.reveal);
        settings.hintStrategy = avatarHintStrategy.trim();
        settings.voiceType = avatarVoiceType;
        settings.descriptionAsPopup = descriptionAsPopup;
      }
      if (stationType === 'avatarQuiz') {
        // A question is only usable if all three judging inputs are present —
        // the server can't grade without an ideal answer, and the participant
        // must learn something even when they answer correctly.
        const filled = quizQuestions.filter(
          (q) => q.text.trim() || q.idealAnswer.trim() || q.teachingPoint.trim()
        );
        const invalid = quizQuestions
          .map((q, i) => ({ q, i }))
          .filter(({ q }) => q.text.trim() || q.idealAnswer.trim() || q.teachingPoint.trim())
          .filter(({ q }) => !q.text.trim() || !q.idealAnswer.trim() || !q.teachingPoint.trim())
          .map(({ i }) => i);
        if (invalid.length > 0) {
          setQuizInvalidRows(invalid);
          setError(t.quizErrorIncompleteQuestion);
          setLoading(false);
          return;
        }
        if (filled.length === 0) {
          setQuizInvalidRows([]);
          setError(t.quizErrorNoQuestions);
          setLoading(false);
          return;
        }
        setQuizInvalidRows([]);

        settings.characterName = quizCharacterName.trim();
        settings.characterImageUrl = quizCharacterImageUrl.trim();
        settings.voiceType = quizVoiceType;
        settings.descriptionAsPopup = descriptionAsPopup;
        if (quizTopic.trim()) settings.topic = quizTopic.trim();
        if (quizIntroText.trim()) settings.introText = quizIntroText.trim();
        if (quizOutroText.trim()) settings.outroText = quizOutroText.trim();
        if (quizPersonaInstructions.trim()) settings.personaInstructions = quizPersonaInstructions.trim();
        settings.strictness = quizStrictness;
        const parsedPoints = parseInt(quizPointsPerQuestion, 10);
        settings.pointsPerQuestion = Number.isFinite(parsedPoints) && parsedPoints > 0 ? parsedPoints : 10;
        const parsedCount = parseInt(quizQuestionCount, 10);
        settings.questionCount = Number.isFinite(parsedCount) && parsedCount > 0 ? parsedCount : 0;
        settings.shuffleQuestions = quizShuffleQuestions;
        settings.allowRetry = quizAllowRetry;
        settings.allowSkip = quizAllowSkip;
        settings.autoAdvance = quizAutoAdvance;
        const reactionVideos: Record<string, string> = {};
        if (quizVideoAsking.trim()) reactionVideos.asking = quizVideoAsking.trim();
        if (quizVideoCorrect.trim()) reactionVideos.correct = quizVideoCorrect.trim();
        if (quizVideoPartial.trim()) reactionVideos.partial = quizVideoPartial.trim();
        if (quizVideoIncorrect.trim()) reactionVideos.incorrect = quizVideoIncorrect.trim();
        if (Object.keys(reactionVideos).length > 0) settings.reactionVideos = reactionVideos;

        settings.questions = filled.map((q) => {
          const penalty = parseInt(q.hintPenalty, 10);
          const points = parseInt(q.points, 10);
          return {
            text: q.text.trim(),
            idealAnswer: q.idealAnswer.trim(),
            teachingPoint: q.teachingPoint.trim(),
            ...(q.acceptableKeywords.map((k) => k.trim()).filter(Boolean).length > 0
              ? { acceptableKeywords: q.acceptableKeywords.map((k) => k.trim()).filter(Boolean) }
              : {}),
            ...(q.commonWrongAnswers.filter((w) => w.text.trim()).length > 0
              ? {
                  commonWrongAnswers: q.commonWrongAnswers
                    .filter((w) => w.text.trim())
                    .map((w) => ({
                      text: w.text.trim(),
                      ...(w.rebuttal.trim() ? { rebuttal: w.rebuttal.trim() } : {}),
                    })),
                }
              : {}),
            ...(q.hintText.trim()
              ? {
                  hint: {
                    text: q.hintText.trim(),
                    ...(q.hintImageUrl.trim() ? { imageUrl: q.hintImageUrl.trim() } : {}),
                    penalty: Number.isFinite(penalty) && penalty >= 0 ? penalty : 2,
                  },
                }
              : {}),
            ...(q.mediaUrl.trim() ? { mediaUrl: q.mediaUrl.trim(), mediaType: q.mediaType } : {}),
            ...(Number.isFinite(points) && points > 0 ? { points } : {}),
            ...(q.learnMoreUrl.trim() ? { learnMoreUrl: q.learnMoreUrl.trim() } : {}),
          };
        });
      }
      if (stationType === 'enteringText') {
        settings.title = enteringTextTitle.trim();
        settings.fields = enteringTextFields
          .map((f) => ({ statement: f.statement.trim(), placeholder: f.placeholder.trim(), rightAnswer: f.rightAnswer.trim(), keywordsBank: f.keywordsBank.trim() }))
          .filter((f) => f.statement);
        settings.submitButtonText = enteringTextSubmitButtonText.trim() || undefined;
        settings.returnButtonText = enteringTextReturnButtonText.trim() || undefined;
        const parsedMaxAttempts = parseInt(enteringTextMaxAttempts, 10);
        settings.maxAttempts = isNaN(parsedMaxAttempts) || parsedMaxAttempts < 1 ? 3 : parsedMaxAttempts;
        if (enteringTextSuccessTitle.trim()) settings.successTitle = enteringTextSuccessTitle.trim();
        if (enteringTextSuccessSubtitle.trim()) settings.successSubtitle = enteringTextSuccessSubtitle.trim();
        if (enteringTextSuccessMediaType) settings.successMediaType = enteringTextSuccessMediaType;
        if (enteringTextSuccessMediaUrl.trim()) settings.successMediaUrl = enteringTextSuccessMediaUrl.trim();
        settings.lastStep = enteringTextLastStep;
        if (enteringTextSolutionHintEnabled) {
          settings.solutionHint = { enabled: true };
        }
        settings.showBackButton = enteringTextShowBackButton;
      }

      const payload = {
        name: name.trim(),
        type: stationType,
        description: description.trim(),
        customer: customer.trim(),
        theme: theme.trim(),
        tags,
        settings,
      };

      if (id) {
        await adminApiFetch(`/api/admin/stations/${id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await adminApiFetch('/api/admin/stations', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      navigate('/admin/dashboard?tab=stations');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  const stationNames: Record<string, string> = {
    text: 'תחנת טקסט - טסט',
    video: 'תחנת וידאו - טסט',
    image: 'תחנת תמונה - טסט',
    collage: 'תחנת קולאז׳ - טסט',
    feedback: 'תחנת משוב - טסט',
    riddle: 'תחנת חידה - טסט',
    avatar: 'תחנת אוואטר - טסט',
    avatarQuiz: 'תחנת אוואטר מנחה - טסט',
    enteringText: 'תחנת מילוי טקסט - טסט',
  };

  /** The information-security bank from the spec — a realistic starting point. */
  const infoSecurityQuizQuestions = (): AvatarQuizQuestionConfig[] => [
    {
      ...emptyQuizQuestion(),
      text: 'קיבלת מייל עם לינק ממישהו שאת/ה לא מכיר/ה. מה את/ה עושה?',
      idealAnswer: 'לא לוחצים על הלינק. בודקים את כתובת השולח המלאה, מרחפים מעל הקישור כדי לראות לאן הוא באמת מוביל, ואם יש ספק - מדווחים לצוות אבטחת המידע ומוחקים.',
      teachingPoint: 'לינק ממקור לא מוכר לא נפתח, גם לא "רק כדי לבדוק". לחיצה אחת מספיקה כדי להריץ קוד או לגנוב פרטי התחברות. הכלל: לא לוחצים, בודקים שולח, מדווחים.',
      acceptableKeywords: ['לא לוחץ', 'לא פותח', 'מדווח', 'מוחק', 'בודק את השולח', 'IT', 'אבטחת מידע'],
      commonWrongAnswers: [
        { text: 'פותח לראות מה יש שם', rebuttal: 'זה בדיוק מה שהתוקף מקווה שתעשה/י.' },
        { text: 'פותח מהטלפון כי זה בטוח יותר', rebuttal: 'גם טלפון נדבק - ובדרך כלל אין עליו הגנות ארגוניות.' },
      ],
      points: '10',
    },
    {
      ...emptyQuizQuestion(),
      text: 'מתקשר אלייך מישהו שמציג את עצמו כטכנאי מה-IT ומבקש את הסיסמה כדי "לתקן תקלה". מה את/ה עושה?',
      idealAnswer: 'לא מוסרים סיסמה בטלפון לאף אחד, גם לא ל-IT. מנתקים, מתקשרים למספר הרשמי של ה-IT ומוודאים שהפנייה אמיתית.',
      teachingPoint: 'צוות IT לעולם לא יבקש ממך סיסמה. כל בקשה כזו היא הנדסה חברתית עד שהוכח אחרת - מנתקים ומאמתים בערוץ עצמאי.',
      acceptableKeywords: ['לא מוסר סיסמה', 'מנתק', 'מאמת', 'מתקשר בחזרה', 'מדווח'],
      commonWrongAnswers: [
        { text: 'נותן את הסיסמה כי זה מה-IT', rebuttal: 'אף טכנאי אמיתי לא יבקש את זה.' },
      ],
      points: '10',
    },
    {
      ...emptyQuizQuestion(),
      text: 'מצאת דיסק-און-קי בחניון של המשרד. מה את/ה עושה איתו?',
      idealAnswer: 'לא מחברים אותו לשום מחשב. מוסרים אותו לצוות אבטחת המידע.',
      teachingPoint: 'דיסק-און-קי נטוש הוא וקטור תקיפה מוכר - מספיק לחבר אותו כדי להדביק את התחנה. מוסרים לאבטחת מידע, לא מחברים.',
      acceptableKeywords: ['לא מחבר', 'מוסר', 'אבטחת מידע', 'לא תוקע'],
      commonWrongAnswers: [],
      points: '10',
    },
  ];

  const handleFillRandom = () => {
    const ts = Date.now().toString().slice(-4);
    const types: StationTypeOption[] = [...creatableTypes];
    const randomType = types[Math.floor(Math.random() * types.length)];
    setStationType(randomType);
    setName(`${stationNames[randomType]} #${ts}`);
    setDescription('תחנה לבדיקה');
    setCustomer('לקוח טסט');
    setTheme('נושא טסט');
    const supportsHint = !stationTypesWithoutHint.includes(randomType);
    setHintEnabled(supportsHint);
    setHintText(supportsHint ? 'זהו רמז לדוגמה' : '');
    setHintImageUrl('');
    setHintFree(false);
    setTextContent('');
    setMediaUrl('');
    setCollageHeader('');
    setCollageDescription('');
    setCollageMissions([{ title: '', description: '' }]);
    setCollageMultiSelect(false);
    setCollageMultiSelectCount('6');
    setCollageTemplate('default');
    setFeedbackTitle('');
    setFeedbackIntroText('');
    setFeedbackQuestions([{ text: '' }]);
    setFeedbackNotesEnabled(true);
    setFeedbackNotesPlaceholder('');
    setRiddleClue('');
    setRiddleAnswer('');
    setRiddleMediaUrl('');
    setRiddleMediaType('image');
    setRiddleMaxScore('100');
    setRiddleSuccessMsg('');
    setRiddleFailureMsg('');
    setRiddleUnlimitedAttempts(false);
    setAvatarCharacterName('');
    setAvatarCharacterImageUrl('');
    setAvatarDetectiveRiddle('');
    setAvatarInstructions('');
    setAvatarOptionalAnswers([]);
    setAvatarForbiddenPhrases([]);
    setAvatarVideos([]);
    setAvatarVoiceType('man');
    setDescriptionAsPopup(false);
    setQuizCharacterName('');
    setQuizTopic('');
    setQuizIntroText('');
    setQuizOutroText('');
    setQuizPersonaInstructions('');
    setQuizQuestions([emptyQuizQuestion()]);
    setQuizInvalidRows([]);
    setEnteringTextTitle('');
    setEnteringTextFields([{ statement: '', placeholder: '', rightAnswer: '', keywordsBank: '' }]);
    setEnteringTextSubmitButtonText('');
    setEnteringTextReturnButtonText('');
    setEnteringTextMaxAttempts('3');
    setEnteringTextSuccessTitle('');
    setEnteringTextSuccessSubtitle('');
    setEnteringTextSuccessMediaType('');
    setEnteringTextSuccessMediaUrl('');
    setEnteringTextLastStep(false);
    if (randomType === 'text') {
      setTextContent('זהו תוכן טקסט לדוגמה עבור תחנת בדיקה. כאן יופיע המידע שהמשתתף צריך לקרוא.');
    } else if (randomType === 'video') {
      setMediaUrl('https://www.w3schools.com/html/mov_bbb.mp4');
    } else if (randomType === 'image') {
      setMediaUrl('https://picsum.photos/800/600');
    } else if (randomType === 'collage') {
      setCollageHeader('בואו ניצור יחד קולאז׳ חי');
      setCollageDescription('קחו בין תמונה אחת לשלוש לפי ההנחיות. אנחנו מחפשים רגעים אמיתיים.');
      setCollageMissions([
        { title: 'מעגל הצוות', description: 'צלמו את כל הצוות עומד במעגל ומביט אל המרכז.' },
        { title: 'אביזר מצחיק', description: 'צלמו תמונה עם חפץ אקראי ומצחיק שמצאתם בחדר.' },
        { title: 'קרני אצבעות', description: 'צרו זוגות ועשו עם האצבעות "קרניים" אחד אל השני עם חיוך.' },
      ]);
    } else if (randomType === 'feedback') {
      setFeedbackTitle('משוב על ההרצאה');
      setFeedbackIntroText('נשמח לשמוע את דעתכם על ההרצאה. דרגו כל שאלה בסולם 1-6.');
      setFeedbackQuestions([
        { text: 'באיזו מידה אתה שבע רצון מההרצאה (1-6)' },
        { text: 'באיזו מידה את/ה מעריך/ה כי תוכל/י ליישם חלק מהתוכן שהועבר בהרצאה' },
        { text: 'באיזו מידה ההרצאה תרמה לך מבחינה מקצועית' },
        { text: 'באיזו מידה המרצה הצליח/ה להעביר את התוכן בצורה ברורה' },
        { text: 'באיזו מידה הדוגמאות שהובאו היו רלוונטיות' },
        { text: 'באיזו מידה היית ממליץ/ה על ההרצאה לעמית/ה' },
      ]);
      setFeedbackNotesEnabled(true);
      setFeedbackNotesPlaceholder('עוד הערות?');
    } else if (randomType === 'riddle') {
      setRiddleClue('אני יש לי ידיים אבל אין לי אצבעות. אני מראה לך את הזמן. מה אני?');
      setRiddleAnswer('שעון');
      setRiddleMaxScore('100');
      setRiddleSuccessMsg('כל הכבוד! ניחשת נכון!');
      setRiddleFailureMsg('לא הצלחת הפעם. התשובה הייתה: שעון');
    } else if (randomType === 'avatar') {
      setAvatarCharacterName('הבלש קולומבו');
      setAvatarDetectiveRiddle('מי גנב את תכשיטי הכתר מהארמון בליל ההצגה?');
      setAvatarInstructions('שאלו את הדמות שאלות כדי לפתור את החידה. היא תענה לכם ברמזים.');
      setAvatarOptionalAnswers(['המשרת', 'הטבח', 'הגננת']);
      setAvatarForbiddenPhrases(['אני לא יודע', 'אין לי מושג']);
      setAvatarVideos([]);
    } else if (randomType === 'avatarQuiz') {
      setQuizCharacterName('רונה מאבטחת המידע');
      setQuizVoiceType('woman');
      setQuizTopic('אבטחת מידע ארגונית');
      setQuizIntroText('היי, אני רונה מצוות אבטחת המידע. אני הולכת לזרוק עלייך כמה מצבים מהחיים - תענה/י מה היית עושה, ואני אגיד לך אם זה מה שהיה מציל אותנו.');
      setQuizOutroText('יפה. עכשיו בוא/י נראה איך זה נראה כשזה קורה באמת.');
      setQuizPersonaInstructions('דברי בגובה העיניים, בלי ז׳רגון טכני. אל תביכי את מי שטעה.');
      setQuizStrictness('balanced');
      setQuizPointsPerQuestion('10');
      setQuizAllowRetry(false);
      setQuizAllowSkip(false);
      setQuizShuffleQuestions(false);
      setQuizQuestions(infoSecurityQuizQuestions());
    } else if (randomType === 'enteringText') {
      setEnteringTextTitle('טופס פרטים קצרים');
      setEnteringTextFields([
        { statement: 'הרוצח:', placeholder: 'הזינו תשובה', rightAnswer: '', keywordsBank: '' },
        { statement: 'כלי הרצח:', placeholder: 'הזינו תשובה', rightAnswer: '', keywordsBank: '' },
      ]);
      setEnteringTextSubmitButtonText('שליחה');
      setEnteringTextReturnButtonText('ניקוי');
      setEnteringTextMaxAttempts('3');
    }
  };

  if (initialLoading) return null;

  const showHintSection = !stationTypesWithoutHint.includes(stationType);

  return (
    <AdminPage>
      <AdminHeader>
        <img src="/images/logo-purple.png" alt="Yooz" style={{ height: 32 }} />
        <SmallOutlineButton onClick={() => navigate('/admin/dashboard?tab=stations')}>{t.back}</SmallOutlineButton>
      </AdminHeader>
      <AdminContent>
        <AdminCardWide>
          <PageTopRow>
            <PageTitle style={{ marginBottom: 0 }}>{t.title}</PageTitle>
            {!id && <RandomButton type="button" onClick={handleFillRandom}>🎲 Random</RandomButton>}
          </PageTopRow>
          <Form onSubmit={handleSubmit}>
            <DesktopFormGrid>
              <FormSectionCard>
                <Input
                  placeholder={t.stationName}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                <div>
                  <SectionLabel>{t.stationType}</SectionLabel>
                  <StationTypeGroup>
                    <SelectionButton type="button" selected={stationType === 'text'} onClick={() => setStationType('text')}>
                      <div>{t.typeText}</div>
                      <SelectionSubtextSmall>{t.typeTextDesc}</SelectionSubtextSmall>
                    </SelectionButton>
                    <SelectionButton type="button" selected={stationType === 'video'} onClick={() => setStationType('video')}>
                      <div>{t.typeVideo}</div>
                      <SelectionSubtextSmall>{t.typeVideoDesc}</SelectionSubtextSmall>
                    </SelectionButton>
                    <SelectionButton type="button" selected={stationType === 'image'} onClick={() => setStationType('image')}>
                      <div>{t.typeImage}</div>
                      <SelectionSubtextSmall>{t.typeImageDesc}</SelectionSubtextSmall>
                    </SelectionButton>
                    {(stationType === 'narrative' || stationType === 'badge') && (
                      <SelectionButton type="button" selected disabled style={{ opacity: 0.85, cursor: 'default' }}>
                        <div>{stationType === 'narrative' ? t.typeNarrative : t.typeBadge}</div>
                        <SelectionSubtextSmall>{t.legacyStationType}</SelectionSubtextSmall>
                      </SelectionButton>
                    )}
                    <SelectionButton type="button" selected={stationType === 'collage'} onClick={() => setStationType('collage')}>
                      <div>{t.typeCollage}</div>
                      <SelectionSubtextSmall>{t.typeCollageDesc}</SelectionSubtextSmall>
                    </SelectionButton>
                    <SelectionButton type="button" selected={stationType === 'feedback'} onClick={() => setStationType('feedback')}>
                      <div>{t.typeFeedback}</div>
                      <SelectionSubtextSmall>{t.typeFeedbackDesc}</SelectionSubtextSmall>
                    </SelectionButton>
                    <SelectionButton type="button" selected={stationType === 'riddle'} onClick={() => setStationType('riddle')}>
                      <div>{t.typeRiddle}</div>
                      <SelectionSubtextSmall>{t.typeRiddleDesc}</SelectionSubtextSmall>
                    </SelectionButton>
                    <SelectionButton type="button" selected={stationType === 'avatar'} onClick={() => setStationType('avatar')}>
                      <div>{t.typeAvatar}</div>
                      <SelectionSubtextSmall>{t.typeAvatarDesc}</SelectionSubtextSmall>
                    </SelectionButton>
                    <SelectionButton type="button" selected={stationType === 'avatarQuiz'} onClick={() => setStationType('avatarQuiz')}>
                      <div>{t.typeAvatarQuiz}</div>
                      <SelectionSubtextSmall>{t.typeAvatarQuizDesc}</SelectionSubtextSmall>
                    </SelectionButton>
                    <SelectionButton type="button" selected={stationType === 'enteringText'} onClick={() => setStationType('enteringText')}>
                      <div>{t.typeEnteringText}</div>
                      <SelectionSubtextSmall>{t.typeEnteringTextDesc}</SelectionSubtextSmall>
                    </SelectionButton>
                  </StationTypeGroup>
                </div>
                <Input
                  placeholder={t.description}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
                {(stationType === 'avatar' || stationType === 'avatarQuiz') && (
                  <div>
                    <HintToggleRow>
                      <SectionLabelNoMargin>{t.avatarDescriptionAsPopup}</SectionLabelNoMargin>
                      <ToggleButton
                        type="button"
                        selected={descriptionAsPopup}
                        onClick={() => setDescriptionAsPopup((v) => !v)}
                      >
                        {descriptionAsPopup ? 'ON' : 'OFF'}
                      </ToggleButton>
                    </HintToggleRow>
                    <SectionDescription>{t.avatarDescriptionAsPopupHelp}</SectionDescription>
                  </div>
                )}
                <Input
                  placeholder={t.customer}
                  value={customer}
                  onChange={(e) => setCustomer(e.target.value)}
                />
                <Input
                  placeholder={t.theme}
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                />
                <div>
                  <SectionLabel>{t.tags || 'Tags'}</SectionLabel>
                  <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8 }}>
                    {tags.map((tag, i) => (
                      <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', fontSize: 12, fontWeight: 600, borderRadius: 20, background: '#f0eefa', color: '#6c5ce7' }}>
                        {tag}
                        <span style={{ cursor: 'pointer', marginInlineStart: 2 }} onClick={() => setTags(tags.filter((_, j) => j !== i))}>×</span>
                      </span>
                    ))}
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <Input
                      placeholder={t.addTag || 'Add tag...'}
                      value={tagInput}
                      onChange={(e) => setTagInput(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const v = tagInput.trim();
                          if (v && !tags.includes(v)) setTags([...tags, v]);
                          setTagInput('');
                        }
                      }}
                      style={{ flex: 1 }}
                    />
                  </div>
                </div>
              </FormSectionCard>

              {showHintSection && (
                <FormSectionCard>
                  <div>
                    <HintToggleRow>
                      <SectionLabelNoMargin>{t.hintLabel}</SectionLabelNoMargin>
                      <ToggleButton
                        type="button"
                        selected={hintEnabled}
                        onClick={() => setHintEnabled((v) => !v)}
                      >
                        {hintEnabled ? 'ON' : 'OFF'}
                      </ToggleButton>
                    </HintToggleRow>
                    {hintEnabled && (
                      <VerticalStack>
                        <Input
                          placeholder={t.hintPlaceholder}
                          value={hintText}
                          onChange={(e) => setHintText(e.target.value)}
                        />
                        <SectionLabelNoMargin>{t.hintImageLabel}</SectionLabelNoMargin>
                        <InlineRow>
                          <FileUploadButton
                            accept="image/*"
                            onUploaded={(url) => setHintImageUrl(url)}
                            label={t.upload}
                            uploadingLabel={t.uploading}
                          />
                          <FlexInput
                            placeholder={t.hintImagePlaceholder}
                            value={hintImageUrl}
                            onChange={(e) => setHintImageUrl(e.target.value)}
                          />
                        </InlineRow>
                        {hintImageUrl && (
                          <div>
                            <img
                              src={hintImageUrl}
                              alt=""
                              style={{ maxHeight: 120, maxWidth: '100%', borderRadius: 8, display: 'block' }}
                            />
                            <SmallOutlineButton
                              type="button"
                              onClick={() => setHintImageUrl('')}
                              style={{ marginTop: 8 }}
                            >
                              {t.removeHintImage}
                            </SmallOutlineButton>
                          </div>
                        )}
                        <HintToggleRow>
                          <SectionLabelNoMargin>{t.hintFreeLabel}</SectionLabelNoMargin>
                          <ToggleButton
                            type="button"
                            selected={hintFree}
                            onClick={() => setHintFree((v) => !v)}
                          >
                            {hintFree ? 'ON' : 'OFF'}
                          </ToggleButton>
                        </HintToggleRow>
                      </VerticalStack>
                    )}
                  </div>
                </FormSectionCard>
              )}
            </DesktopFormGrid>

            {/* Type-specific settings */}
            <FormSectionCardWide>
              {stationType === 'text' && (
                <div>
                  <SectionLabel>{t.textContent}</SectionLabel>
                  <Input
                    placeholder={t.textContent}
                    value={textContent}
                    onChange={(e) => setTextContent(e.target.value)}
                  />
                </div>
              )}

              {stationType === 'video' && (
                <VerticalStack>
                  <SectionLabelNoMargin>{t.mediaUrl}</SectionLabelNoMargin>
                  <InlineRow>
                    <FileUploadButton
                      accept="video/*"
                      onUploaded={(url) => setMediaUrl(url)}
                      label={t.upload}
                      uploadingLabel={t.uploading}
                    />
                    <FlexInput
                      placeholder={t.mediaUrl}
                      value={mediaUrl}
                      onChange={(e) => setMediaUrl(e.target.value)}
                    />
                  </InlineRow>
                  <SectionLabelNoMargin>{t.descPosition}</SectionLabelNoMargin>
                  <SelectionGroup>
                    <SelectionButton type="button" selected={descPosition === 'before'} onClick={() => setDescPosition('before')}>{t.descBefore}</SelectionButton>
                    <SelectionButton type="button" selected={descPosition === 'after'} onClick={() => setDescPosition('after')}>{t.descAfter}</SelectionButton>
                  </SelectionGroup>
                </VerticalStack>
              )}

              {stationType === 'image' && (
                <VerticalStack>
                  <SectionLabelNoMargin>{t.mediaUrl}</SectionLabelNoMargin>
                  <InlineRow>
                    <FileUploadButton
                      accept="image/*"
                      onUploaded={(url) => setMediaUrl(url)}
                      label={t.upload}
                      uploadingLabel={t.uploading}
                    />
                    <FlexInput
                      placeholder={t.mediaUrl}
                      value={mediaUrl}
                      onChange={(e) => setMediaUrl(e.target.value)}
                    />
                  </InlineRow>
                  <SectionLabelNoMargin>{t.descPosition}</SectionLabelNoMargin>
                  <SelectionGroup>
                    <SelectionButton type="button" selected={descPosition === 'before'} onClick={() => setDescPosition('before')}>{t.descBefore}</SelectionButton>
                    <SelectionButton type="button" selected={descPosition === 'after'} onClick={() => setDescPosition('after')}>{t.descAfter}</SelectionButton>
                  </SelectionGroup>
                </VerticalStack>
              )}

              {stationType === 'narrative' && (
                <VerticalStack>
                  <SectionLabelNoMargin>{t.narrativeTitle}</SectionLabelNoMargin>
                  <Input
                    placeholder={t.narrativeTitle}
                    value={narrativeTitle}
                    onChange={(e) => setNarrativeTitle(e.target.value)}
                  />
                  <SectionLabelNoMargin>{t.narrativeBody}</SectionLabelNoMargin>
                  <Input
                    placeholder={t.narrativeBody}
                    value={narrativeBody}
                    onChange={(e) => setNarrativeBody(e.target.value)}
                  />
                  <SectionLabelNoMargin>{t.narrativeButton}</SectionLabelNoMargin>
                  <Input
                    placeholder={t.narrativeButton}
                    value={narrativeButtonText}
                    onChange={(e) => setNarrativeButtonText(e.target.value)}
                  />
                  <SectionLabelNoMargin>{t.narrativeBgImage}</SectionLabelNoMargin>
                  <InlineRow>
                    <FileUploadButton
                      accept="image/*"
                      onUploaded={(url) => setNarrativeBgImage(url)}
                      label={t.upload}
                      uploadingLabel={t.uploading}
                    />
                    <FlexInput
                      placeholder={t.narrativeBgImage}
                      value={narrativeBgImage}
                      onChange={(e) => setNarrativeBgImage(e.target.value)}
                    />
                  </InlineRow>
                </VerticalStack>
              )}

              {stationType === 'badge' && (
                <VerticalStack>
                  <SectionLabelNoMargin>{t.badgeStationTitle}</SectionLabelNoMargin>
                  <Input
                    placeholder={t.badgeStationTitle}
                    value={badgeTitle}
                    onChange={(e) => setBadgeTitle(e.target.value)}
                  />
                  <SectionLabelNoMargin>{t.badgeSubtitle}</SectionLabelNoMargin>
                  <Input
                    placeholder={t.badgeSubtitle}
                    value={badgeSubtitle}
                    onChange={(e) => setBadgeSubtitle(e.target.value)}
                  />
                  <SectionLabelNoMargin>{t.badgeImage}</SectionLabelNoMargin>
                  <InlineRow>
                    <FileUploadButton
                      accept="image/*"
                      onUploaded={(url) => setBadgeImageUrl(url)}
                      label={t.upload}
                      uploadingLabel={t.uploading}
                    />
                    <FlexInput
                      placeholder={t.badgeImage}
                      value={badgeImageUrl}
                      onChange={(e) => setBadgeImageUrl(e.target.value)}
                    />
                  </InlineRow>
                </VerticalStack>
              )}

              {stationType === 'collage' && (
                <VerticalStack>
                  <SectionLabelNoMargin>{t.collageHeader}</SectionLabelNoMargin>
                  <Input
                    placeholder={t.collageHeaderPlaceholder}
                    value={collageHeader}
                    onChange={(e) => setCollageHeader(e.target.value)}
                  />
                  <SectionLabelNoMargin>{t.collageDescription}</SectionLabelNoMargin>
                  <Input
                    placeholder={t.collageDescriptionPlaceholder}
                    value={collageDescription}
                    onChange={(e) => setCollageDescription(e.target.value)}
                  />

                  <SectionLabelNoMargin>{t.collageDisclaimer}</SectionLabelNoMargin>
                  <Input
                    placeholder={t.collageDisclaimerPlaceholder}
                    value={collageDisclaimer}
                    onChange={(e) => setCollageDisclaimer(e.target.value)}
                  />

                  <SectionLabelNoMargin>{t.collageTemplate}</SectionLabelNoMargin>
                  <SelectionGroup>
                    <SelectionButton
                      type="button"
                      selected={collageTemplate === 'default'}
                      onClick={() => setCollageTemplate('default')}
                    >
                      {t.collageTemplateDefault}
                    </SelectionButton>
                    <SelectionButton
                      type="button"
                      selected={collageTemplate === 'gan-yehoshua'}
                      onClick={() => setCollageTemplate('gan-yehoshua')}
                    >
                      {t.collageTemplateGanYehoshua}
                    </SelectionButton>
                  </SelectionGroup>

                  <SectionLabelNoMargin>{t.collageLogo}</SectionLabelNoMargin>
                  <div style={{ fontSize: 12, color: '#888', marginTop: -4, marginBottom: 4 }}>{t.collageLogoDesc}</div>
                  <InlineRow>
                    <FileUploadButton
                      accept="image/*"
                      onUploaded={(url) => setCollageLogoUrl(url)}
                      label={t.upload}
                      uploadingLabel={t.uploading}
                    />
                    <FlexInput
                      placeholder="https://..."
                      value={collageLogoUrl}
                      onChange={(e) => setCollageLogoUrl(e.target.value)}
                    />
                  </InlineRow>

                  <HintToggleRow>
                    <SectionLabelNoMargin>{t.collageMultiSelect}</SectionLabelNoMargin>
                    <ToggleButton
                      type="button"
                      selected={collageMultiSelect}
                      onClick={() => setCollageMultiSelect((v) => !v)}
                    >
                      {collageMultiSelect ? 'ON' : 'OFF'}
                    </ToggleButton>
                  </HintToggleRow>
                  <div style={{ fontSize: 12, color: '#888', marginTop: -4, marginBottom: 4 }}>{t.collageMultiSelectHelper}</div>
                  {collageMultiSelect && (
                    <>
                      <SectionLabelNoMargin>{t.collageMultiSelectCount}</SectionLabelNoMargin>
                      <Input
                        type="number"
                        min={1}
                        value={collageMultiSelectCount}
                        onChange={(e) => setCollageMultiSelectCount(e.target.value)}
                      />
                    </>
                  )}

                  {!collageMultiSelect && (<>
                  <SectionLabelNoMargin>{t.collageMissions}</SectionLabelNoMargin>
                  {collageMissions.map((mission, idx) => (
                    <div key={idx} style={{ background: '#ffffff', border: '1px solid #e6e6f0', borderRadius: 10, padding: '12px', marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <SectionLabelNoMargin style={{ margin: 0 }}>
                          {t.collageMissionNum} {idx + 1}
                        </SectionLabelNoMargin>
                        {collageMissions.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setCollageMissions((ms) => ms.filter((_, i) => i !== idx))}
                            style={{ background: 'none', border: 'none', color: '#c0392b', fontWeight: 600, cursor: 'pointer', fontSize: 13, padding: '2px 6px' }}
                          >
                            {t.collageMissionRemove}
                          </button>
                        )}
                      </div>
                      <Input
                        placeholder={t.collageMissionTitle}
                        value={mission.title}
                        onChange={(e) => setCollageMissions((ms) => ms.map((m, i) => i === idx ? { ...m, title: e.target.value } : m))}
                        style={{ marginBottom: 8 }}
                      />
                      <Input
                        placeholder={t.collageMissionDesc}
                        value={mission.description}
                        onChange={(e) => setCollageMissions((ms) => ms.map((m, i) => i === idx ? { ...m, description: e.target.value } : m))}
                        style={{ marginBottom: 8 }}
                      />
                      <InlineRow>
                        <FileUploadButton
                          accept="image/*"
                          onUploaded={(url) => setCollageMissions((ms) => ms.map((m, i) => i === idx ? { ...m, referenceImageUrl: url } : m))}
                          label={t.upload}
                          uploadingLabel={t.uploading}
                        />
                        <FlexInput
                          placeholder={t.collageMissionRefImage}
                          value={mission.referenceImageUrl || ''}
                          onChange={(e) => setCollageMissions((ms) => ms.map((m, i) => i === idx ? { ...m, referenceImageUrl: e.target.value } : m))}
                        />
                      </InlineRow>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setCollageMissions((ms) => [...ms, { title: '', description: '' }])}
                    style={{ background: '#eef0ff', border: '1px solid #c7ccf7', borderRadius: 8, color: '#4338ca', fontWeight: 600, fontSize: 13, padding: '8px 16px', cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    + {t.collageMissionAdd}
                  </button>
                  </>)}
                </VerticalStack>
              )}

              {/* Feedback config */}
              {stationType === 'feedback' && (
                <VerticalStack>
                  <SectionLabel>{t.feedbackTitle}</SectionLabel>
                  <Input
                    placeholder={t.feedbackTitlePlaceholder}
                    value={feedbackTitle}
                    onChange={(e) => setFeedbackTitle(e.target.value)}
                  />
                  <Input
                    placeholder={t.feedbackIntroPlaceholder}
                    value={feedbackIntroText}
                    onChange={(e) => setFeedbackIntroText(e.target.value)}
                  />

                  <SectionLabel>{t.feedbackQuestions}</SectionLabel>
                  {feedbackQuestions.map((q, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#999', minWidth: 24 }}>{t.feedbackQuestionNum} {i + 1}</span>
                      <Input
                        placeholder={t.feedbackQuestionText}
                        value={q.text}
                        onChange={(e) => {
                          const updated = [...feedbackQuestions];
                          updated[i] = { text: e.target.value };
                          setFeedbackQuestions(updated);
                        }}
                        style={{ flex: 1 }}
                      />
                      {feedbackQuestions.length > 1 && (
                        <SmallOutlineButton
                          type="button"
                          onClick={() => setFeedbackQuestions(feedbackQuestions.filter((_, j) => j !== i))}
                        >
                          {t.feedbackQuestionRemove}
                        </SmallOutlineButton>
                      )}
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setFeedbackQuestions((qs) => [...qs, { text: '' }])}
                    style={{ background: '#6c5ce7', border: '1px solid #6c5ce7', borderRadius: 8, color: '#fff', fontSize: 13, fontWeight: 600, padding: '10px 20px', cursor: 'pointer', fontFamily: 'inherit', transition: 'opacity 0.15s' }}
                  >
                    + {t.feedbackQuestionAdd}
                  </button>

                  <SectionLabel style={{ marginTop: 16 }}>{t.feedbackNotesEnabled}</SectionLabel>
                  <InlineRowGap12>
                    <ToggleButton
                      type="button"
                      selected={feedbackNotesEnabled}
                      onClick={() => setFeedbackNotesEnabled((v) => !v)}
                    >
                      {feedbackNotesEnabled ? 'ON' : 'OFF'}
                    </ToggleButton>
                  </InlineRowGap12>
                  {feedbackNotesEnabled && (
                    <Input
                      placeholder={t.feedbackNotesPlaceholderDefault}
                      value={feedbackNotesPlaceholder}
                      onChange={(e) => setFeedbackNotesPlaceholder(e.target.value)}
                    />
                  )}
                </VerticalStack>
              )}
              {/* Riddle config */}
              {stationType === 'riddle' && (
                <VerticalStack>
                  <SectionLabel>{t.riddleClue}</SectionLabel>
                  <Input
                    placeholder={t.riddleCluePlaceholder}
                    value={riddleClue}
                    onChange={(e) => setRiddleClue(e.target.value)}
                  />

                  <SectionLabel>{t.riddleAnswer}</SectionLabel>
                  <Input
                    placeholder={t.riddleAnswerPlaceholder}
                    value={riddleAnswer}
                    onChange={(e) => setRiddleAnswer(e.target.value)}
                  />
                  <span style={{ fontSize: 12, color: '#999', marginTop: -8 }}>{t.riddleAnswerHint}</span>

                  {riddleAnswer.trim() && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, padding: '10px 0', direction: /[\u0590-\u05FF]/.test(riddleAnswer) ? 'rtl' : 'ltr' }}>
                      {riddleAnswer.trim().split(' ').map((word, wi) => (
                        <div key={wi} style={{ display: 'flex', gap: 4 }}>
                          {word.split('').map((ch, ci) => (
                            <div key={ci} style={{ width: 30, height: 36, border: '2px solid #6c5ce7', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16, fontWeight: 700, background: '#f0eefa', color: '#6c5ce7' }}>
                              {ch}
                            </div>
                          ))}
                        </div>
                      ))}
                    </div>
                  )}

                  <SectionLabel>{t.riddleMaxScore}</SectionLabel>
                  <Input
                    type="number"
                    placeholder={t.riddleMaxScorePlaceholder}
                    value={riddleMaxScore}
                    onChange={(e) => setRiddleMaxScore(e.target.value)}
                    style={{ maxWidth: 120 }}
                  />

                  <SectionLabel>{t.riddleAttempts}</SectionLabel>
                  <SelectionGroup>
                    <SelectionButton type="button" selected={!riddleUnlimitedAttempts} onClick={() => setRiddleUnlimitedAttempts(false)}>{t.riddleAttemptsLimited}</SelectionButton>
                    <SelectionButton type="button" selected={riddleUnlimitedAttempts} onClick={() => setRiddleUnlimitedAttempts(true)}>{t.riddleAttemptsUnlimited}</SelectionButton>
                  </SelectionGroup>
                  <span style={{ fontSize: 12, color: '#999', marginTop: -8 }}>{t.riddleAttemptsHint}</span>

                  <SectionLabel>{t.riddleMedia}</SectionLabel>
                  <SelectionGroup>
                    <SelectionButton type="button" selected={riddleMediaType === 'image'} onClick={() => setRiddleMediaType('image')}>{t.riddleMediaTypeImage}</SelectionButton>
                    <SelectionButton type="button" selected={riddleMediaType === 'video'} onClick={() => setRiddleMediaType('video')}>{t.riddleMediaTypeVideo}</SelectionButton>
                  </SelectionGroup>
                  <InlineRow>
                    <FileUploadButton
                      accept={riddleMediaType === 'image' ? 'image/*' : 'video/*'}
                      onUploaded={(url) => setRiddleMediaUrl(url)}
                      label={t.upload}
                      uploadingLabel={t.uploading}
                    />
                    <FlexInput
                      placeholder={t.mediaUrl}
                      value={riddleMediaUrl}
                      onChange={(e) => setRiddleMediaUrl(e.target.value)}
                    />
                  </InlineRow>

                  <SectionLabel>{t.riddleSuccessMsg}</SectionLabel>
                  <Input
                    placeholder={t.riddleSuccessMsgPlaceholder}
                    value={riddleSuccessMsg}
                    onChange={(e) => setRiddleSuccessMsg(e.target.value)}
                  />

                  <SectionLabel>{t.riddleFailureMsg}</SectionLabel>
                  <Input
                    placeholder={t.riddleFailureMsgPlaceholder}
                    value={riddleFailureMsg}
                    onChange={(e) => setRiddleFailureMsg(e.target.value)}
                  />

                  <SectionLabel>{t.riddleContinueBtnText}</SectionLabel>
                  <Input
                    placeholder={t.riddleContinueBtnTextPlaceholder}
                    value={riddleContinueBtnText}
                    onChange={(e) => setRiddleContinueBtnText(e.target.value)}
                  />

                  <SectionLabel>{t.riddleSuccessImage}</SectionLabel>
                  <InlineRow>
                    <FileUploadButton
                      accept="image/*"
                      onUploaded={(url) => setRiddleSuccessImageUrl(url)}
                      label={t.upload}
                      uploadingLabel={t.uploading}
                    />
                    <FlexInput
                      placeholder={t.riddleSuccessImagePlaceholder}
                      value={riddleSuccessImageUrl}
                      onChange={(e) => setRiddleSuccessImageUrl(e.target.value)}
                    />
                  </InlineRow>
                  {riddleSuccessImageUrl.trim() && (
                    <img
                      src={riddleSuccessImageUrl.trim()}
                      alt=""
                      style={{ maxWidth: 240, maxHeight: 160, objectFit: 'contain', borderRadius: 8, border: '1px solid #eee' }}
                    />
                  )}
                </VerticalStack>
              )}
              {/* Avatar config */}
              {stationType === 'avatar' && (
                <VerticalStack>
                  <SectionLabel>{t.avatarCharacterName}</SectionLabel>
                  <Input
                    placeholder={t.avatarCharacterNamePlaceholder}
                    value={avatarCharacterName}
                    onChange={(e) => setAvatarCharacterName(e.target.value)}
                  />

                  <SectionLabel>{t.avatarCharacterImage}</SectionLabel>
                  <InlineRow>
                    <FileUploadButton
                      accept="image/*"
                      onUploaded={(url) => setAvatarCharacterImageUrl(url)}
                      label={t.upload}
                      uploadingLabel={t.uploading}
                    />
                    <FlexInput
                      placeholder={t.avatarCharacterImage}
                      value={avatarCharacterImageUrl}
                      onChange={(e) => setAvatarCharacterImageUrl(e.target.value)}
                    />
                  </InlineRow>

                  <SectionLabel>{t.avatarVoiceType}</SectionLabel>
                  <InlineRow>
                    <SelectionButton type="button" selected={avatarVoiceType === 'man'} onClick={() => setAvatarVoiceType('man')}>
                      {t.avatarVoiceTypeMen}
                    </SelectionButton>
                    <SelectionButton type="button" selected={avatarVoiceType === 'woman'} onClick={() => setAvatarVoiceType('woman')}>
                      {t.avatarVoiceTypeWomen}
                    </SelectionButton>
                  </InlineRow>


                  <SectionLabel>{t.avatarDetectiveRiddle}</SectionLabel>
                  <Input
                    placeholder={t.avatarDetectiveRiddlePlaceholder}
                    value={avatarDetectiveRiddle}
                    onChange={(e) => setAvatarDetectiveRiddle(e.target.value)}
                  />

                  <SectionLabel>{t.avatarInstructions}</SectionLabel>
                  <Input
                    placeholder={t.avatarInstructionsPlaceholder}
                    value={avatarInstructions}
                    onChange={(e) => setAvatarInstructions(e.target.value)}
                  />

                  <SectionLabel>{t.avatarOptionalAnswers}</SectionLabel>
                  {avatarOptionalAnswers.map((ans, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#999', minWidth: 24 }}>{i + 1}</span>
                      <Input
                        placeholder={t.avatarOptionalAnswerPlaceholder}
                        value={ans}
                        onChange={(e) => {
                          const updated = [...avatarOptionalAnswers];
                          updated[i] = e.target.value;
                          setAvatarOptionalAnswers(updated);
                        }}
                        style={{ flex: 1 }}
                      />
                      <SmallOutlineButton
                        type="button"
                        onClick={() => setAvatarOptionalAnswers(avatarOptionalAnswers.filter((_, j) => j !== i))}
                      >
                        {t.avatarRemove}
                      </SmallOutlineButton>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setAvatarOptionalAnswers((xs) => [...xs, ''])}
                    style={{ background: '#eef0ff', border: '1px solid #c7ccf7', borderRadius: 8, color: '#4338ca', fontWeight: 600, fontSize: 13, padding: '8px 16px', cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    + {t.avatarAddOptionalAnswer}
                  </button>

                  <SectionLabel style={{ marginTop: 16 }}>{t.avatarForbiddenPhrases}</SectionLabel>
                  {avatarForbiddenPhrases.map((phrase, i) => (
                    <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontSize: 12, fontWeight: 600, color: '#999', minWidth: 24 }}>{i + 1}</span>
                      <Input
                        placeholder={t.avatarForbiddenPhrasePlaceholder}
                        value={phrase}
                        onChange={(e) => {
                          const updated = [...avatarForbiddenPhrases];
                          updated[i] = e.target.value;
                          setAvatarForbiddenPhrases(updated);
                        }}
                        style={{ flex: 1 }}
                      />
                      <SmallOutlineButton
                        type="button"
                        onClick={() => setAvatarForbiddenPhrases(avatarForbiddenPhrases.filter((_, j) => j !== i))}
                      >
                        {t.avatarRemove}
                      </SmallOutlineButton>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setAvatarForbiddenPhrases((xs) => [...xs, ''])}
                    style={{ background: '#eef0ff', border: '1px solid #c7ccf7', borderRadius: 8, color: '#4338ca', fontWeight: 600, fontSize: 13, padding: '8px 16px', cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    + {t.avatarAddForbiddenPhrase}
                  </button>

                  <SectionLabel style={{ marginTop: 16 }}>{t.avatarVideos}</SectionLabel>
                  {avatarVideos.map((video, vi) => (
                    <div key={vi} style={{ background: '#ffffff', border: '1px solid #e6e6f0', borderRadius: 10, padding: '12px', marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <SectionLabelNoMargin style={{ margin: 0 }}>
                          {t.avatarVideoNum} {vi + 1}
                        </SectionLabelNoMargin>
                        <button
                          type="button"
                          onClick={() => setAvatarVideos(avatarVideos.filter((_, j) => j !== vi))}
                          style={{ background: 'none', border: 'none', color: '#c0392b', fontWeight: 600, cursor: 'pointer', fontSize: 13, padding: '2px 6px' }}
                        >
                          {t.avatarRemove}
                        </button>
                      </div>
                      <InlineRow>
                        <FileUploadButton
                          accept="video/*"
                          onUploaded={(url) => setAvatarVideos(avatarVideos.map((v, j) => j === vi ? { ...v, url } : v))}
                          label={t.upload}
                          uploadingLabel={t.uploading}
                        />
                        <FlexInput
                          placeholder={t.avatarVideoUrl}
                          value={video.url}
                          onChange={(e) => setAvatarVideos(avatarVideos.map((v, j) => j === vi ? { ...v, url: e.target.value } : v))}
                        />
                      </InlineRow>

                      <SectionLabelNoMargin style={{ marginTop: 12 }}>{t.avatarMatchingWords}</SectionLabelNoMargin>
                      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 8, marginTop: 8 }}>
                        {video.matchingWords.map((w, wi) => (
                          <span key={wi} style={{ display: 'inline-flex', alignItems: 'center', gap: 4, padding: '4px 10px', fontSize: 12, fontWeight: 600, borderRadius: 20, background: '#f0eefa', color: '#6c5ce7' }}>
                            {w}
                            <span
                              style={{ cursor: 'pointer', marginInlineStart: 2 }}
                              onClick={() => setAvatarVideos(avatarVideos.map((v, j) => j === vi ? { ...v, matchingWords: v.matchingWords.filter((_, k) => k !== wi) } : v))}
                            >
                              ×
                            </span>
                          </span>
                        ))}
                      </div>
                      <Input
                        placeholder={t.avatarMatchingWordsPlaceholder}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const input = e.currentTarget;
                            const v = input.value.trim();
                            if (v && !video.matchingWords.includes(v)) {
                              setAvatarVideos(avatarVideos.map((vv, j) => j === vi ? { ...vv, matchingWords: [...vv.matchingWords, v] } : vv));
                            }
                            input.value = '';
                          }
                        }}
                      />
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setAvatarVideos((xs) => [...xs, { url: '', matchingWords: [] }])}
                    style={{ background: '#eef0ff', border: '1px solid #c7ccf7', borderRadius: 8, color: '#4338ca', fontWeight: 600, fontSize: 13, padding: '8px 16px', cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    + {t.avatarAddVideo}
                  </button>

                  <SectionLabel style={{ marginTop: 16 }}>{t.avatarCharacters}</SectionLabel>
                  {avatarCharacters.map((c, i) => (
                    <div key={i} style={{ background: '#ffffff', border: '1px solid #e6e6f0', borderRadius: 10, padding: '12px', marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <SectionLabelNoMargin style={{ margin: 0 }}>#{i + 1}</SectionLabelNoMargin>
                        <button
                          type="button"
                          onClick={() => setAvatarCharacters(avatarCharacters.filter((_, j) => j !== i))}
                          style={{ background: 'none', border: 'none', color: '#c0392b', fontWeight: 600, cursor: 'pointer', fontSize: 13, padding: '2px 6px' }}
                        >
                          {t.avatarRemove}
                        </button>
                      </div>
                      <Input
                        placeholder={t.avatarCharacterItemName}
                        value={c.name}
                        onChange={(e) => setAvatarCharacters(avatarCharacters.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                        style={{ marginBottom: 8 }}
                      />
                      <TextArea
                        placeholder={t.avatarCharacterItemDesc}
                        value={c.description}
                        onChange={(e) => setAvatarCharacters(avatarCharacters.map((x, j) => j === i ? { ...x, description: e.target.value } : x))}
                      />
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setAvatarCharacters((xs) => [...xs, { name: '', description: '' }])}
                    style={{ background: '#eef0ff', border: '1px solid #c7ccf7', borderRadius: 8, color: '#4338ca', fontWeight: 600, fontSize: 13, padding: '8px 16px', cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    + {t.avatarAddCharacter}
                  </button>

                  <SectionLabel style={{ marginTop: 16 }}>{t.avatarClues}</SectionLabel>
                  {avatarClues.map((c, i) => (
                    <div key={i} style={{ background: '#ffffff', border: '1px solid #e6e6f0', borderRadius: 10, padding: '12px', marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <SectionLabelNoMargin style={{ margin: 0 }}>#{i + 1}</SectionLabelNoMargin>
                        <button
                          type="button"
                          onClick={() => setAvatarClues(avatarClues.filter((_, j) => j !== i))}
                          style={{ background: 'none', border: 'none', color: '#c0392b', fontWeight: 600, cursor: 'pointer', fontSize: 13, padding: '2px 6px' }}
                        >
                          {t.avatarRemove}
                        </button>
                      </div>
                      <Input
                        placeholder={t.avatarClueItemName}
                        value={c.name}
                        onChange={(e) => setAvatarClues(avatarClues.map((x, j) => j === i ? { ...x, name: e.target.value } : x))}
                        style={{ marginBottom: 8 }}
                      />
                      <TextArea
                        placeholder={t.avatarClueItemDesc}
                        value={c.description}
                        onChange={(e) => setAvatarClues(avatarClues.map((x, j) => j === i ? { ...x, description: e.target.value } : x))}
                      />
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setAvatarClues((xs) => [...xs, { name: '', description: '' }])}
                    style={{ background: '#eef0ff', border: '1px solid #c7ccf7', borderRadius: 8, color: '#4338ca', fontWeight: 600, fontSize: 13, padding: '8px 16px', cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    + {t.avatarAddClue}
                  </button>

                  <SectionLabel style={{ marginTop: 16 }}>{t.avatarKnowledgeGates}</SectionLabel>
                  {avatarKnowledgeGates.map((g, i) => (
                    <div key={i} style={{ background: '#ffffff', border: '1px solid #e6e6f0', borderRadius: 10, padding: '12px', marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <SectionLabelNoMargin style={{ margin: 0 }}>#{i + 1}</SectionLabelNoMargin>
                        <button
                          type="button"
                          onClick={() => setAvatarKnowledgeGates(avatarKnowledgeGates.filter((_, j) => j !== i))}
                          style={{ background: 'none', border: 'none', color: '#c0392b', fontWeight: 600, cursor: 'pointer', fontSize: 13, padding: '2px 6px' }}
                        >
                          {t.avatarRemove}
                        </button>
                      </div>
                      <Input
                        placeholder={t.avatarGateTrigger}
                        value={g.trigger}
                        onChange={(e) => setAvatarKnowledgeGates(avatarKnowledgeGates.map((x, j) => j === i ? { ...x, trigger: e.target.value } : x))}
                        style={{ marginBottom: 8 }}
                      />
                      <TextArea
                        placeholder={t.avatarGateReveal}
                        value={g.reveal}
                        onChange={(e) => setAvatarKnowledgeGates(avatarKnowledgeGates.map((x, j) => j === i ? { ...x, reveal: e.target.value } : x))}
                      />
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setAvatarKnowledgeGates((xs) => [...xs, { trigger: '', reveal: '' }])}
                    style={{ background: '#eef0ff', border: '1px solid #c7ccf7', borderRadius: 8, color: '#4338ca', fontWeight: 600, fontSize: 13, padding: '8px 16px', cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    + {t.avatarAddGate}
                  </button>

                  <SectionLabel style={{ marginTop: 16 }}>{t.avatarHintStrategy}</SectionLabel>
                  <TextArea
                    placeholder={t.avatarHintStrategyPlaceholder}
                    value={avatarHintStrategy}
                    onChange={(e) => setAvatarHintStrategy(e.target.value)}
                  />
                </VerticalStack>
              )}
              {stationType === 'avatarQuiz' && (
                <VerticalStack>
                  {/* ─── Part A: the character ─── */}
                  <SectionLabelNoMargin>{t.avatarCharacterName}</SectionLabelNoMargin>
                  <Input
                    placeholder={t.quizCharacterNamePlaceholder}
                    value={quizCharacterName}
                    onChange={(e) => setQuizCharacterName(e.target.value)}
                  />

                  <SectionLabel>{t.avatarCharacterImage}</SectionLabel>
                  <InlineRowGap12>
                    <FileUploadButton accept="image/*" onUploaded={(url) => setQuizCharacterImageUrl(url)} />
                    <Input
                      placeholder={t.avatarCharacterImage}
                      value={quizCharacterImageUrl}
                      onChange={(e) => setQuizCharacterImageUrl(e.target.value)}
                    />
                  </InlineRowGap12>

                  <SectionLabel>{t.avatarVoiceType}</SectionLabel>
                  <InlineRowGap12>
                    <SelectionButton type="button" selected={quizVoiceType === 'man'} onClick={() => setQuizVoiceType('man')}>
                      {t.avatarVoiceTypeMen}
                    </SelectionButton>
                    <SelectionButton type="button" selected={quizVoiceType === 'woman'} onClick={() => setQuizVoiceType('woman')}>
                      {t.avatarVoiceTypeWomen}
                    </SelectionButton>
                  </InlineRowGap12>

                  {/* ─── Part B: the training ─── */}
                  <SectionLabel style={{ marginTop: 20 }}>{t.quizTopic}</SectionLabel>
                  <Input
                    placeholder={t.quizTopicPlaceholder}
                    value={quizTopic}
                    onChange={(e) => setQuizTopic(e.target.value)}
                  />

                  <SectionLabel>{t.quizIntroText}</SectionLabel>
                  <TextArea
                    placeholder={t.quizIntroTextPlaceholder}
                    value={quizIntroText}
                    onChange={(e) => setQuizIntroText(e.target.value)}
                  />

                  <SectionLabel>{t.quizOutroText}</SectionLabel>
                  <TextArea
                    placeholder={t.quizOutroTextPlaceholder}
                    value={quizOutroText}
                    onChange={(e) => setQuizOutroText(e.target.value)}
                  />

                  <SectionLabel>{t.quizPersonaInstructions}</SectionLabel>
                  <TextArea
                    placeholder={t.quizPersonaInstructionsPlaceholder}
                    value={quizPersonaInstructions}
                    onChange={(e) => setQuizPersonaInstructions(e.target.value)}
                  />

                  <SectionLabel>{t.quizStrictness}</SectionLabel>
                  <InlineRowGap12>
                    <SelectionButton type="button" selected={quizStrictness === 'lenient'} onClick={() => setQuizStrictness('lenient')}>
                      {t.quizStrictnessLenient}
                    </SelectionButton>
                    <SelectionButton type="button" selected={quizStrictness === 'balanced'} onClick={() => setQuizStrictness('balanced')}>
                      {t.quizStrictnessBalanced}
                    </SelectionButton>
                    <SelectionButton type="button" selected={quizStrictness === 'strict'} onClick={() => setQuizStrictness('strict')}>
                      {t.quizStrictnessStrict}
                    </SelectionButton>
                  </InlineRowGap12>

                  <SectionLabel>{t.quizPointsPerQuestion}</SectionLabel>
                  <Input
                    type="number"
                    min={1}
                    value={quizPointsPerQuestion}
                    onChange={(e) => setQuizPointsPerQuestion(e.target.value)}
                  />

                  <SectionLabel>{t.quizQuestionCount}</SectionLabel>
                  <Input
                    type="number"
                    min={0}
                    value={quizQuestionCount}
                    onChange={(e) => setQuizQuestionCount(e.target.value)}
                  />
                  <SectionDescription>
                    {t.quizQuestionCountHelp.replace(
                      '{n}',
                      String(quizQuestions.filter((q) => q.text.trim()).length)
                    )}
                  </SectionDescription>

                  <SectionLabel style={{ marginTop: 16 }}>{t.quizBehaviour}</SectionLabel>
                  <InlineRowGap12 style={{ flexWrap: 'wrap' }}>
                    <SelectionButton type="button" selected={quizShuffleQuestions} onClick={() => setQuizShuffleQuestions((v) => !v)}>
                      {t.quizShuffleQuestions}
                    </SelectionButton>
                    <SelectionButton type="button" selected={quizAllowRetry} onClick={() => setQuizAllowRetry((v) => !v)}>
                      {t.quizAllowRetry}
                    </SelectionButton>
                    <SelectionButton type="button" selected={quizAllowSkip} onClick={() => setQuizAllowSkip((v) => !v)}>
                      {t.quizAllowSkip}
                    </SelectionButton>
                    <SelectionButton type="button" selected={quizAutoAdvance} onClick={() => setQuizAutoAdvance((v) => !v)}>
                      {t.quizAutoAdvance}
                    </SelectionButton>
                  </InlineRowGap12>
                  <SectionDescription>{t.quizBehaviourHelp}</SectionDescription>

                  {/* ─── Part C: the question bank ─── */}
                  <SectionLabel style={{ marginTop: 20 }}>{t.quizQuestions}</SectionLabel>
                  {quizQuestions.map((q, qi) => {
                    const invalid = quizInvalidRows.includes(qi);
                    const update = (patch: Partial<AvatarQuizQuestionConfig>) =>
                      setQuizQuestions((xs) => xs.map((x, j) => (j === qi ? { ...x, ...patch } : x)));
                    return (
                      <div
                        key={qi}
                        style={{
                          border: `1px solid ${invalid ? '#ef4444' : '#d9dcf5'}`,
                          borderRadius: 10,
                          padding: 12,
                          marginBottom: 12,
                          display: 'flex',
                          flexDirection: 'column',
                          gap: 8,
                        }}
                      >
                        <InlineRowGap12 style={{ justifyContent: 'space-between' }}>
                          <SectionLabelNoMargin>{t.quizQuestionNum} {qi + 1}</SectionLabelNoMargin>
                          {quizQuestions.length > 1 && (
                            <button
                              type="button"
                              onClick={() => setQuizQuestions((xs) => xs.filter((_, j) => j !== qi))}
                              style={{ background: '#fdeaea', border: '1px solid #f3b4b4', borderRadius: 8, color: '#b91c1c', fontWeight: 600, fontSize: 12, padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit' }}
                            >
                              {t.avatarRemove}
                            </button>
                          )}
                        </InlineRowGap12>

                        <TextArea
                          placeholder={t.quizQuestionText}
                          value={q.text}
                          onChange={(e) => update({ text: e.target.value })}
                        />
                        <TextArea
                          placeholder={t.quizIdealAnswer}
                          value={q.idealAnswer}
                          onChange={(e) => update({ idealAnswer: e.target.value })}
                        />
                        <TextArea
                          placeholder={t.quizTeachingPoint}
                          value={q.teachingPoint}
                          onChange={(e) => update({ teachingPoint: e.target.value })}
                        />

                        <SectionLabelNoMargin style={{ marginTop: 6 }}>{t.quizKeywords}</SectionLabelNoMargin>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
                          {q.acceptableKeywords.map((kw, ki) => (
                            <span
                              key={ki}
                              onClick={() => update({ acceptableKeywords: q.acceptableKeywords.filter((_, k) => k !== ki) })}
                              style={{ background: '#eef0ff', border: '1px solid #c7ccf7', borderRadius: 999, padding: '4px 10px', fontSize: 12, fontWeight: 600, color: '#3730a3', cursor: 'pointer' }}
                            >
                              {kw} ✕
                            </span>
                          ))}
                        </div>
                        <Input
                          placeholder={t.quizKeywordsPlaceholder}
                          onKeyDown={(e) => {
                            if (e.key !== 'Enter') return;
                            e.preventDefault();
                            const input = e.currentTarget;
                            const v = input.value.trim();
                            if (v && !q.acceptableKeywords.includes(v)) {
                              update({ acceptableKeywords: [...q.acceptableKeywords, v] });
                            }
                            input.value = '';
                          }}
                        />

                        <SectionLabelNoMargin style={{ marginTop: 6 }}>{t.quizCommonWrong}</SectionLabelNoMargin>
                        {q.commonWrongAnswers.map((w, wi) => (
                          <InlineRowGap12 key={wi}>
                            <Input
                              placeholder={t.quizCommonWrongText}
                              value={w.text}
                              onChange={(e) => update({
                                commonWrongAnswers: q.commonWrongAnswers.map((x, k) => (k === wi ? { ...x, text: e.target.value } : x)),
                              })}
                            />
                            <Input
                              placeholder={t.quizCommonWrongRebuttal}
                              value={w.rebuttal}
                              onChange={(e) => update({
                                commonWrongAnswers: q.commonWrongAnswers.map((x, k) => (k === wi ? { ...x, rebuttal: e.target.value } : x)),
                              })}
                            />
                            <button
                              type="button"
                              onClick={() => update({ commonWrongAnswers: q.commonWrongAnswers.filter((_, k) => k !== wi) })}
                              style={{ background: '#fdeaea', border: '1px solid #f3b4b4', borderRadius: 8, color: '#b91c1c', fontWeight: 600, fontSize: 12, padding: '4px 10px', cursor: 'pointer', fontFamily: 'inherit', flexShrink: 0 }}
                            >
                              {t.avatarRemove}
                            </button>
                          </InlineRowGap12>
                        ))}
                        <button
                          type="button"
                          onClick={() => update({ commonWrongAnswers: [...q.commonWrongAnswers, { text: '', rebuttal: '' }] })}
                          style={{ background: '#eef0ff', border: '1px solid #c7ccf7', borderRadius: 8, color: '#4338ca', fontWeight: 600, fontSize: 13, padding: '6px 14px', cursor: 'pointer', fontFamily: 'inherit', alignSelf: 'flex-start' }}
                        >
                          + {t.quizAddCommonWrong}
                        </button>

                        <SectionLabelNoMargin style={{ marginTop: 6 }}>{t.quizQuestionHint}</SectionLabelNoMargin>
                        <InlineRowGap12>
                          <Input
                            placeholder={t.quizQuestionHintPlaceholder}
                            value={q.hintText}
                            onChange={(e) => update({ hintText: e.target.value })}
                          />
                          <Input
                            type="number"
                            min={0}
                            placeholder={t.quizHintPenalty}
                            value={q.hintPenalty}
                            onChange={(e) => update({ hintPenalty: e.target.value })}
                            style={{ maxWidth: 110 }}
                          />
                        </InlineRowGap12>

                        <SectionLabelNoMargin style={{ marginTop: 6 }}>{t.quizQuestionMedia}</SectionLabelNoMargin>
                        <InlineRowGap12>
                          <FileUploadButton accept="image/*" onUploaded={(url) => update({ mediaUrl: url, mediaType: 'image' })} />
                          <Input
                            placeholder={t.quizQuestionMedia}
                            value={q.mediaUrl}
                            onChange={(e) => update({ mediaUrl: e.target.value })}
                          />
                        </InlineRowGap12>

                        <InlineRowGap12>
                          <Input
                            type="number"
                            min={1}
                            placeholder={t.quizQuestionPoints}
                            value={q.points}
                            onChange={(e) => update({ points: e.target.value })}
                          />
                          <Input
                            placeholder={t.quizLearnMoreUrl}
                            value={q.learnMoreUrl}
                            onChange={(e) => update({ learnMoreUrl: e.target.value })}
                          />
                        </InlineRowGap12>
                      </div>
                    );
                  })}
                  <button
                    type="button"
                    onClick={() => setQuizQuestions((xs) => [...xs, emptyQuizQuestion()])}
                    style={{ background: '#eef0ff', border: '1px solid #c7ccf7', borderRadius: 8, color: '#4338ca', fontWeight: 600, fontSize: 13, padding: '8px 16px', cursor: 'pointer', fontFamily: 'inherit', alignSelf: 'flex-start' }}
                  >
                    + {t.quizAddQuestion}
                  </button>

                  {/* ─── Part D: reaction videos ─── */}
                  <SectionLabel style={{ marginTop: 20 }}>{t.quizReactionVideos}</SectionLabel>
                  {([
                    { label: t.quizVideoAsking, value: quizVideoAsking, set: setQuizVideoAsking },
                    { label: t.quizVideoCorrect, value: quizVideoCorrect, set: setQuizVideoCorrect },
                    { label: t.quizVideoPartial, value: quizVideoPartial, set: setQuizVideoPartial },
                    { label: t.quizVideoIncorrect, value: quizVideoIncorrect, set: setQuizVideoIncorrect },
                  ] as const).map(({ label, value, set }) => (
                    <div key={label} style={{ marginBottom: 8 }}>
                      <SectionLabelNoMargin>{label}</SectionLabelNoMargin>
                      <InlineRowGap12 style={{ marginTop: 6 }}>
                        <FileUploadButton accept="video/*" onUploaded={(url) => set(url)} />
                        <Input placeholder={label} value={value} onChange={(e) => set(e.target.value)} />
                      </InlineRowGap12>
                    </div>
                  ))}
                </VerticalStack>
              )}
              {stationType === 'enteringText' && (
                <VerticalStack>
                  <SectionLabelNoMargin>{t.enteringTextTitle}</SectionLabelNoMargin>
                  <Input
                    placeholder={t.enteringTextTitlePlaceholder}
                    value={enteringTextTitle}
                    onChange={(e) => setEnteringTextTitle(e.target.value)}
                  />
                  <SectionLabelNoMargin>{t.enteringTextFields}</SectionLabelNoMargin>
                  {enteringTextFields.map((field, idx) => (
                    <div key={idx} style={{ background: '#ffffff', border: '1px solid #e6e6f0', borderRadius: 10, padding: '12px', marginBottom: 8 }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
                        <SectionLabelNoMargin style={{ margin: 0 }}>
                          {t.enteringTextFieldNum} {idx + 1}
                        </SectionLabelNoMargin>
                        {enteringTextFields.length > 1 && (
                          <button
                            type="button"
                            onClick={() => setEnteringTextFields((prev) => prev.filter((_, i) => i !== idx))}
                            style={{ background: 'none', border: 'none', color: '#c0392b', fontWeight: 600, cursor: 'pointer', fontSize: 13, padding: '2px 6px' }}
                          >
                            {t.avatarRemove}
                          </button>
                        )}
                      </div>
                      <Input
                        placeholder={t.enteringTextFieldStatement}
                        value={field.statement}
                        onChange={(e) => setEnteringTextFields((prev) => prev.map((f, i) => i === idx ? { ...f, statement: e.target.value } : f))}
                        style={{ marginBottom: 8 }}
                      />
                      <Input
                        placeholder={t.enteringTextFieldPlaceholder}
                        value={field.placeholder}
                        onChange={(e) => setEnteringTextFields((prev) => prev.map((f, i) => i === idx ? { ...f, placeholder: e.target.value } : f))}
                        style={{ marginBottom: 8 }}
                      />
                      <Input
                        placeholder={t.enteringTextFieldRightAnswer}
                        value={field.rightAnswer}
                        onChange={(e) => setEnteringTextFields((prev) => prev.map((f, i) => i === idx ? { ...f, rightAnswer: e.target.value } : f))}
                        style={{ marginBottom: 8 }}
                      />
                      <Input
                        placeholder={t.enteringTextFieldKeywordsBank}
                        value={field.keywordsBank}
                        onChange={(e) => setEnteringTextFields((prev) => prev.map((f, i) => i === idx ? { ...f, keywordsBank: e.target.value } : f))}
                      />
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() => setEnteringTextFields((prev) => [...prev, { statement: '', placeholder: '', rightAnswer: '', keywordsBank: '' }])}
                    style={{ background: '#eef0ff', border: '1px solid #c7ccf7', borderRadius: 8, color: '#4338ca', fontWeight: 600, fontSize: 13, padding: '8px 16px', cursor: 'pointer', fontFamily: 'inherit' }}
                  >
                    + {t.enteringTextFieldAdd}
                  </button>
                  <SectionLabelNoMargin>{t.enteringTextSubmitButtonText}</SectionLabelNoMargin>
                  <Input
                    placeholder={t.enteringTextSubmitButtonPlaceholder}
                    value={enteringTextSubmitButtonText}
                    onChange={(e) => setEnteringTextSubmitButtonText(e.target.value)}
                  />
                  <SectionLabelNoMargin>{t.enteringTextReturnButtonText}</SectionLabelNoMargin>
                  <Input
                    placeholder={t.enteringTextReturnButtonPlaceholder}
                    value={enteringTextReturnButtonText}
                    onChange={(e) => setEnteringTextReturnButtonText(e.target.value)}
                  />
                  <SectionLabelNoMargin>{t.enteringTextMaxAttempts}</SectionLabelNoMargin>
                  <Input
                    type="number"
                    placeholder={t.enteringTextMaxAttemptsPlaceholder}
                    value={enteringTextMaxAttempts}
                    onChange={(e) => setEnteringTextMaxAttempts(e.target.value)}
                    style={{ maxWidth: 120 }}
                  />
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: 8, paddingTop: 16 }}>
                    <SectionLabelNoMargin>{t.enteringTextSuccessSection}</SectionLabelNoMargin>
                    <Input
                      placeholder={t.enteringTextSuccessTitlePlaceholder}
                      value={enteringTextSuccessTitle}
                      onChange={(e) => setEnteringTextSuccessTitle(e.target.value)}
                      style={{ marginBottom: 8 }}
                    />
                    <Input
                      placeholder={t.enteringTextSuccessSubtitlePlaceholder}
                      value={enteringTextSuccessSubtitle}
                      onChange={(e) => setEnteringTextSuccessSubtitle(e.target.value)}
                      style={{ marginBottom: 8 }}
                    />
                    <SectionLabelNoMargin style={{ marginBottom: 6 }}>{t.enteringTextSuccessMediaType}</SectionLabelNoMargin>
                    <SelectionGroup style={{ marginBottom: 8 }}>
                      {(['', 'image', 'video'] as const).map((type) => (
                        <ToggleButton
                          key={type}
                          type="button"
                          selected={enteringTextSuccessMediaType === type}
                          onClick={() => { setEnteringTextSuccessMediaType(type); setEnteringTextSuccessMediaUrl(''); }}
                        >
                          {type === '' ? t.enteringTextSuccessMediaNone : type === 'image' ? t.enteringTextSuccessMediaImage : t.enteringTextSuccessMediaVideo}
                        </ToggleButton>
                      ))}
                    </SelectionGroup>
                    {enteringTextSuccessMediaType !== '' && (
                      <InlineRow>
                        <FileUploadButton
                          accept={enteringTextSuccessMediaType === 'video' ? 'video/*' : 'image/*'}
                          onUploaded={(url) => setEnteringTextSuccessMediaUrl(url)}
                          label={t.upload}
                          uploadingLabel={t.uploading}
                        />
                        <FlexInput
                          placeholder={t.enteringTextSuccessMediaUrlPlaceholder}
                          value={enteringTextSuccessMediaUrl}
                          onChange={(e) => setEnteringTextSuccessMediaUrl(e.target.value)}
                        />
                      </InlineRow>
                    )}
                  </div>
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: 8, paddingTop: 16 }}>
                    <HintToggleRow>
                      <SectionLabelNoMargin>{t.enteringTextShowBackButton}</SectionLabelNoMargin>
                      <ToggleButton
                        type="button"
                        selected={enteringTextShowBackButton}
                        onClick={() => setEnteringTextShowBackButton((v) => !v)}
                      >
                        {enteringTextShowBackButton ? 'ON' : 'OFF'}
                      </ToggleButton>
                    </HintToggleRow>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 6 }}>
                      {t.enteringTextShowBackButtonHelper}
                    </div>
                  </div>
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: 8, paddingTop: 16 }}>
                    <HintToggleRow>
                      <SectionLabelNoMargin>{t.enteringTextLastStep}</SectionLabelNoMargin>
                      <ToggleButton
                        type="button"
                        selected={enteringTextLastStep}
                        onClick={() => setEnteringTextLastStep((v) => !v)}
                      >
                        {enteringTextLastStep ? 'ON' : 'OFF'}
                      </ToggleButton>
                    </HintToggleRow>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 6 }}>
                      {t.enteringTextLastStepHelper}
                    </div>
                  </div>
                  <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: 8, paddingTop: 16 }}>
                    <HintToggleRow>
                      <SectionLabelNoMargin>{t.enteringTextSolutionHint}</SectionLabelNoMargin>
                      <ToggleButton
                        type="button"
                        selected={enteringTextSolutionHintEnabled}
                        onClick={() => setEnteringTextSolutionHintEnabled((v) => !v)}
                      >
                        {enteringTextSolutionHintEnabled ? 'ON' : 'OFF'}
                      </ToggleButton>
                    </HintToggleRow>
                    <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.55)', marginTop: 6 }}>
                      {t.enteringTextSolutionHintHelper}
                    </div>
                  </div>
                </VerticalStack>
              )}
            </FormSectionCardWide>

            <FormSectionCardWide>
              {error && <ErrorText>{error}</ErrorText>}
              <PrimaryButton type="submit" disabled={loading || !name.trim()}>
                {loading ? t.saving : t.save}
              </PrimaryButton>
            </FormSectionCardWide>
          </Form>
        </AdminCardWide>
      </AdminContent>
    </AdminPage>
  );
}
