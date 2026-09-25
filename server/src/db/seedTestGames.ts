
import { connectDB } from './connection';
import { Game, Station, Activity } from '../models';

async function seed() {
  await connectDB();
  console.log('Connected to MongoDB');

  const orderGame = await Game.create({
    name: 'Test Order Game',
    type: 'order',
    description: 'A test order game with 2 rounds',
    settings: {
      instructions: 'Drag the items into the correct order. Good luck!',
      rounds: [
        {
          title: 'Sort the planets by distance from the Sun',
          cards: ['Mercury', 'Venus', 'Earth', 'Mars', 'Jupiter'],
        },
        {
          title: 'Sort these numbers from smallest to largest',
          cards: ['1', '5', '10', '50', '100'],
        },
      ],
      scoring: {
        firstAttemptPoints: 100,
        retryPoints: 50,
        speedBonus: false,
        timeLimitSeconds: 60,
      },
    },
  });
  console.log(`Created Order game: ${orderGame._id}`);

  const triviaGame = await Game.create({
    name: 'Test Trivia Game',
    type: 'trivia',
    description: 'A test trivia game with 3 questions',
    settings: {
      instructions: 'Select ALL correct answers for each question. You can pick more than one!',
      questions: [
        {
          text: 'Which of these are programming languages?',
          hint: 'There are 3 correct answers',
          answers: [
            { text: 'Python', isCorrect: true, explanation: 'Python is a popular programming language' },
            { text: 'HTML', isCorrect: false, explanation: 'HTML is a markup language, not a programming language' },
            { text: 'JavaScript', isCorrect: true, explanation: 'JavaScript is the language of the web' },
            { text: 'Rust', isCorrect: true, explanation: 'Rust is a systems programming language' },
            { text: 'Photoshop', isCorrect: false, explanation: 'Photoshop is an image editing application' },
          ],
        },
        {
          text: 'Which planets have rings?',
          answers: [
            { text: 'Saturn', isCorrect: true, explanation: 'Saturn is famous for its visible rings' },
            { text: 'Jupiter', isCorrect: true, explanation: 'Jupiter has faint rings discovered in 1979' },
            { text: 'Mars', isCorrect: false, explanation: 'Mars does not have rings' },
            { text: 'Uranus', isCorrect: true, explanation: 'Uranus has 13 known rings' },
          ],
        },
        {
          text: 'Which of these animals can fly?',
          hint: 'Think carefully!',
          answers: [
            { text: 'Eagle', isCorrect: true },
            { text: 'Penguin', isCorrect: false, explanation: 'Penguins are birds but cannot fly' },
            { text: 'Bat', isCorrect: true, explanation: 'Bats are the only mammals that can truly fly' },
            { text: 'Ostrich', isCorrect: false, explanation: 'Ostriches are flightless birds' },
          ],
        },
      ],
      scoring: {
        correctAnswerPoints: 10,
        wrongAnswerPenalty: 0,
        timeLimitSeconds: 10,
      },
      shuffleAnswers: true,
    },
  });
  console.log(`Created Trivia game: ${triviaGame._id}`);

  const station = await Station.create({
    name: 'Welcome Info',
    type: 'text',
    description: 'An introductory text station',
    settings: { content: 'Welcome to the test activity! Get ready for some fun games.' },
  });
  console.log(`Created Station: ${station._id}`);

  const activity = await Activity.create({
    name: 'Test Activity',
    loginFields: ['name'],
    connectionType: 'single',
    groups: [],
    module: {
      type: 'story',
      items: [
        { type: 'station', ref: station._id },
        { type: 'game', ref: orderGame._id },
        { type: 'game', ref: triviaGame._id },
      ],
    },
  });
  console.log(`Created Activity: ${activity.code}`);

  console.log('\n========================================');
  console.log(`Activity code: ${activity.code}`);
  console.log(`Play URL: http://localhost:5173/play/${activity.code}`);
  console.log('========================================\n');

  process.exit(0);
}

seed().catch((err) => {
  console.error('Seed failed:', err);
  process.exit(1);
});
