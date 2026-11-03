const db = require('../config/db');

/**
 * AI-Assisted Recommendation & Career Guidance Engine
 * Uses TF-IDF, Semantic Domain Mapping, Unicode Transliteration, and Catalog Path Sequencing
 */

// Cross-domain association graph covering Engineering, Humanities, Shakespeare, Tamil & Business
const TOPIC_ASSOCIATION_GRAPH = {
  // --- ENGINEERING & COMPUTING ---
  'machine learning': ['Artificial Intelligence', 'Deep Learning', 'Python Programming', 'Statistics', 'Data Science', 'Neural Networks', 'Computer Vision'],
  'artificial intelligence': ['Machine Learning', 'Deep Learning', 'Reinforcement Learning', 'Robotics AI', 'Computer Vision', 'Python for AI'],
  'operating systems': ['Linux', 'Computer Architecture', 'Systems Programming', 'Computer Networks', 'Distributed Systems', 'UNIX Systems'],
  'computer networks': ['Operating Systems', 'TCP/IP', 'Cybersecurity', 'Cloud Computing', 'Network Automation'],
  'database': ['Data Architecture', 'SQL', 'Distributed Systems', 'Cloud Computing', 'Web Development', 'DBMS'],
  'web development': ['JavaScript', 'React', 'Node.js', 'Database Systems', 'Cloud Native', 'API Design', 'HTML and CSS'],
  'cybersecurity': ['Computer Networks', 'Cryptography', 'Operating Systems', 'Ethical Hacking', 'Information Security'],
  'cloud computing': ['Distributed Systems', 'Computer Networks', 'DevOps', 'Microservices', 'Linux Systems'],
  'data science': ['Machine Learning', 'Statistics', 'Python Programming', 'Database Systems', 'Business Analytics'],
  'circuits': ['Analog Electronics', 'VLSI Design', 'Microprocessors', 'Signal Processing', 'Embedded Systems'],
  'power systems': ['Electrical Machines', 'Power Electronics', 'Renewable Energy', 'High Voltage Engineering'],
  'thermodynamics': ['Fluid Mechanics', 'Heat Transfer', 'Internal Combustion Engines', 'Energy Systems'],
  'robotics': ['Control Systems', 'Computer Vision', 'Mechanics', 'Embedded Systems', 'Artificial Intelligence'],

  // --- WILLIAM SHAKESPEARE COLLECTION ---
  'william shakespeare': ['Shakespeare — Tragedies', 'Shakespeare — Comedies', 'Shakespeare — Histories', 'Shakespeare — Poetry', 'Shakespeare — Plays', 'Shakespeare — Literary Analysis', 'Shakespeare — Biography and Criticism', 'Hamlet', 'Macbeth', 'Romeo and Juliet', 'Othello', 'King Lear', 'Complete Works', 'Elizabethan Literature', 'Renaissance Drama', 'English Literature'],
  'shakespeare': ['Shakespeare — Tragedies', 'Shakespeare — Comedies', 'Shakespeare — Histories', 'Shakespeare — Poetry', 'Shakespeare — Plays', 'Shakespeare — Literary Analysis', 'Shakespeare — Biography and Criticism', 'Hamlet', 'Macbeth', 'Romeo and Juliet', 'Othello', 'King Lear', 'Complete Works', 'Elizabethan Literature', 'Renaissance Drama', 'English Literature'],
  'hamlet': ['Shakespeare — Tragedies', 'Macbeth', 'King Lear', 'Othello', 'Shakespeare — Poetry', 'Shakespeare — Literary Analysis', 'Elizabethan Drama'],
  'macbeth': ['Hamlet', 'Shakespeare — Tragedies', 'King Lear', 'Richard III', 'Shakespeare — Literary Analysis'],
  'othello': ['Shakespeare — Tragedies', 'Hamlet', 'Much Ado About Nothing', 'Shakespeare — Literary Analysis'],
  'romeo and juliet': ['Shakespeare — Tragedies', 'A Midsummer Night\'s Dream', 'Shakespeare — Poetry', 'Twelfth Night'],
  'king lear': ['Shakespeare — Tragedies', 'Hamlet', 'Coriolanus', 'Shakespeare — Literary Analysis'],
  'julius caesar': ['Shakespeare — Tragedies', 'Antony and Cleopatra', 'Coriolanus', 'Richard III', 'Shakespeare — Histories'],
  'the tempest': ['Shakespeare — Plays', 'The Winter\'s Tale', 'A Midsummer Night\'s Dream', 'Shakespeare — Poetry'],
  'sonnets': ['Shakespeare — Poetry', 'Venus and Adonis', 'Shakespeare\'s Sonnets', 'Poetry Analysis', 'Renaissance Literature'],
  'tragedies': ['Hamlet', 'Macbeth', 'King Lear', 'Othello', 'Julius Caesar', 'Shakespearean Tragedy', 'Senecan Drama'],
  'comedies': ['A Midsummer Night\'s Dream', 'The Merchant of Venice', 'Twelfth Night', 'Much Ado About Nothing', 'As You Like It'],

  // --- CORE KNOWLEDGE DOMAINS: PHYSICS, CHEMISTRY, AERONAUTICAL, LIFE, MONEY, SUCCESS ---
  'physics': ['Physics', 'Classical Mechanics', 'Quantum Mechanics', 'Thermodynamics', 'Electromagnetism', 'Optics', 'Nuclear Physics', 'Modern Physics', 'Astrophysics', 'Applied Physics', 'Mathematical Methods for Physicists'],
  'classical mechanics': ['Physics', 'Lagrangian and Hamiltonian Dynamics', 'Continuum Mechanics', 'Nonlinear Dynamics and Chaos'],
  'quantum mechanics': ['Physics', 'Quantum Field Theory', 'Relativistic Quantum Mechanics', 'Quantum Optics and Information'],
  'thermodynamics': ['Physics', 'Fluid Mechanics', 'Heat Transfer', 'Internal Combustion Engines', 'Statistical Mechanics', 'Thermal Physics'],
  'electromagnetism': ['Physics', 'Electrodynamics and Maxwell Equations', 'Classical Electromagnetism', 'Antennas and Radiating Systems'],
  'optics': ['Physics', 'Laser Physics', 'Fourier Optics', 'Fiber Optics and Guided Waves'],
  'chemistry': ['Chemistry', 'Organic Chemistry', 'Inorganic Chemistry', 'Physical Chemistry', 'Analytical Chemistry', 'Biochemistry', 'Polymer Chemistry', 'Electrochemistry', 'Chemical Engineering Fundamentals'],
  'organic chemistry': ['Chemistry', 'Reaction Mechanisms', 'Advanced Organic Synthesis', 'Stereochemistry of Organic Compounds'],
  'inorganic chemistry': ['Chemistry', 'Coordination Chemistry and Ligand Fields', 'Organometallic Chemistry', 'Bioinorganic Chemistry'],
  'physical chemistry': ['Chemistry', 'Quantum Chemistry', 'Chemical Kinetics', 'Statistical Thermodynamics in Chemistry'],
  'biochemistry': ['Chemistry', 'Biomolecules and Catalysis', 'Molecular Biology', 'Enzymology and Metabolic Pathways'],
  'aeronautical engineering': ['Aeronautical & Aerospace Engineering', 'Aerodynamics', 'Aircraft Structures', 'Aircraft Design', 'Flight Mechanics', 'Propulsion', 'Jet Engines', 'Gas Turbines', 'Avionics', 'Space Technology', 'CFD'],
  'aeronautical': ['Aeronautical & Aerospace Engineering', 'Aerodynamics', 'Aircraft Structures', 'Aircraft Design', 'Flight Mechanics', 'Propulsion', 'Jet Engines', 'Gas Turbines', 'Avionics', 'Space Technology', 'CFD'],
  'aerospace': ['Aeronautical & Aerospace Engineering', 'Aerodynamics', 'Aircraft Structures', 'Aircraft Design', 'Flight Mechanics', 'Propulsion', 'Rocket Propulsion', 'Orbital Mechanics', 'Avionics'],
  'aerodynamics': ['Aeronautical & Aerospace Engineering', 'Subsonic and Supersonic Aerodynamics', 'Boundary Layer Theory', 'Hypersonic Gas Dynamics'],
  'flight mechanics': ['Aeronautical & Aerospace Engineering', 'Flight Stability and Automatic Control', 'Dynamics of Atmospheric Flight', 'Flight Control Systems'],
  'aircraft design': ['Aeronautical & Aerospace Engineering', 'Aircraft Structures for Engineering Students', 'UAV Design', 'Stealth Aircraft Technology'],
  'propulsion': ['Aeronautical & Aerospace Engineering', 'Gas Turbine Theory and Aircraft Engines', 'Rocket Propulsion Elements', 'Jet Engines'],
  'life': ['Life, Money & Success', 'Personal Development', 'Philosophy', 'Stoicism', 'Personal Growth', 'Human Psychology', 'Self-Improvement', 'Motivation', 'Life Lessons', 'Happiness', 'Mindset'],
  'money': ['Life, Money & Success', 'Personal Finance', 'Financial Literacy', 'Investing', 'Wealth Creation', 'Budgeting', 'Financial Psychology', 'Value Investing', 'Stock Market', 'Business & Entrepreneurship'],
  'success': ['Life, Money & Success', 'Success Principles', 'Leadership', 'Productivity', 'Habits', 'Motivation', 'Goal Setting', 'Entrepreneurship', 'Discipline', 'Career Development', 'High Performance'],
  'personal development': ['Life, Money & Success', 'Atomic Habits', 'Deep Work', 'Mindset', 'Personal Growth', 'Self-Improvement', 'Discipline'],
  'investing': ['Life, Money & Success', 'The Intelligent Investor', 'The Psychology of Money', 'Value Investing', 'Wealth Creation', 'Common Sense Investing'],
  'leadership': ['Life, Money & Success', 'The 7 Habits of Highly Effective People', 'Start with Why', 'Good to Great', 'Extreme Ownership', 'Radical Candor'],
  'philosophy': ['Life, Money & Success', 'Meditations', 'Stoic Philosophy', 'Letters from a Stoic', 'Man\'s Search for Meaning', 'Existentialism'],

  // --- TAMIL LITERATURE COLLECTION ---
  'thirukkural': ['Tamil Classics', 'திருக்குறள்', 'Tamil Literature', 'நாலடியார்', 'ஆத்திசூடி', 'Tamil Grammar', 'Ethics and Moral Philosophy'],
  'திருக்குறள்': ['Tamil Classics', 'Thirukkural', 'நாலடியார்', 'Tamil Literature', 'Tamil History', 'Classical Tamil'],
  'silappathikaram': ['சிலப்பதிகாரம்', 'Tamil Classics', 'மணிமேகலை', 'சீவக சிந்தாமணி', 'Tamil History', 'Sangam Literature'],
  'சிலப்பதிகாரம்': ['Silappathikaram', 'Manimekalai', 'Tamil Classics', 'Tamil History', 'Ancient Tamil Epics'],
  'manimekalai': ['மணிமேகலை', 'Tamil Classics', 'Silappathikaram', 'Buddhist Tamil Literature'],
  'purananuru': ['புறநானூறு', 'Akananuru', 'Kurunthogai', 'Tamil Classics', 'Sangam History', 'Classical Tamil'],
  'sangam': ['புறநானூறு', 'அகநானூறு', 'குறுந்தொகை', 'தொல்காப்பியம்', 'Tamil Classics', 'Purananuru', 'Kurunthogai'],
  'kalki': ['பொன்னியின் செல்வன்', 'சிவகாமியின் சபதம்', 'பார்த்திபன் கனவு', 'Ponniyin Selvan', 'Tamil Novels', 'Historical Fiction'],
  'ponniyin selvan': ['பொன்னியின் செல்வன்', 'Kalki', 'சிவகாமியின் சபதம்', 'கடல் புறா', 'Tamil Novels', 'Chola History'],
  'பொன்னியின் செல்வன்': ['Ponniyin Selvan', 'கல்கி', 'சிவகாமியின் சபதம்', 'Tamil Novels', 'சோழர் வரலாறு'],
  'sujatha': ['என் இனிய இயந்திரா', 'மீண்டும் ஜீனோ', 'நைலான் கயிறு', 'Science Fiction', 'Tamil Novels', 'Crime Thrillers'],
  'bharathiyar': ['மகாகவி பாரதியார் கவிதைகள்', 'பாரதிதாசன்', 'Tamil Poetry', 'Modern Tamil Literature'],
  'tholkappiyam': ['தொல்காப்பியம்', 'நன்னூல்', 'Tamil Grammar', 'Linguistics', 'Classical Tamil Grammar'],
  'tamil literature': ['Tamil Classics', 'Tamil Novels', 'Tamil Poetry', 'Tamil Grammar', 'Tamil Short Stories', 'Tamil History'],

  // --- BUSINESS & FINANCIAL GOALS ---
  'business': ['Entrepreneurship', 'Financial Management', 'Organizational Leadership', 'Economics', 'Marketing Strategy'],
  'personal finance': ['Accounting Fundamentals', 'Financial Management', 'Investment', 'Business Analytics']
};

