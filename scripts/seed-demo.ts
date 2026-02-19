import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set in your environment');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function main() {
  const userId = process.argv[2];
  if (!userId) {
    console.error('Usage: ts-node scripts/seed-demo.ts <user-id>');
    process.exit(1);
  }

  console.log('Seeding demo data for user', userId);

  // create a sample book
  const { data: book, error: bookError } = await supabase
    .from('books')
    .insert([
      {
        user_id: userId,
        title: 'Sample Nursing Book',
        file_path: 'demo-sample.pdf',
        status: 'ready',
        total_chunks: 0,
      },
    ])
    .select('*')
    .single();

  if (bookError) {
    console.error('Error creating book:', bookError);
    process.exit(1);
  }

  console.log('Created book:', book);

  // create a couple of flashcards tied to that book
  const { data: flashcards, error: fcError } = await supabase
    .from('flashcards')
    .insert([
      {
        user_id: userId,
        book_id: book.id,
        topic: 'Nursing Fundamentals',
        question: 'What is the first step in patient assessment?',
        choices: ['Wash hands', 'Gather supplies', 'Introduce yourself', 'Take vital signs'],
        correct_answer: 'Introduce yourself',
        explanation: 'Always start by introducing yourself to build rapport.',
        hint: 'Start with greeting',
      },
      {
        user_id: userId,
        book_id: book.id,
        topic: 'Nursing Fundamentals',
        question: 'What does RICE stand for in first aid?',
        choices: ['Rest, Ice, Compression, Elevation', 'Run, Ignore, Create, Evaluate', 'Relax, Inhale, Compress, Exhale', 'Ready, Inspect, Care, Evaluate'],
        correct_answer: 'Rest, Ice, Compression, Elevation',
        explanation: 'RICE is a common mnemonic for treating sprains.',
        hint: 'Think first-aid steps for a sprain',
      },
    ])
    .select('*');

  if (fcError) {
    console.error('Error creating flashcards:', fcError);
    process.exit(1);
  }

  console.log(`Created ${flashcards.length} flashcards for book ${book.id}`);
  console.log('Done seeding demo data. Log in as the user to see it!');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
