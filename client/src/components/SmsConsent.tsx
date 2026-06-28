import { useRef } from 'react';
import { useTranslations } from '../context/LanguageContext';

const texts = {
  en: {
    prefix: 'I agree to receive SMS messages from the activity organizer and accept the ',
    link: 'terms of use',
    suffix: '.',
    title: 'SMS Terms of Use',
    close: 'Close',
    body: [
      'By providing your phone number and ticking the consent box, you give the activity organizer explicit, prior consent to send SMS messages to this number as required by Section 30A of the Israeli Communications Law (Bezeq and Broadcasts), 1982 ("the Spam Law").',
      'Purpose of messages: service messages related to the activity (e.g. join links, results, reminders) and, with your consent, promotional/marketing messages from the activity organizer.',
      'Sender identification: every promotional message will be clearly marked as "פרסומת" (advertisement) and will include the sender\'s name, contact details, and a simple way to opt out.',
      'Right to withdraw consent: you may withdraw your consent at any time by replying with the word "הסר" (REMOVE) or "STOP" to any message, or by contacting the activity organizer directly. The organizer must stop sending messages within a reasonable time.',
      'Eligibility: the phone number you provide must belong to you. Do not provide a number that belongs to another person without their consent. If the number belongs to a minor under 18, parental consent is required — by submitting the number you confirm that you have such consent.',
      'Charges: standard SMS rates from your mobile carrier may apply. The activity organizer does not charge for these messages.',
      'No consent — no SMS: if you do not tick the consent box, no marketing SMS will be sent to you; you may still need to provide a number to participate in the activity if the organizer has chosen so.',
      'Liability and remedies: sending unsolicited SMS in violation of the Spam Law may entitle the recipient to statutory damages of up to NIS 1,000 per message under Israeli law. The activity organizer commits to operating within the law.',
      'Data retention: your phone number is stored only for the duration required to operate the activity and to comply with applicable law, and is not shared with third parties for their own marketing.',
    ],
  },
  he: {
    prefix: 'אני מסכים/ה לקבל הודעות SMS ממארגן הפעילות ומקבל/ת את ',
    link: 'תנאי השימוש',
    suffix: '.',
    title: 'תנאי שימוש למשלוח SMS',
    close: 'סגירה',
    body: [
      'במסירת מספר הטלפון וסימון תיבת ההסכמה הינך נותן/ת למארגן הפעילות הסכמה מפורשת מראש לשלוח הודעות SMS למספר זה, כנדרש בסעיף 30א לחוק התקשורת (בזק ושידורים), התשמ"ב-1982 ("חוק הספאם").',
      'מטרת ההודעות: הודעות שירות הקשורות לפעילות (לדוגמה: קישורי הצטרפות, תוצאות, תזכורות), ובכפוף להסכמתך גם הודעות פרסומיות/שיווקיות מטעם מארגן הפעילות.',
      'זיהוי השולח: כל הודעה פרסומית תסומן באופן ברור במילה "פרסומת" בתחילתה, ותכלול את שם המפרסם, פרטי התקשרות, ודרך פשוטה וסבירה להסרה מרשימת הדיוור.',
      'זכות לבטל הסכמה: ניתן לבטל את ההסכמה בכל עת על ידי השבת הודעה במילה "הסר" או "STOP" לכל הודעה שתישלח, או על ידי פנייה ישירה למארגן הפעילות. המארגן יחדל ממשלוח הודעות תוך זמן סביר.',
      'בעלות על המספר: על מספר הטלפון שתמסרו להיות שלכם. אין למסור מספר של אדם אחר ללא הסכמתו. אם המספר שייך לקטין/ה מתחת לגיל 18, נדרשת הסכמת ההורה/האפוטרופוס — במסירת המספר הינך מאשר/ת כי בידיך הסכמה כזו.',
      'עלויות: ייתכן כי יחול חיוב רגיל ממפעיל הסלולר עבור קבלת הודעות SMS. מארגן הפעילות אינו גובה תשלום עבור הודעות אלו.',
      'אין הסכמה — אין הודעות שיווק: אם לא תסמן/י את תיבת ההסכמה, לא יישלחו אליך הודעות SMS שיווקיות; ייתכן עדיין שיהיה צורך במסירת המספר על מנת להשתתף בפעילות, ככל שכך הוגדר על ידי המארגן.',
      'אחריות וסעדים: משלוח הודעות SMS בניגוד לחוק הספאם עשוי לזכות את מקבל ההודעה בפיצוי ללא הוכחת נזק של עד 1,000 ₪ בגין כל הודעה, על פי הדין הישראלי. מארגן הפעילות מתחייב לפעול בהתאם לחוק.',
      'שמירת מידע: מספר הטלפון נשמר אך ורק לתקופה הנדרשת לתפעול הפעילות ולעמידה בדרישות הדין, ואינו מועבר לצדדים שלישיים לצורכי שיווק מטעמם.',
    ],
  },
};

