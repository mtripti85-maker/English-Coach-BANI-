import { Scenario } from './types';

export const SCENARIOS: Scenario[] = [
  {
    id: 'job-interview',
    title: 'Job Interview with Hiring Manager',
    emoji: '💼',
    category: 'career',
    level: 'Intermediate',
    roleUser: 'Job Candidate',
    roleBani: 'HR Director / Senior Interviewer',
    scenarioContext: 'You are interviewing for a dream position at an innovative international company. BANI will ask real interview questions, assess your confidence, and gently rectify awkward phrasing or grammatical errors.',
    starterPrompt: 'Hello! Thank you for coming in today. Please take a seat! To start off, could you tell me a little bit about yourself and what brought you to our company?',
    goals: [
      'Introduce yourself clearly in 2-3 sentences',
      'Explain a previous achievement using Past Tense',
      'Express enthusiasm professionally'
    ],
    keyVocabulary: [
      { word: 'Spearheaded', meaning: 'Led or initiated an activity', example: 'I spearheaded a team project that boosted productivity.' },
      { word: 'Collaborative', meaning: 'Working well together with others', example: 'I thrive in collaborative cross-functional environments.' },
      { word: 'Deadline-driven', meaning: 'Able to complete tasks punctually', example: 'I am deadline-driven and maintain high quality under pressure.' }
    ],
    coverGradient: 'from-blue-600/30 via-indigo-600/20 to-slate-900',
  },
  {
    id: 'coffee-shop',
    title: 'Ordering at a Busy Cafe',
    emoji: '☕',
    category: 'daily',
    level: 'Beginner',
    roleUser: 'Cafe Customer',
    roleBani: 'Friendly Barista',
    scenarioContext: 'You just stepped into a bustling downtown coffee shop. The barista greets you with a warm smile. Order your drink, ask for custom milk or syrup, and pay.',
    starterPrompt: 'Hey there! Welcome to Bean & Brew! What can I get started for you today?',
    goals: [
      'Order a customized beverage (hot/iced, size, milk type)',
      'Politely ask about price or bakery items',
      'Use polite modals like "Could I please have..." or "I\'d like..."'
    ],
    keyVocabulary: [
      { word: 'Skim / Oat milk', meaning: 'Plant-based or low fat milk options', example: 'Could I get that with oat milk, please?' },
      { word: 'To-go / For here', meaning: 'Takeaway versus dining in', example: 'It is to-go, thank you!' },
      { word: 'Decaf', meaning: 'Decaffeinated coffee', example: 'Do you have a decaf option for the latte?' }
    ],
    coverGradient: 'from-amber-600/30 via-orange-600/20 to-slate-900',
  },
  {
    id: 'airport-travel',
    title: 'Airport Check-in & Gate Assistance',
    emoji: '✈️',
    category: 'travel',
    level: 'Intermediate',
    roleUser: 'International Traveler',
    roleBani: 'Airline Customer Service Agent',
    scenarioContext: 'You are at the international departure terminal checking your baggage, asking for a window seat, and inquiring about boarding time and gate location.',
    starterPrompt: 'Good morning! Welcome to SkyWings Airlines. Where are you flying to today, and may I please see your passport and booking reference?',
    goals: [
      'Present travel destination and baggage details',
      'Request seat preference politely',
      'Ask clear questions about transit and delays'
    ],
    keyVocabulary: [
      { word: 'Boarding pass', meaning: 'Document provided to board the aircraft', example: 'Here is your boarding pass for gate 14B.' },
      { word: 'Carry-on luggage', meaning: 'Bags brought inside the cabin', example: 'Is this backpack considered carry-on luggage?' },
      { word: 'Layover', meaning: 'A stop between connection flights', example: 'How long is the layover in London?' }
    ],
    coverGradient: 'from-cyan-600/30 via-blue-600/20 to-slate-900',
  },
  {
    id: 'business-meeting',
    title: 'Executive Team Meeting & Ideas Pitch',
    emoji: '📊',
    category: 'career',
    level: 'Advanced',
    roleUser: 'Project Lead',
    roleBani: 'Executive Vice President',
    scenarioContext: 'You are presenting your quarterly strategy updates. Discuss key milestones, handle polite objections, and persuade the executive team.',
    starterPrompt: 'Thanks everyone for dialing in on time. We have our project lead here. Could you walk us through the Q3 deliverables and any roadblocks your team faced?',
    goals: [
      'Present metrics and status updates smoothly',
      'Use diplomatic disagreement: "While I understand your point, I think..."',
      'Summarize next steps crisply'
    ],
    keyVocabulary: [
      { word: 'Bandwidth', meaning: 'Capacity or time available to handle tasks', example: 'Our engineering squad has limited bandwidth this sprint.' },
      { word: 'Bottleneck', meaning: 'A point of congestion that slows progress', example: 'The third-party review was our primary bottleneck.' },
      { word: 'Actionable takeaways', meaning: 'Clear practical next steps', example: 'Let us focus on three actionable takeaways before closing.' }
    ],
    coverGradient: 'from-violet-600/30 via-purple-600/20 to-slate-900',
  },
  {
    id: 'hotel-checkin',
    title: 'Hotel Check-In & Concierge',
    emoji: '🏨',
    category: 'travel',
    level: 'Beginner',
    roleUser: 'Hotel Guest',
    roleBani: 'Concierge & Front Desk Host',
    scenarioContext: 'You just arrived after a long flight at a luxury boutique hotel. Check into your room, ask about breakfast timings and Wi-Fi, and request a late checkout.',
    starterPrompt: 'Welcome to The Grand Orchid! How was your journey? May I have the name for the reservation?',
    goals: [
      'Confirm reservation details',
      'Ask about amenities (breakfast, pool, gym hours)',
      'Politely request room preferences or amenities'
    ],
    keyVocabulary: [
      { word: 'Complimentary', meaning: 'Provided free of charge', example: 'Breakfast is complimentary on the 2nd floor from 7 AM.' },
      { word: 'Keycard', meaning: 'Electronic card used to open hotel room doors', example: 'Here are two keycards for room 504.' },
      { word: 'Late checkout', meaning: 'Leaving the room past the standard checkout time', example: 'Could we request a late checkout at 1:00 PM?' }
    ],
    coverGradient: 'from-emerald-600/30 via-teal-600/20 to-slate-900',
  },
  {
    id: 'doctor-clinic',
    title: 'Medical Clinic & Doctor Visit',
    emoji: '🩺',
    category: 'emergency',
    level: 'Intermediate',
    roleUser: 'Patient',
    roleBani: 'Caring Physician / Doctor',
    scenarioContext: 'You have been feeling unwell with a persistent fever, cough, and throat irritation. Explain your symptoms clearly and answer the doctor’s diagnostic questions.',
    starterPrompt: 'Hello there. Come on in and make yourself comfortable. I see on the intake chart you\'ve not been feeling your best. When did the symptoms start?',
    goals: [
      'Accurately describe physical symptoms and duration',
      'Ask about side effects and dosage',
      'Clarify medical advice when unsure'
    ],
    keyVocabulary: [
      { word: 'Symptoms', meaning: 'Physical signs indicating illness', example: 'My main symptoms are a sore throat and mild headache.' },
      { word: 'Persisting', meaning: 'Continuing firmly over a period of time', example: 'The dry cough has been persisting for four days.' },
      { word: 'Prescription', meaning: 'Doctor\'s written instruction for medicine', example: 'I will write you a prescription for an antibiotic.' }
    ],
    coverGradient: 'from-rose-600/30 via-pink-600/20 to-slate-900',
  },
  {
    id: 'catchup-friend',
    title: 'Casual Catch-Up with a Close Friend',
    emoji: '🍕',
    category: 'social',
    level: 'Beginner',
    roleUser: 'Old Friend',
    roleBani: 'BANI (Your Best Friend)',
    scenarioContext: 'You are meeting your close buddy BANI at a cozy park or cafe. Chat about life, what you\'ve been up to lately, movies, food, and weekend plans.',
    starterPrompt: 'Heyyy! It feels like ages since we last hung out! How have you been? You look great! What\'s new with you?',
    goals: [
      'Use casual idioms and natural conversational flow',
      'Talk about leisure activities and personal hobbies',
      'React spontaneously to stories with phrases like "No way!" or "That sounds fun!"'
    ],
    keyVocabulary: [
      { word: 'Catch up', meaning: 'Talk with someone about recent news', example: 'It is so great to finally catch up in person!' },
      { word: 'Binge-watched', meaning: 'Watched many episodes in rapid succession', example: 'I binge-watched the entire new thriller season over the weekend.' },
      { word: 'Up to', meaning: 'Doing or planning', example: 'What are you up to this Sunday afternoon?' }
    ],
    coverGradient: 'from-yellow-600/30 via-amber-600/20 to-slate-900',
  },
  {
    id: 'shopping-mall',
    title: 'Shopping at a Clothing Store',
    emoji: '🛍️',
    category: 'daily',
    level: 'Beginner',
    roleUser: 'Shopper',
    roleBani: 'Helpful Store Assistant',
    scenarioContext: 'You are looking for an outfit for an upcoming family wedding or celebration. Ask for sizes, trial room locations, and payment discounts.',
    starterPrompt: 'Hi! Let me know if you are looking for anything in particular today. We have our new festive collection right over on this rack!',
    goals: [
      'Inquire about available sizes and colors',
      'Ask for the fitting/trial room',
      'Ask about ongoing deals or return exchange policy'
    ],
    keyVocabulary: [
      { word: 'Fitting room', meaning: 'Cubicle for trying on clothes', example: 'Where is the fitting room located?' },
      { word: 'Size down / Size up', meaning: 'Choosing a smaller or larger size', example: 'This feels a bit loose, could I size down to a Medium?' },
      { word: 'Refund policy', meaning: 'Terms for returning goods', example: 'What is your refund policy if the fit isn\'t right?' }
    ],
    coverGradient: 'from-pink-600/30 via-rose-600/20 to-slate-900',
  },
  {
    id: 'free-talk',
    title: 'Open Friendly Free Talk with Coach BANI',
    emoji: '✨',
    category: 'social',
    level: 'Intermediate',
    roleUser: 'English Learner',
    roleBani: 'English Coach BANI',
    scenarioContext: 'No script, no rigid topic! Talk with Coach BANI about anything under the sun: your dreams, daily routine, travel memories, or ask questions on how to improve your speaking.',
    starterPrompt: 'Hey there! I am so excited to practice with you today! I am your coach BANI. Think of me as your English-speaking buddy. Whatever is on your mind, let\'s chat! How was your day today?',
    goals: [
      'Speak freely without hesitation or fear of making mistakes',
      'Receive instant rectification and explanations for any errors',
      'Build natural fluency and confidence'
    ],
    keyVocabulary: [
      { word: 'Fluency', meaning: 'Speaking smoothly without awkward pauses', example: 'Practicing daily is the fastest route to fluency.' },
      { word: 'Articulate', meaning: 'Expressing ideas clearly and effectively', example: 'She is very articulate when expressing complex thoughts.' },
      { word: 'Rectification', meaning: 'The act of correcting or making something right', example: 'Instant mistake rectification helps cement proper grammar.' }
    ],
    coverGradient: 'from-purple-600/30 via-indigo-600/20 to-slate-900',
  }
];
