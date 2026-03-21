import { useState, useEffect, useRef, FormEvent } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { styled } from '@mui/material/styles';
import { useTranslations } from '../../../context/LanguageContext';
import { texts } from './AdminGameConfigPage.i18n';
import { adminApiFetch } from '../../../utils/adminApi';
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
  SmallOutlineButton,
  ToggleButton,
  InlineRowGap12,
} from '../styled';
import type { GameData, GameConfigHandle } from './types';
import OrderGameConfig from './OrderGameConfig';
import TriviaGameConfig from './TriviaGameConfig';
import PuzzleGameConfig from './PuzzleGameConfig';
import TrueFalseGameConfig from './TrueFalseGameConfig';
import BallGameConfig from './BallGameConfig';
import TrashSortGameConfig from './TrashSortGameConfig';

const HintToggleRow = styled(InlineRowGap12)({
  marginBottom: 8,
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

export default function AdminGameConfigPage() {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const t = useTranslations(texts);

  const validTypes = ['order', 'trivia', 'puzzle', 'trueFalse', 'ballGame', 'trashSort'];
  const typeFromUrl = searchParams.get('type');
  const defaultType = typeFromUrl && validTypes.includes(typeFromUrl) ? typeFromUrl : 'order';

  const [name, setName] = useState('');
  const [type, setType] = useState(defaultType);
  const [description, setDescription] = useState('');
  const [customer, setCustomer] = useState('');
  const [theme, setTheme] = useState('');

  // Shared
  const [instructions, setInstructions] = useState('');
  const [hintEnabled, setHintEnabled] = useState(false);
  const [hintText, setHintText] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(!!id);

  // Initial settings to pass to sub-components
  const [initialSettings, setInitialSettings] = useState<Record<string, unknown> | undefined>(undefined);

  // Refs for sub-components
  const orderRef = useRef<GameConfigHandle>(null);
  const triviaRef = useRef<GameConfigHandle>(null);
  const puzzleRef = useRef<GameConfigHandle>(null);
  const trueFalseRef = useRef<GameConfigHandle>(null);
  const trashSortRef = useRef<GameConfigHandle>(null);
  // Fetch existing game data
  useEffect(() => {
    if (!id) return;
    adminApiFetch<{ game: GameData }>(`/api/admin/games/${id}`)
      .then((data) => {
        const g = data.game;
        setName(g.name);
        setType(g.type);
        setDescription(g.description || '');
        setCustomer(g.customer || '');
        setTheme(g.theme || '');
        const s = g.settings as Record<string, unknown>;
        setInstructions((s.instructions as string) || '');
        if (s.hint && typeof s.hint === 'object') {
          const h = s.hint as Record<string, unknown>;
          setHintEnabled(!!h.enabled);
          setHintText((h.text as string) || '');
        }
        setInitialSettings(s);
        setInitialLoading(false);
      })
      .catch(() => navigate('/admin/dashboard'));
  }, [id, navigate]);

  const getActiveRef = () => {
    switch (type) {
      case 'order': return orderRef;
      case 'trivia': return triviaRef;
      case 'puzzle': return puzzleRef;
      case 'trueFalse': return trueFalseRef;
      case 'trashSort': return trashSortRef;
      default: return null;
    }
  };

  // ─── Submit ───
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError('');

    const activeRef = getActiveRef();
    if (activeRef?.current) {
      const validationError = activeRef.current.validate();
      if (validationError) {
        setError(validationError);
        return;
      }
    }

    setLoading(true);
    try {
      const hintConfig = hintEnabled && hintText.trim()
        ? { hint: { enabled: true, text: hintText.trim() } }
        : {};

      const gameTypeSettings = activeRef?.current?.getSettings() ?? {};

      const settings: Record<string, unknown> = {
        instructions: instructions.trim() || undefined,
        ...hintConfig,
        ...gameTypeSettings,
      };

      const payload = {
        name: name.trim(),
        type,
        description: description.trim() || undefined,
        customer: customer.trim() || undefined,
        theme: theme.trim() || undefined,
        settings,
      };

      if (id) {
        await adminApiFetch(`/api/admin/games/${id}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        });
      } else {
        await adminApiFetch('/api/admin/games', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
      }
      navigate('/admin/dashboard');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setLoading(false);
    }
  };

  const gameNames: Record<string, string> = {
    order: 'סדר נכון - טסט',
    trivia: 'טריוויה - טסט',
    puzzle: 'פאזל - טסט',
    trueFalse: 'נכון או לא - טסט',
    trashSort: 'מיון אשפה - טסט',
  };

  const handleFillRandom = () => {
    const ts = Date.now().toString().slice(-4);
    setName(`${gameNames[type] || 'משחק טסט'} #${ts}`);
    setDescription('משחק לבדיקה');
    setCustomer('לקוח טסט');
    setTheme('נושא טסט');
    setInstructions('ענו על כל השאלות בהצלחה!');
    setHintEnabled(true);
    setHintText('זהו רמז לדוגמה');
    const activeRef = getActiveRef();
    activeRef?.current?.fillRandom?.();
  };

  if (initialLoading) return null;

  return (
    <AdminPage>
      <AdminHeader>
        <img src="/images/logo-purple.png" alt="Yooz" style={{ height: 32 }} />
        <SmallOutlineButton onClick={() => navigate('/admin/dashboard')}>{t.back}</SmallOutlineButton>
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
                  placeholder={t.gameName}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
                <div>
                  <SectionLabel>{t.gameType}</SectionLabel>
                  <SelectionGroup>
                    <SelectionButton type="button" selected={type === 'order'} onClick={() => setType('order')}>
                      Order
                    </SelectionButton>
                    <SelectionButton type="button" selected={type === 'trivia'} onClick={() => setType('trivia')}>
                      Trivia
                    </SelectionButton>
                    <SelectionButton type="button" selected={type === 'puzzle'} onClick={() => setType('puzzle')}>
                      Puzzle
                    </SelectionButton>
                    <SelectionButton type="button" selected={type === 'trueFalse'} onClick={() => setType('trueFalse')}>
                      True/False
                    </SelectionButton>
                    <SelectionButton type="button" selected={type === 'trashSort'} onClick={() => setType('trashSort')}>
                      Trash Sort
                    </SelectionButton>
                  </SelectionGroup>
                </div>
                <Input
                  placeholder={t.description}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                />
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
              </FormSectionCard>

              <FormSectionCard>
                <div>
                  <SectionLabel>{t.instructions}</SectionLabel>
                  <Input
                    placeholder={type === 'trueFalse' ? t.trueFalseInstructionsPlaceholder : type === 'puzzle' ? t.puzzleInstructionsPlaceholder : type === 'trivia' ? t.triviaInstructionsPlaceholder : t.instructionsPlaceholder}
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                  />
                </div>

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
                    <Input
                      placeholder={t.hintPlaceholder}
                      value={hintText}
                      onChange={(e) => setHintText(e.target.value)}
                    />
                  )}
                </div>
              </FormSectionCard>
            </DesktopFormGrid>

            {/* Game-type specific config */}
            <FormSectionCardWide>
              {type === 'order' && (
                <OrderGameConfig ref={orderRef} t={t} initialSettings={initialSettings} />
              )}
              {type === 'trivia' && (
                <TriviaGameConfig ref={triviaRef} t={t} initialSettings={initialSettings} />
              )}
              {type === 'puzzle' && (
                <PuzzleGameConfig ref={puzzleRef} t={t} initialSettings={initialSettings} />
              )}
              {type === 'trueFalse' && (
                <TrueFalseGameConfig ref={trueFalseRef} t={t} initialSettings={initialSettings} />
              )}
              {type === 'trashSort' && (
                <TrashSortGameConfig ref={trashSortRef} t={t} initialSettings={initialSettings} />
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