interface Props {
  checked: boolean;
  onChange: (v: boolean) => void;
}

export default function SmsConsent({ checked, onChange }: Props) {
  const t = useTranslations(texts);
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <label
        style={{
          display: 'flex',
          alignItems: 'flex-start',
          gap: 8,
          color: 'rgba(255,255,255,0.9)',
          fontSize: 14,
          lineHeight: 1.4,
          textAlign: 'start',
          cursor: 'pointer',
        }}
      >
        {/* ponytail: appearance:none + overlay ✓ — native accentColor renders an invisible white-on-white check on some iOS/Android builds. */}
        <span
          style={{
            position: 'relative',
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 22,
            height: 22,
            flexShrink: 0,
            marginTop: 1,
          }}
        >
          <input
            type="checkbox"
            checked={checked}
            onChange={(e) => onChange(e.target.checked)}
            style={{
              margin: 0,
              width: '100%',
              height: '100%',
              appearance: 'none',
              WebkitAppearance: 'none',
              border: '2px solid #fff',
              borderRadius: 4,
              background: checked ? '#fff' : 'transparent',
              cursor: 'pointer',
            }}
            required
          />
          {checked && (
            <span
              aria-hidden
              style={{
                position: 'absolute',
                color: '#632e7d',
                fontSize: 16,
                fontWeight: 900,
                lineHeight: 1,
                pointerEvents: 'none',
              }}
            >
              ✓
            </span>
          )}
        </span>
        <span>
          {t.prefix}
          <button
            type="button"
            onClick={() => dialogRef.current?.showModal()}
            style={{
              background: 'none',
              border: 'none',
              color: '#fff',
              textDecoration: 'underline',
              cursor: 'pointer',
              padding: 0,
              font: 'inherit',
            }}
          >
            {t.link}
          </button>
          {t.suffix}
        </span>
      </label>

      <dialog
        ref={dialogRef}
        onClick={(e) => {
          if (e.target === dialogRef.current) dialogRef.current?.close();
        }}
        style={{
          border: 'none',
          borderRadius: 16,
          padding: 0,
          maxWidth: 'min(92vw, 420px)',
          width: '100%',
          maxHeight: '85dvh',
          background: '#fff',
          color: '#222',
        }}
      >
        <div
          style={{
            padding: '20px 22px',
            display: 'flex',
            flexDirection: 'column',
            gap: 12,
            maxHeight: '85dvh',
            overflowY: 'auto',
            boxSizing: 'border-box',
          }}
        >
          <h3 style={{ margin: 0, fontSize: 18, fontWeight: 800 }}>{t.title}</h3>
          {t.body.map((p, i) => (
            <p key={i} style={{ margin: 0, fontSize: 14, lineHeight: 1.5 }}>{p}</p>
          ))}
          <button
            type="button"
            onClick={() => dialogRef.current?.close()}
            style={{
              alignSelf: 'stretch',
              marginTop: 4,
              padding: '12px 18px',
              fontSize: 15,
              fontWeight: 700,
              color: '#fff',
              background: '#632e7d',
              border: 'none',
              borderRadius: 10,
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {t.close}
          </button>
        </div>
      </dialog>
    </>
  );
}
