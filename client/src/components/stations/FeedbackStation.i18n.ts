export const texts = {
  en: {
    // One label per RATING_LEVELS entry, in the same order.
    levels: ['Not at all', 'Very little', 'A little', 'Moderately', 'A lot', 'Very much'],
    tapToChoose: 'Tap to choose',
    notesPlaceholder: 'Anything else?',
    finish: 'Finish',
    answerAll: (answered: number, total: number) => `Answer every question (${answered}/${total})`,
  },
  he: {
    levels: ['בכלל לא', 'במידה מועטה מאוד', 'במידה מועטה', 'במידה בינונית', 'במידה רבה', 'במידה רבה מאוד'],
    tapToChoose: 'לחצו לבחירה',
    notesPlaceholder: 'עוד הערות?',
    finish: 'סיום',
    answerAll: (answered: number, total: number) => `ענו על כל השאלות (${answered}/${total})`,
  },
};