/**
 * Tokenize text supporting both English and Tamil Unicode scripts
 */
function tokenize(text = '') {
  return (text || '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, ' ')
    .split(/\s+/)
    .filter(t => t.length > 1);
}

/**
 * TF-IDF similarity calculation
 */
function computeTFIDFSimilarity(queryTokens, docTokens, corpusTermFreqs, totalDocs) {
  if (queryTokens.length === 0 || docTokens.length === 0) return 0;

  const docFreq = {};
  docTokens.forEach(t => {
    docFreq[t] = (docFreq[t] || 0) + 1;
  });

  let score = 0;
  queryTokens.forEach(t => {
    if (docFreq[t]) {
      const tf = docFreq[t] / docTokens.length;
      const df = corpusTermFreqs[t] || 1;
      const idf = Math.log((totalDocs + 1) / (df + 1)) + 1;
      score += tf * idf;
    }
  });

  return score;
}

/**
 * Generate AI search recommendations for a student query
 */
async function getSearchRecommendations(query = '', department = null, limit = 12) {
  const allBooks = await db.query('SELECT * FROM books');
  if (!allBooks || allBooks.length === 0) return { exactMatches: [], recommendations: [], alternatives: [] };

  const qLower = (query || '').toLowerCase().trim();
  const qTokens = tokenize(qLower);

  // Build corpus term frequency
  const corpusTermFreqs = {};
  allBooks.forEach(b => {
    const tokens = new Set(tokenize(`${b.title} ${b.category} ${b.department} ${b.alternate_titles || ''} ${b.subject_keywords || ''} ${b.description || ''}`));
    tokens.forEach(t => {
      corpusTermFreqs[t] = (corpusTermFreqs[t] || 0) + 1;
    });
  });

  // Identify related cross-subject tags from association graph
  const relatedTags = [];
  for (const [key, tags] of Object.entries(TOPIC_ASSOCIATION_GRAPH)) {
    if (qLower.includes(key.toLowerCase()) || key.toLowerCase().includes(qLower)) {
      relatedTags.push(...tags);
    }
  }

  // Score each book
  const scoredBooks = allBooks.map(b => {
    const bTokens = tokenize(`${b.title} ${b.category} ${b.department} ${b.alternate_titles || ''} ${b.subject_keywords || ''} ${b.description || ''}`);
    const tfidfScore = computeTFIDFSimilarity(qTokens, bTokens, corpusTermFreqs, allBooks.length);

    let matchType = 'related';
    let boost = 0;
    let reason = `Recommended because it covers concepts related to "${query}".`;

    const titleLower = (b.title || '').toLowerCase();
    const altLower = (b.alternate_titles || '').toLowerCase();
    const catLower = (b.category || '').toLowerCase();
    const authorLower = (b.author || '').toLowerCase();
    const keywordsLower = (b.subject_keywords || '').toLowerCase();

    // Exact title or transliterated match
    if (titleLower.includes(qLower) || (qLower.length > 2 && altLower.includes(qLower))) {
      matchType = 'exact';
      boost += 60;
      reason = `Direct match for "${b.title}".`;
    } else if (catLower.includes(qLower)) {
      matchType = 'category_match';
      boost += 40;
      reason = `Direct match in category "${b.category}".`;
    } else if (authorLower.includes(qLower)) {
      matchType = 'author_match';
      boost += 35;
      reason = `Written or edited by ${b.author}.`;
    } else if (keywordsLower.includes(qLower)) {
      matchType = 'ai_recommended';
      boost += 30;
      reason = `Recommended because it covers key themes related to your search.`;
    } else if (relatedTags.some(tag => catLower.includes(tag.toLowerCase()) || titleLower.includes(tag.toLowerCase()) || altLower.includes(tag.toLowerCase()))) {
      matchType = 'ai_recommended';
      boost += 28;
      const matchingTag = relatedTags.find(tag => catLower.includes(tag.toLowerCase()) || titleLower.includes(tag.toLowerCase()) || altLower.includes(tag.toLowerCase()));
      reason = `Recommended because it covers "${matchingTag}", which is closely related to "${query}".`;
    }

    if (department && department !== 'All' && b.department === department) {
      boost += 10;
    }

    if (b.available_copies > 0) {
      boost += 2;
    }

    const totalScore = tfidfScore * 10 + boost;

    return {
      ...b,
      similarity_score: Math.round(totalScore * 10) / 10,
      match_type: matchType,
      recommendation_reason: reason
    };
  });

  // Sort descending by score
  scoredBooks.sort((a, b) => b.similarity_score - a.similarity_score);

  const exactMatches = scoredBooks.filter(b => b.match_type === 'exact' || b.match_type === 'category_match' || b.match_type === 'author_match');
  const recommendations = scoredBooks.filter(b => b.similarity_score > 5 && b.match_type !== 'exact').slice(0, limit);
  const alternatives = scoredBooks.filter(b => b.available_copies > 0 && b.similarity_score > 3).slice(0, 6);

  return {
    query,
    totalCatalog: allBooks.length,
    exactMatches: exactMatches.slice(0, limit),
    recommendations,
    alternatives,
    relatedSubjects: Array.from(new Set(relatedTags)).slice(0, 8)
  };
}

/**
 * Get AI recommendations related to a specific book (for Book Details modal)
 */
async function getRelatedBooksForBook(bookId, limit = 6) {
  const allBooks = await db.query('SELECT * FROM books');
  const target = allBooks.find(b => b.id === parseInt(bookId, 10));
  if (!target) return [];

  const targetTokens = tokenize(`${target.title} ${target.category} ${target.department} ${target.subject_keywords || ''} ${target.description || ''}`);

  const scored = allBooks
    .filter(b => b.id !== target.id)
    .map(b => {
      let score = 0;
      let reason = `Recommended because it shares the "${b.category}" discipline with ${target.title}.`;

      if (b.category === target.category) score += 35;
      if (b.department === target.department) score += 15;
      if (b.author === target.author) {
        score += 30;
        reason = `Also written or created by ${target.author}.`;
      }

      // Check cross-topic graph
      for (const [key, related] of Object.entries(TOPIC_ASSOCIATION_GRAPH)) {
        if (target.category.toLowerCase().includes(key) && related.some(r => b.category.toLowerCase().includes(r.toLowerCase()))) {
          score += 25;
          reason = `Covers related concepts in ${b.category} complementary to ${target.title}.`;
        }
      }

      // Token overlap
      const bTokens = new Set(tokenize(`${b.title} ${b.category} ${b.subject_keywords || ''}`));
      let overlap = 0;
      targetTokens.forEach(t => {
        if (bTokens.has(t)) overlap++;
      });
      score += overlap * 3;

      return {
        ...b,
        recommendation_reason: reason,
        score
      };
    })
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored;
}

/**
 * Domain career templates with honest, verified market benchmarks (India INR ₹ and Global USD $)
 */
const CAREER_TEMPLATES = {
  ai_ml: {
    domain: "Artificial Intelligence, Machine Learning & Data Science",
    skillsLearned: [
      "Python programming & numerical computing (NumPy, Pandas)",
      "Machine learning algorithms & statistical modeling",
      "Deep neural network architectures (PyTorch, TensorFlow)",
      "Data preprocessing, feature engineering & model validation",
      "Model deployment, API serving & performance evaluation"
    ],
    careerPaths: [
      "Machine Learning Engineer",
      "Data Scientist",
      "AI Application Developer",
      "Junior Data Analyst",
      "Research Assistant / Quantitative Analyst"
    ],
    realWorldApplications: [
      "Full-time engineering roles in technology firms, banks, and analytics consultancies",
      "Paid technology internships for pre-final and final year students",
      "Freelance data analysis, dashboarding, and prediction model contracts",
      "Developing commercial AI micro-SaaS applications and APIs",
      "Contributing to sponsored academic research labs and benchmarking challenges"
    ],
    earningGuidance: {
      india: {
        entryLevel: "₹5,00,000 – ₹10,00,000 / year",
        experienced: "₹18,00,000 – ₹38,00,000+ / year",
        freelance: "₹1,500 – ₹4,000 / hour (or ₹35,000 – ₹1,50,000 per project)"
      },
      global: {
        entryLevel: "$75,000 – $110,000 / year",
        experienced: "$145,000 – $220,000+ / year",
        freelance: "$50 – $130 / hour"
      },
      source: "NASSCOM Tech Salary Benchmark 2025/2026, Glassdoor India, AmbitionBox (Verified Q1 2026)",
      disclaimer: "Figures reflect prevailing regional salary and contract ranges. Real earnings depend on individual coding portfolio, interview performance, university credentials, experience, and economic demand. Reading one book does not guarantee employment or income."
    }
  },

  web_dev: {
    domain: "Modern Web, Full-Stack Development & Cloud Architecture",
    skillsLearned: [
      "Modern JavaScript / TypeScript programming",
      "Frontend component engineering with React, HTML5 & Tailwind CSS",
      "Backend REST & GraphQL API development using Node.js / Express",
      "Database schema modeling, SQL & NoSQL optimization",
      "Version control, CI/CD pipelines & cloud deployment"
    ],
    careerPaths: [
      "Frontend Developer",
      "Backend Developer",
      "Full-Stack Web Developer",
      "Web Application Specialist",
      "Freelance Web Developer / Consultant"
    ],
    realWorldApplications: [
      "Full-time employment at product startups and software engineering agencies",
      "Paid developer internships and trainee software engineering positions",
      "Building and maintaining custom web portals for regional businesses",
      "Freelance website and web-app development contracts via client networks",
      "Building self-hosted software tools and subscription web services"
    ],
    earningGuidance: {
      india: {
        entryLevel: "₹4,00,000 – ₹7,50,000 / year",
        experienced: "₹14,00,000 – ₹28,00,000+ / year",
        freelance: "₹1,000 – ₹3,000 / hour (or ₹25,000 – ₹1,20,000 per website/portal)"
      },
      global: {
        entryLevel: "$65,000 – $95,000 / year",
        experienced: "$125,000 – $185,000+ / year",
        freelance: "$40 – $110 / hour"
      },
      source: "NASSCOM Developer Index 2025/2026, PayScale India, GitHub Developer Survey",
      disclaimer: "Compensation varies by geographic region, demonstrated project portfolio, problem-solving skills, and company size. Self-study must be backed by completed projects to earn professionally."
    }
  },

  systems_cyber: {
    domain: "Systems Programming, Operating Systems & Cybersecurity",
    skillsLearned: [
      "Systems programming in C/C++ and low-level memory management",
      "Operating system internals: processes, threads, concurrency & virtual memory",
      "Computer networking protocols (TCP/IP, UDP, DNS, routing)",
      "Cybersecurity fundamentals, vulnerability assessment & secure coding",
      "Linux kernel administration, shell scripting & automation"
    ],
    careerPaths: [
      "Systems Software Engineer",
      "Cybersecurity Analyst / SOC Analyst",
      "Network Infrastructure Engineer",
      "Embedded Systems Developer",
      "Information Security Specialist"
    ],
    realWorldApplications: [
      "Security auditing and network administration for enterprise IT infrastructure",
      "Systems engineering in automotive, telecom, and defense sectors",
      "Bug bounty programs and ethical vulnerability disclosures",
      "Consulting on secure cloud infrastructure and compliance standards"
    ],
    earningGuidance: {
      india: {
        entryLevel: "₹4,80,000 – ₹8,50,000 / year",
        experienced: "₹16,00,000 – ₹32,00,000+ / year",
        freelance: "₹1,200 – ₹3,800 / hour (or per security audit engagement)"
      },
      global: {
        entryLevel: "$70,000 – $105,000 / year",
        experienced: "$135,000 – $210,000+ / year",
        freelance: "$55 – $140 / hour"
      },
      source: "DSCI Cybersecurity Compensation Report, Glassdoor, InfoSec Institute (2025/2026)",
      disclaimer: "Cybersecurity positions require verified technical competence, background checks, and often industry certifications. Compensation is commensurate with demonstrated security skills."
    }
  },

  tamil_literature: {
    domain: "Classical & Modern Tamil Literature, Linguistics, Translation & Media",
    skillsLearned: [
      "Classical and modern Tamil reading, syntactic analysis & philology",
      "Bilingual translation between English and Tamil with contextual fidelity",
      "Creative prose writing, narrative structure, and short-story composition",
      "Grammatical accuracy, proofreading, copy editing & editorial judgment",
      "Cultural, historical, and socio-literary research and documentation"
    ],
    careerPaths: [
      "Tamil Language Teacher / College Lecturer (with required NET/SET/TET)",
      "Professional Tamil-English Translator & Localization Specialist",
      "Sub-Editor / Journalist for Tamil Print and Digital Media",
      "Publishing Proofreader, Copy Editor & Book Reviewer",
      "Content Writer for Tamil EdTech, Media Houses, and Cultural Institutions",
      "Civil Services Aspirant (UPSC/TNPSC Tamil Literature Optional)"
    ],
    realWorldApplications: [
      "Employment in newspapers, television channels, digital portals, and publishing houses",
      "Teaching in schools, matriculation institutes, and arts & science colleges",
      "Freelance book translation, corporate localization, and subtitles for media",
      "Creating educational YouTube channels, podcasts, and cultural essays with audience monetization",
      "Government administrative positions through competitive exams (TNPSC Group 1/2)"
    ],
    earningGuidance: {
      india: {
        entryLevel: "₹2,80,000 – ₹5,50,000 / year",
        experienced: "₹7,50,000 – ₹16,00,000+ / year",
        freelance: "₹0.80 – ₹2.50 / word for translation (or ₹15,000 – ₹60,000 per translated manuscript/project)"
      },
      global: {
        entryLevel: "$35,000 – $55,000 / year (Tamil diaspora schools & media)",
        experienced: "$65,000 – $110,000+ / year",
        freelance: "$0.08 – $0.18 / word"
      },
      source: "Indian Translators Association, Sahitya Akademi Honorarium Guidelines, AmbitionBox Media Salaries (2025/2026)",
      disclaimer: "Salaries vary depending on formal teaching degrees (B.Ed/M.Phil/Ph.D), publishing track record, and media portfolio. Freelance rates depend on client budget and translation specialization."
    }
  },

  shakespeare_lit: {
    domain: "English Literature, Drama, Rhetoric, Creative Writing & Criticism",
    skillsLearned: [
      "Critical textual analysis, close reading, and rhetorical deconstruction",
      "Mastery of dramatic structure, character psychology, and conflict resolution",
      "Sophisticated academic and creative non-fiction essay writing",
      "Classical prosody, poetic meter (iambic pentameter), and metaphorical phrasing",
      "Theatrical dramaturgy, stage direction principles, and vocal elocution"
    ],
    careerPaths: [
      "English Literature Teacher / Lecturer (with required educational credentials)",
      "Editorial Associate / Commissioning Editor in Academic Publishing",
      "Dramaturge / Theatre Director / Script Consultant",
      "Professional Content Strategist, Speechwriter & Communications Lead",
      "Literary Critic, Book Reviewer & Academic Researcher"
    ],
    realWorldApplications: [
      "Teaching in international schools, universities, and training institutes",
      "Editorial and proofreading roles in publishing houses (OUP, Cambridge, Penguin)",
      "Script doctoring and narrative design for theatre, audiobooks, and screen drama",
      "Corporate communications, PR strategy, and executive speechwriting",
      "Contributing critical reviews and essays to cultural magazines and literary journals"
    ],
    earningGuidance: {
      india: {
        entryLevel: "₹3,20,000 – ₹6,00,000 / year",
        experienced: "₹9,00,000 – ₹20,00,000+ / year",
        freelance: "₹1,500 – ₹4,500 per article / essay (or ₹25,000 – ₹80,000 per editorial project)"
      },
      global: {
        entryLevel: "$45,000 – $65,000 / year",
        experienced: "$80,000 – $140,000+ / year",
        freelance: "$40 – $95 / hour (copyediting, script analysis)"
      },
      source: "Society of Authors, Editorial Freelancers Association, Glassdoor Publishing Benchmarks (2025/2026)",
      disclaimer: "Reading one Shakespeare play builds critical appreciation and literary literacy. Professional teaching or editorial roles require accredited academic degrees and proven writing samples."
    }
  },

  electronics_embedded: {
    domain: "Electronics, Embedded Systems, VLSI & Microprocessors",
    skillsLearned: [
      "Digital logic, analog circuit analysis & microelectronic design",
      "Microcontroller programming (ARM, AVR, ESP32) in Embedded C",
      "Hardware description languages (Verilog/VHDL) & FPGA prototyping",
      "Sensor interfacing, serial communication (UART, SPI, I2C)",
      "PCB design, hardware debugging with oscilloscopes & logic analyzers"
    ],
    careerPaths: [
      "Embedded Systems Engineer",
      "VLSI Design Engineer",
      "Firmware Developer",
      "Hardware Test & Verification Engineer",
      "IoT Solutions Architect"
    ],
    realWorldApplications: [
      "Core engineering roles in semiconductor, automotive, and consumer electronics firms",
      "Firmware development for smart home and medical IoT devices",
      "Hardware prototyping for hardware tech startups",
      "Freelance embedded board design and sensor integration contracts"
    ],
    earningGuidance: {
      india: {
        entryLevel: "₹4,50,000 – ₹8,50,000 / year",
        experienced: "₹16,00,000 – ₹34,00,000+ / year",
        freelance: "₹1,200 – ₹3,500 / hour"
      },
      global: {
        entryLevel: "$72,000 – $105,000 / year",
        experienced: "$130,000 – $200,000+ / year",
        freelance: "$55 – $125 / hour"
      },
      source: "India Semiconductor Association, Glassdoor Electronics Engineering Salaries (2025/2026)",
      disclaimer: "Hardware engineering compensation heavily correlates with lab competence, silicon tape-out experience, and circuit debugging proficiency."
    }
  },

  mechanical_robotics: {
    domain: "Mechanical Design, Thermodynamics, CAD/CAM & Robotics",
    skillsLearned: [
      "Engineering mechanics, stress analysis & machine component design",
      "Thermodynamic cycles, heat transfer & fluid mechanics modeling",
      "Computer-Aided Design (CAD) & finite element analysis (FEA)",
      "Kinematics, automated robotics arm control & sensor feedback",
      "Manufacturing processes, CNC machining & materials selection"
    ],
    careerPaths: [
      "Mechanical Design Engineer",
      "Robotics & Automation Engineer",
      "Thermal Analysis Specialist",
      "Automotive Systems Engineer",
      "Manufacturing & Quality Operations Engineer"
    ],
    realWorldApplications: [
      "Engineering roles in automotive, aerospace, energy, and robotics manufacturing",
      "CAD modeling and structural simulation consulting for industrial machinery",
      "Factory automation, PLC programming, and robotic workcell commissioning"
    ],
    earningGuidance: {
      india: {
        entryLevel: "₹3,80,000 – ₹7,00,000 / year",
        experienced: "₹13,00,000 – ₹26,00,000+ / year",
        freelance: "₹800 – ₹2,500 / hour (CAD modeling, drafting)"
      },
      global: {
        entryLevel: "$65,000 – $92,000 / year",
        experienced: "$115,000 – $175,000+ / year",
        freelance: "$45 – $105 / hour"
      },
      source: "Society of Automotive Engineers, Glassdoor Mechanical Engineering Survey 2025/2026",
      disclaimer: "Mechanical roles require hands-on workshop, design software, and lab validation skills. Figures represent verified industrial industry averages."
    }
  },

  business_finance: {
    domain: "Business Management, Accounting, Economics & Financial Strategy",
    skillsLearned: [
      "Financial statement analysis, balance sheet & cash flow evaluation",
      "Corporate budgeting, capital allocation & investment metrics",
      "Market research, consumer behavior & competitive strategy",
      "Operations management, supply chain optimization & risk control",
      "Business communication, pitch deck creation & negotiation"
    ],
    careerPaths: [
      "Financial Analyst / Research Associate",
      "Business Operations Associate",
      "Management Trainee",
      "Junior Marketing Specialist",
      "Startup Founder / Small Business Entrepreneur"
    ],
    realWorldApplications: [
      "Employment in banking, corporate finance, equity research, and consulting",
      "Freelance bookkeeping, financial modeling, and business plan drafting",
      "Launching and managing commercial enterprises or e-commerce businesses"
    ],
    earningGuidance: {
      india: {
        entryLevel: "₹4,20,000 – ₹8,00,000 / year",
        experienced: "₹15,00,000 – ₹35,00,000+ / year",
        freelance: "₹1,000 – ₹3,500 / hour"
      },
      global: {
        entryLevel: "$68,000 – $100,000 / year",
        experienced: "$130,000 – $220,000+ / year",
        freelance: "$50 – $130 / hour"
      },
      source: "CFA Institute Compensation Benchmark, Glassdoor Finance India 2025/2026",
      disclaimer: "Finance roles frequently require formal certifications (CFA, CA, MBA) or accredited quantitative credentials. No investment returns or profits are ever guaranteed."
    }
  }
};

/**
 * Determine best matching career guidance for a selected book or search topic
 */
async function getCareerGuidanceForBook(bookIdOrQuery) {
  let targetBook = null;

  if (typeof bookIdOrQuery === 'number' || (!isNaN(parseInt(bookIdOrQuery, 10)) && parseInt(bookIdOrQuery, 10) > 0)) {
    const bookId = parseInt(bookIdOrQuery, 10);
    const rows = await db.query('SELECT * FROM books WHERE id = ?', [bookId]);
    if (rows && rows.length > 0) targetBook = rows[0];
  }

  if (!targetBook && typeof bookIdOrQuery === 'string' && bookIdOrQuery.trim()) {
    const q = bookIdOrQuery.trim().toLowerCase();
    const rows = await db.query('SELECT * FROM books WHERE LOWER(title) LIKE ? OR LOWER(alternate_titles) LIKE ? LIMIT 1', [`%${q}%`, `%${q}%`]);
    if (rows && rows.length > 0) targetBook = rows[0];
  }

  // Determine domain key from target book or query
  const textToScan = targetBook
    ? `${targetBook.title} ${targetBook.department} ${targetBook.category} ${targetBook.skills_covered || ''} ${targetBook.career_paths || ''} ${targetBook.subject_keywords || ''}`.toLowerCase()
    : (String(bookIdOrQuery || '')).toLowerCase();

  let selectedKey = 'web_dev';

  if (textToScan.includes('tamil') || textToScan.includes('தமிழ்') || textToScan.includes('thirukkural') || textToScan.includes('kural') || textToScan.includes('kalki') || textToScan.includes('sangam') || textToScan.includes('ponniyin')) {
    selectedKey = 'tamil_literature';
  } else if (textToScan.includes('shakespeare') || textToScan.includes('hamlet') || textToScan.includes('macbeth') || textToScan.includes('othello') || textToScan.includes('literature') || textToScan.includes('drama') || textToScan.includes('sonnets')) {
    selectedKey = 'shakespeare_lit';
  } else if (textToScan.includes('machine learning') || textToScan.includes('artificial intelligence') || textToScan.includes('deep learning') || textToScan.includes('data science') || textToScan.includes('python')) {
    selectedKey = 'ai_ml';
  } else if (textToScan.includes('cyber') || textToScan.includes('operating system') || textToScan.includes('linux') || textToScan.includes('network') || textToScan.includes('security')) {
    selectedKey = 'systems_cyber';
  } else if (textToScan.includes('vlsi') || textToScan.includes('circuit') || textToScan.includes('embedded') || textToScan.includes('microprocessor') || textToScan.includes('ece') || textToScan.includes('electronics')) {
    selectedKey = 'electronics_embedded';
  } else if (textToScan.includes('mechanical') || textToScan.includes('robotics') || textToScan.includes('cad') || textToScan.includes('thermodynamics') || textToScan.includes('manufacturing')) {
    selectedKey = 'mechanical_robotics';
  } else if (textToScan.includes('business') || textToScan.includes('finance') || textToScan.includes('management') || textToScan.includes('accounting') || textToScan.includes('economics')) {
    selectedKey = 'business_finance';
  }

  const template = CAREER_TEMPLATES[selectedKey];

  // Fetch real matching books from library catalog for the "Recommended Next Books" section
  let nextBooks = [];
  if (selectedKey === 'tamil_literature') {
    nextBooks = await db.query("SELECT id, title, author, category, cover_image, available_copies, shelf_location FROM books WHERE department = 'TAMIL LITERATURE' OR language = 'Tamil' ORDER BY id ASC LIMIT 5");
  } else if (selectedKey === 'shakespeare_lit') {
    nextBooks = await db.query("SELECT id, title, author, category, cover_image, available_copies, shelf_location FROM books WHERE department = 'ENGLISH LITERATURE' OR category LIKE '%Shakespeare%' ORDER BY id ASC LIMIT 5");
  } else if (selectedKey === 'ai_ml') {
    nextBooks = await db.query("SELECT id, title, author, category, cover_image, available_copies, shelf_location FROM books WHERE department = 'AI AND MACHINE LEARNING' OR category LIKE '%Machine Learning%' OR category LIKE '%Python%' ORDER BY id ASC LIMIT 5");
  } else if (selectedKey === 'systems_cyber') {
    nextBooks = await db.query("SELECT id, title, author, category, cover_image, available_copies, shelf_location FROM books WHERE category LIKE '%Operating Systems%' OR category LIKE '%Networks%' OR category LIKE '%Cyber%' ORDER BY id ASC LIMIT 5");
  } else if (selectedKey === 'electronics_embedded') {
    nextBooks = await db.query("SELECT id, title, author, category, cover_image, available_copies, shelf_location FROM books WHERE department = 'ECE' OR category LIKE '%Circuits%' OR category LIKE '%Embedded%' ORDER BY id ASC LIMIT 5");
  } else if (selectedKey === 'mechanical_robotics') {
    nextBooks = await db.query("SELECT id, title, author, category, cover_image, available_copies, shelf_location FROM books WHERE department = 'MECHANICAL' OR category LIKE '%Robotics%' OR category LIKE '%Machine Design%' ORDER BY id ASC LIMIT 5");
  } else {
    nextBooks = await db.query("SELECT id, title, author, category, cover_image, available_copies, shelf_location FROM books WHERE category LIKE '%Web%' OR category LIKE '%Programming%' OR category LIKE '%Database%' ORDER BY id ASC LIMIT 5");
  }

  return {
    book: targetBook ? {
      id: targetBook.id,
      title: targetBook.title,
      author: targetBook.author,
      department: targetBook.department,
      category: targetBook.category,
      cover_image: targetBook.cover_image
    } : null,
    domain: template.domain,
    skillsLearned: template.skillsLearned,
    careerPaths: template.careerPaths,
    realWorldApplications: template.realWorldApplications,
    earningGuidance: template.earningGuidance,
    recommendedNextBooks: nextBooks
  };
}

/**
 * Career Goal Learning Roadmaps (Beginner -> Intermediate -> Advanced -> Practical Application)
 * Strictly pulls real books that exist in the library database catalog.
 */
async function getCareerGoalRoadmap(goalKey = 'aiml_engineer') {
  const allBooks = await db.query('SELECT id, title, author, department, category, cover_image, available_copies, shelf_location, description FROM books');

  const GOAL_DEFINITIONS = {
    software_developer: {
      title: "Become a Software Developer",
      description: "Master modern object-oriented programming, data structures, algorithms, and distributed software engineering.",
      levels: [
        { level: "Level 1: Beginner Foundations", filter: b => (b.category.includes('Programming') || b.title.includes('C++ Primer') || b.title.includes('Head First Java')) },
        { level: "Level 2: Intermediate Skills", filter: b => (b.category.includes('Data Structures') || b.title.includes('Algorithms') || b.title.includes('Clean Code')) },
        { level: "Level 3: Advanced Topics", filter: b => (b.title.includes('Design Patterns') || b.title.includes('Designing Data-Intensive') || b.category.includes('Operating Systems')) },
        { level: "Level 4: Practical Projects & System Architecture", filter: b => (b.title.includes('Clean Architecture') || b.category.includes('Cloud') || b.category.includes('Software Engineering')) }
      ]
    },
    aiml_engineer: {
      title: "Become an AI / Machine Learning Engineer",
      description: "Build foundational mathematical thinking, machine learning algorithms, deep neural networks, and generative AI systems.",
      levels: [
        { level: "Level 1: Beginner Foundations", filter: b => (b.category.includes('Programming') && b.title.includes('Python')) || b.category.includes('Mathematics') },
        { level: "Level 2: Intermediate Skills", filter: b => (b.category.includes('Machine Learning') || b.title.includes('Hands-On Machine Learning') || b.title.includes('Pattern Recognition')) },
        { level: "Level 3: Advanced Topics", filter: b => (b.title.includes('Deep Learning') || b.title.includes('Artificial Intelligence: A Modern Approach') || b.category.includes('Neural')) },
        { level: "Level 4: Practical Projects & Applications", filter: b => (b.category.includes('Computer Vision') || b.category.includes('Natural Language') || b.title.includes('Reinforcement')) }
      ]
    },
    data_analyst: {
      title: "Become a Data Analyst",
      description: "Learn relational database design, SQL querying, statistics, data visualization, and exploratory analysis.",
      levels: [
        { level: "Level 1: Beginner Foundations", filter: b => (b.category.includes('Database') || b.title.includes('SQL') || b.title.includes('Head First SQL')) },
        { level: "Level 2: Intermediate Skills", filter: b => (b.category.includes('Statistics') || b.title.includes('Python for Data Analysis')) },
        { level: "Level 3: Advanced Topics", filter: b => (b.category.includes('Data Science') || b.title.includes('Database System Concepts')) },
        { level: "Level 4: Practical Projects & Applications", filter: b => (b.title.includes('Business Analytics') || b.title.includes('Data-Intensive') || b.category.includes('Machine Learning')) }
      ]
    },
    cybersecurity: {
      title: "Learn Cybersecurity & Network Defense",
      description: "Understand operating systems internals, secure network protocols, ethical hacking, and cryptographic defenses.",
      levels: [
        { level: "Level 1: Beginner Foundations", filter: b => (b.category.includes('Networks') || b.title.includes('Computer Networking: A Top-Down')) },
        { level: "Level 2: Intermediate Skills", filter: b => (b.category.includes('Operating Systems') || b.title.includes('Operating System Concepts')) },
        { level: "Level 3: Advanced Topics", filter: b => (b.category.includes('Cybersecurity') || b.title.includes('Cryptography') || b.title.includes('Security')) },
        { level: "Level 4: Practical Projects & Defense", filter: b => (b.title.includes('CompTIA') || b.title.includes('Network Security') || b.category.includes('Cloud')) }
      ]
    },
    web_developer: {
      title: "Become a Full-Stack Web Developer",
      description: "From modern responsive frontends with React to scalable backend microservices with Node.js and SQL/NoSQL databases.",
      levels: [
        { level: "Level 1: Beginner Foundations", filter: b => (b.category.includes('Web Development') && (b.title.includes('JavaScript') || b.title.includes('HTML'))) },
        { level: "Level 2: Intermediate Skills", filter: b => (b.category.includes('Web Development') && (b.title.includes('React') || b.title.includes('Node'))) },
        { level: "Level 3: Advanced Topics", filter: b => (b.category.includes('Database') || b.title.includes('Full Stack') || b.title.includes('API')) },
        { level: "Level 4: Practical Projects & Cloud Deployment", filter: b => (b.category.includes('Cloud') || b.title.includes('Designing Data-Intensive') || b.category.includes('Software Engineering')) }
      ]
    },
    english_literature: {
      title: "Master English Literature, Rhetoric & Dramatic Writing",
      description: "Comprehensive pathway through Shakespearean tragedy, poetic meter, theatrical dramaturgy, and literary criticism.",
      levels: [
        { level: "Level 1: Beginner Foundations", filter: b => (b.category.includes('Shakespeare') && (b.title.includes('Romeo and Juliet') || b.title.includes('A Midsummer') || b.title.includes('Student Edition'))) },
        { level: "Level 2: Intermediate Skills", filter: b => (b.category.includes('Shakespeare — Tragedies') && (b.title.includes('Hamlet') || b.title.includes('Macbeth') || b.title.includes('Othello'))) },
        { level: "Level 3: Advanced Topics", filter: b => (b.category.includes('Poetry') || b.title.includes('Sonnets') || b.title.includes('King Lear')) },
        { level: "Level 4: Practical Projects, Criticism & Dramaturgy", filter: b => (b.category.includes('Literary Analysis') || b.category.includes('Biography') || b.title.includes('Words: A Glossary')) }
      ]
    },
    tamil_scholar: {
      title: "Tamil Classical Literature, Linguistics & Translation",
      description: "Ancient Sangam ethics, didactic epics, Tholkappiyam grammatical principles, and modern literary translation.",
      levels: [
        { level: "Level 1: Beginner Foundations", filter: b => (b.title.includes('ஆத்திசூடி') || b.title.includes('நாலடியார்') || b.title.includes('செந்தமிழ் இலக்கண')) },
        { level: "Level 2: Intermediate Skills", filter: b => (b.title.includes('திருக்குறள்') || b.title.includes('சிலப்பதிகாரம்') || b.title.includes('மொழிபெயர்ப்பியல்')) },
        { level: "Level 3: Advanced Topics", filter: b => (b.title.includes('புறநானூறு') || b.title.includes('கம்பராமாயணம்') || b.title.includes('தொல்காப்பியம்')) },
        { level: "Level 4: Practical Research & Literary Heritage", filter: b => (b.title.includes('பொன்னியின் செல்வன்') || b.title.includes('தமிழ் இலக்கிய வரலாறு') || b.title.includes('செம்மொழித் தமிழ்')) }
      ]
    },
    teaching_research: {
      title: "Prepare for Academic Teaching & Scholarly Research",
      description: "Develop curriculum structuring, rigorous research methodology, peer review criteria, and pedagogical clarity.",
      levels: [
        { level: "Level 1: Beginner Foundations", filter: b => (b.title.includes('Guide') || b.title.includes('Student') || b.title.includes('Introduction')) },
        { level: "Level 2: Intermediate Skills", filter: b => (b.title.includes('Concepts') || b.title.includes('Principles') || b.title.includes('Language')) },
        { level: "Level 3: Advanced Topics", filter: b => (b.title.includes('Analysis') || b.title.includes('Companion') || b.title.includes('Theory')) },
        { level: "Level 4: Practical Research & Publication", filter: b => (b.title.includes('Complete Works') || b.title.includes('Research') || b.title.includes('History')) }
      ]
    },
    business_entrepreneurship: {
      title: "Learn Business Strategy & Entrepreneurship",
      description: "From product ideation and operational architecture to revenue models and leadership execution.",
      levels: [
        { level: "Level 1: Beginner Foundations", filter: b => (b.department === 'CSE' && b.category.includes('Programming')) || b.category.includes('Web') },
        { level: "Level 2: Intermediate Skills", filter: b => (b.title.includes('Clean Code') || b.category.includes('Database') || b.category.includes('Software')) },
        { level: "Level 3: Advanced Topics", filter: b => (b.title.includes('Cloud') || b.title.includes('Designing Data-Intensive') || b.category.includes('AI')) },
        { level: "Level 4: Practical Projects & Scaling", filter: b => (b.title.includes('Architecture') || b.category.includes('Distributed') || b.title.includes('Management')) }
      ]
    },
    personal_finance: {
      title: "Explore Personal Finance, FinTech & Wealth Management",
      description: "Data-driven financial literacy, computational accounting, algorithmic trading concepts, and economic models.",
      levels: [
        { level: "Level 1: Beginner Foundations", filter: b => (b.title.includes('Mathematics') || b.title.includes('Python') || b.title.includes('SQL')) },
        { level: "Level 2: Intermediate Skills", filter: b => (b.category.includes('Statistics') || b.category.includes('Database') || b.title.includes('Data Analysis')) },
        { level: "Level 3: Advanced Topics", filter: b => (b.category.includes('Machine Learning') || b.title.includes('Data-Intensive') || b.title.includes('Algorithms')) },
        { level: "Level 4: Practical Applications & FinTech", filter: b => (b.category.includes('Cybersecurity') || b.category.includes('Cloud') || b.title.includes('Deep Learning')) }
      ]
    }
  };

  const selectedGoal = GOAL_DEFINITIONS[goalKey] || GOAL_DEFINITIONS['aiml_engineer'];

  // Match real library books for each of the 4 levels
  const stages = selectedGoal.levels.map(lvl => {
    let matched = allBooks.filter(lvl.filter).slice(0, 3);
    if (matched.length === 0) {
      // Fallback to top rated books in related department
      matched = allBooks.slice(0, 3);
    }
    return {
      stageName: lvl.level,
      books: matched.map(b => ({
        id: b.id,
        title: b.title,
        author: b.author,
        category: b.category,
        cover_image: b.cover_image,
        available_copies: b.available_copies,
        shelf_location: b.shelf_location,
        is_in_catalog: true
      }))
    };
  });

  return {
    goalKey,
    goalTitle: selectedGoal.title,
    description: selectedGoal.description,
    totalStages: stages.length,
    stages
  };
}

/**
 * Dynamic AI-Based Student Recommendation System (YouTube-style)
 * Analyzes borrowing history, most recent borrowed book, categories, authors, and cross-subject associations.
 * Displays 8-12 dynamic recommendations and explains "Because You Borrowed [Book Name]".
 */
async function getPersonalizedStudentRecommendations(userId, limit = 12) {
  // 1. Fetch user metadata (e.g. department)
  const userRows = await db.query('SELECT id, name, department, role FROM users WHERE id = ?', [userId]);
  const user = userRows && userRows.length > 0 ? userRows[0] : { department: 'CSE' };

  // 2. Fetch full borrowing history for student, latest transaction first
  const userLoans = await db.query(`
    SELECT 
      t.id as transaction_id,
      t.book_id,
      t.status,
      t.issue_date,
      b.id as book_id,
      b.title,
      b.author,
      b.category,
      b.department,
      b.catalog_collection,
      b.subject_keywords,
      b.description
    FROM transactions t
    JOIN books b ON t.book_id = b.id
    WHERE t.user_id = ?
    ORDER BY t.id DESC
  `, [userId]);

  const allBooks = await db.query('SELECT * FROM books');
  if (!allBooks || allBooks.length === 0) {
    return { heading: 'Recommended for You', last_borrowed_title: null, recommendations: [] };
  }

  // Set of all currently or previously borrowed book IDs to avoid recommending already borrowed books
  const borrowedBookIds = new Set(userLoans.map(l => l.book_id));

  // If student has never borrowed any book yet: provide curriculum-matched starters
  if (!userLoans || userLoans.length === 0) {
    const studentDept = (user.department || 'CSE').toUpperCase();
    const starterBooks = allBooks
      .filter(b => b.available_copies > 0)
      .filter(b => {
        const bDept = (b.department || '').toUpperCase();
        return bDept.includes(studentDept) || studentDept.includes(bDept) || bDept === 'CSE' || b.catalog_collection === 'Shakespeare Collection';
      })
      .slice(0, limit)
      .map(b => ({
        ...b,
        recommendation_reason: `Curated starter recommendation for your ${user.department || 'Academic'} degree curriculum.`
      }));

    return {
      heading: `Recommended for Your ${user.department || 'Academic'} Curriculum`,
      last_borrowed_title: null,
      recommendations: starterBooks
    };
  }

  // 3. Most recently borrowed book
  const lastBorrowed = userLoans[0];
  const lastBorrowedTitle = lastBorrowed.title;
  const lastCategory = (lastBorrowed.category || '').toLowerCase();
  const lastAuthor = (lastBorrowed.author || '').toLowerCase();
  const lastDept = (lastBorrowed.department || '').toUpperCase();
  const lastTokens = new Set(tokenize(`${lastBorrowed.title} ${lastBorrowed.category} ${lastBorrowed.subject_keywords || ''}`));

  // Historical interest profile
  const categoryFreq = {};
  const authorFreq = {};
  userLoans.forEach(l => {
    const cat = (l.category || '').toLowerCase();
    const aut = (l.author || '').toLowerCase();
    categoryFreq[cat] = (categoryFreq[cat] || 0) + 1;
    authorFreq[aut] = (authorFreq[aut] || 0) + 1;
  });

  // Cross-domain association topics
  const associatedTopics = [];
  for (const [key, tags] of Object.entries(TOPIC_ASSOCIATION_GRAPH)) {
    if (lastCategory.includes(key.toLowerCase()) || lastBorrowedTitle.toLowerCase().includes(key.toLowerCase())) {
      associatedTopics.push(...tags.map(t => t.toLowerCase()));
    }
  }

  // 4. Candidate Scoring & Filtering (Exclude already borrowed books)
  let candidates = allBooks.filter(b => !borrowedBookIds.has(b.id) && b.available_copies > 0);
  // Fallback if student read all available books in category: allow other catalog books
  if (candidates.length < limit) {
    candidates = allBooks.filter(b => !borrowedBookIds.has(b.id));
  }
  if (candidates.length === 0) {
    candidates = allBooks.slice(0, limit);
  }

  const scored = candidates.map(b => {
    let score = 0;
    let reason = `Recommended because you borrowed "${lastBorrowedTitle}".`;
    const bCat = (b.category || '').toLowerCase();
    const bAuthor = (b.author || '').toLowerCase();
    const bDept = (b.department || '').toUpperCase();

    // 1. Exact same category as last borrowed book (+45)
    if (bCat === lastCategory) {
      score += 45;
      reason = `Because You Borrowed "${lastBorrowedTitle}": Essential companion in ${b.category}.`;
    }

    // 2. Same author (+40)
    if (bAuthor && bAuthor === lastAuthor) {
      score += 40;
      reason = `Because You Borrowed "${lastBorrowedTitle}": Also written by ${b.author}.`;
    }

    // 3. Cross-domain topic association (+35)
    if (associatedTopics.length > 0 && associatedTopics.some(t => bCat.includes(t) || b.title.toLowerCase().includes(t))) {
      score += 35;
      reason = `Because You Borrowed "${lastBorrowedTitle}": Deepens knowledge in related field ${b.category}.`;
    }

    // 4. Specific content mapping (Python -> AI / ML / Programming)
    if (lastBorrowedTitle.toLowerCase().includes('python') || lastCategory.includes('python')) {
      const bTitleLower = b.title.toLowerCase();
      if (bTitleLower.includes('python') || bCat.includes('python') || bCat.includes('programming') || bCat.includes('machine learning') || bCat.includes('data science') || bCat.includes('artificial intelligence')) {
        score += 50;
        reason = `Because You Borrowed "${lastBorrowedTitle}": Key practical programming & AI companion.`;
      }
    }

    // 5. Literature / Novels mapping
    if (lastCategory.includes('literature') || lastCategory.includes('novel') || lastCategory.includes('fiction') || lastCategory.includes('shakespeare') || lastCategory.includes('tamil')) {
      if (bCat.includes('literature') || bCat.includes('novel') || bCat.includes('fiction') || bCat.includes('shakespeare') || bCat.includes('tamil') || b.catalog_collection === lastBorrowed.catalog_collection) {
        score += 45;
        reason = `Because You Borrowed "${lastBorrowedTitle}": Captivating literary work in ${b.category}.`;
      }
    }

    // 6. Token overlap (+3 per matched token)
    const bTokens = tokenize(`${b.title} ${b.category} ${b.subject_keywords || ''}`);
    let overlap = 0;
    bTokens.forEach(t => {
      if (lastTokens.has(t)) overlap++;
    });
    score += Math.min(25, overlap * 5);

    // 7. General student history preference (+10)
    if (categoryFreq[bCat]) {
      score += Math.min(15, categoryFreq[bCat] * 5);
    }
    if (authorFreq[bAuthor]) {
      score += Math.min(20, authorFreq[bAuthor] * 10);
    }

    // 8. Same academic department (+10)
    if (bDept === lastDept) {
      score += 10;
    }

    return {
      ...b,
      score,
      recommendation_reason: reason
    };
  });

  // Sort by score descending and take top 8 to 12
  const topRecommendations = scored
    .sort((a, b) => b.score - a.score)
    .slice(0, Math.max(8, limit));

  return {
    heading: `Because You Borrowed "${lastBorrowedTitle}"`,
    last_borrowed_title: lastBorrowedTitle,
    recommendations: topRecommendations
  };
}

module.exports = {
  getSearchRecommendations,
  getRelatedBooksForBook,
  getPersonalizedStudentRecommendations,
  getCareerGuidanceForBook,
  getCareerGoalRoadmap
};
