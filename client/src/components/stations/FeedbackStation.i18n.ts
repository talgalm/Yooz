export const texts = {
  en: {
    levels: ['Not at all', 'Very little', 'A little', 'Moderately', 'A lot', 'Very much'],
    tapToChoose: 'Tap to choose',
    notesPlaceholder: 'Anything else?',
    writeHere: 'Write here...',
    finish: 'Finish',
    answerAll: (answered: number, total: number) => `Answer every question (${answered}/${total})`,
  },
  he: {
    levels: ['בכלל לא', 'במידה מועטה מאוד', 'במידה מועטה', 'במידה בינונית', 'במידה רבה', 'במידה רבה מאוד'],
    tapToChoose: 'לחצו לבחירה',
    notesPlaceholder: 'עוד הערות?',
    writeHere: 'כתבו כאן...',
    finish: 'סיום',
    answerAll: (answered: number, total: number) => `ענו על כל השאלות (${answered}/${total})`,
  },
};
