import { Book, DeliveryCity } from '../types/book';

export const INITIAL_DELIVERY_CITIES: DeliveryCity[] = [
  {
    id: 'lagos-mainland',
    name: 'Lagos (Mainland)',
    stateOrRegion: 'Lagos State',
    deliveryFeeUSD: 3,
    deliveryFeeNGN: 4500,
    estimatedDays: '1–2 days',
  },
  {
    id: 'lagos-island',
    name: 'Lagos (Island & Lekki)',
    stateOrRegion: 'Lagos State',
    deliveryFeeUSD: 3.5,
    deliveryFeeNGN: 5000,
    estimatedDays: '1–2 days',
  },
  {
    id: 'abuja',
    name: 'Abuja (FCT Metro)',
    stateOrRegion: 'Federal Capital Territory',
    deliveryFeeUSD: 4,
    deliveryFeeNGN: 6000,
    estimatedDays: '2–3 days',
  },
  {
    id: 'port-harcourt',
    name: 'Port Harcourt',
    stateOrRegion: 'Rivers State',
    deliveryFeeUSD: 4.5,
    deliveryFeeNGN: 6500,
    estimatedDays: '2–3 days',
  },
  {
    id: 'ibadan',
    name: 'Ibadan',
    stateOrRegion: 'Oyo State',
    deliveryFeeUSD: 3.5,
    deliveryFeeNGN: 5000,
    estimatedDays: '2 days',
  },
  {
    id: 'enugu',
    name: 'Enugu City',
    stateOrRegion: 'Enugu State',
    deliveryFeeUSD: 4.5,
    deliveryFeeNGN: 6500,
    estimatedDays: '2–4 days',
  },
  {
    id: 'accra',
    name: 'Accra Metro',
    stateOrRegion: 'Greater Accra, Ghana',
    deliveryFeeUSD: 6,
    deliveryFeeNGN: 9000,
    estimatedDays: '3–5 days',
  },
];

export const INITIAL_BOOKS: Book[] = [
  {
    id: 'book-1',
    title: 'The Cartography of Solitude',
    author: 'Sarah Loughlin',
    year: 2024,
    genre: 'Literary Fiction',
    description:
      'A poetic exploration of memory, coastline migrations, and human silence across three generations living in remote coastal archipelagos.',
    priceUSD: 0, // Free digital edition!
    priceNGN: 0,
    formatAvailable: 'both',
    coverUrl: '/src/assets/images/cover_solitude_cartography_1793896190823.jpg',
    pageCount: 284,
    isbn: '978-0-192-84012-4',
    language: 'English',
    fileSize: '3.4 MB',
    fileType: 'epub',
    sampleContent: `CHAPTER ONE: THE HIGH TIDE MARK

Before the harbor wall collapsed into the gray Atlantic swell, the postmistress used to trace the arriving storms with a bone-handled stylus across the ledger pages. We measured our years not in numbered winters, but in the silt deposited beneath the cedar jetty.

A woman with dry boots had walked the length of the spit at daybreak. From her coat pocket protruded an unsealed envelope stamped in Lisbon seven weeks earlier. She stopped at the salt marsh fence, where the samphire had turned amber beneath the frost, and looked toward the lighthouse keeper's cottage.

"There is no ferry today," the boy on the tractor called out, his engine coughing against the brine.
She did not turn her head. "I didn't come by water," she answered, and let the letter slip between the cedar slats.`,
    featured: true,
    stockPhysical: 18,
    uploadedAt: '2026-10-15',
  },
  {
    id: 'book-2',
    title: 'Systems of Thought',
    author: 'Eliza Vance',
    year: 2025,
    genre: 'Philosophy & Thought',
    description:
      'Exploring the cognitive architectures, mental models, and intuitive structures that shape human reasoning in an era of automated synthesis.',
    priceUSD: 8.5,
    priceNGN: 12500,
    formatAvailable: 'both',
    coverUrl: '/src/assets/images/cover_systems_of_thought_1793896191617.jpg',
    pageCount: 340,
    isbn: '978-1-840-92811-0',
    language: 'English',
    fileSize: '5.1 MB',
    fileType: 'pdf',
    sampleContent: `PROLOGUE: THE INVISIBLE ARCHITECTURE

We rarely examine the scaffolding upon which our intuitions rest until the structure begins to tremble under unforeseen weight.

Cognition is not merely a pipeline of sensory acquisition followed by logical computation; it is an active, anticipatory modeling system. When an artisan grips a chisel, the sensory boundary of the self dissolves into the tempered steel. So too with language, mathematics, and institutional mythologies: they are not passive containers for thought, but the physical instruments through which thought takes form.

In this volume, we examine three recursive axioms of epistemic design...`,
    featured: true,
    stockPhysical: 24,
    uploadedAt: '2026-10-22',
  },
  {
    id: 'book-3',
    title: 'Whispers in Daylight',
    author: 'Larkin Reed',
    year: 2023,
    genre: 'Poetry',
    description:
      'A quiet collection of meditative poems and lyrical reflections on sunlight, garden botanicals, grief, and morning tea.',
    priceUSD: 4.0,
    priceNGN: 6000,
    formatAvailable: 'ebook',
    coverUrl: '/src/assets/images/cover_whispers_daylight_1793896192065.jpg',
    pageCount: 112,
    isbn: '978-0-983-11204-7',
    language: 'English',
    fileSize: '1.8 MB',
    fileType: 'epub',
    sampleContent: `I. MORNING TEA UPON CEDAR

The kettle sighs before it sings,
a momentary truce with heat.
Outside, the dew on clover rings
unravels in the quiet street.

We talk of bread, of cedar wood,
of letters we forgot to send.
If stillness can be understood,
it is this silence at the bend.

II. ARCHIVAL SUNLIGHT

Open the shutters:
the dust motes are dancing
in five-hundred-year-old light
refracted through green crown glass.
Nothing is lost;
only rearranged into morning.`,
    featured: true,
    uploadedAt: '2026-11-01',
  },
  {
    id: 'book-4',
    title: 'The Rainmakers of Kaduna',
    author: 'Amara Nwosu',
    year: 2024,
    genre: 'African Literature',
    description:
      'An evocative historical novel set across mid-century Northern Nigeria, exploring kinship, textile markets, and railway expansion.',
    priceUSD: 6.0,
    priceNGN: 9000,
    formatAvailable: 'both',
    coverUrl: '', // Will be rendered crisply by CoverGenerator
    pageCount: 312,
    isbn: '978-978-990-213-9',
    language: 'English',
    fileSize: '4.2 MB',
    fileType: 'pdf',
    sampleContent: `CHAPTER ONE

The steam engine from Kano arrived with indigo soot clinging to its bronze boiler. By noon, the platforms in Kaduna Junction smelled of roasted groundnuts, diesel exhaust, and the sweet sharpness of rainy season eucalyptus.

Balarabe stood on the platform holding a leather satchel bound with raffia twine. Inside were eighty-two hand-drawn survey maps of the railway spur toward Zaria. His uncle had warned him that the steel lines would bring both prosperity and strangers who measured time with pocket chronometers instead of the shadows of the baobab.`,
    stockPhysical: 35,
    uploadedAt: '2026-09-18',
  },
  {
    id: 'book-5',
    title: 'The Independent Publisher’s Handbook',
    author: 'T. C. Adeyemi',
    year: 2025,
    genre: 'Business & Craft',
    description:
      'A practical, battle-tested guide to self-publishing, printing on demand, managing city delivery couriers, and international digital sales.',
    priceUSD: 0, // Free community guide
    priceNGN: 0,
    formatAvailable: 'ebook',
    coverUrl: '',
    pageCount: 178,
    isbn: '978-1-950-84401-2',
    language: 'English',
    fileSize: '2.5 MB',
    fileType: 'pdf',
    sampleContent: `INTRODUCTION: THE FREEDOM OF THE SHELF

Distribution was once guarded by gatekeepers with warehouses and consignment contracts. Today, an author with a phone, a reliable courier partner, and an instant checkout link can establish a thriving direct-to-reader press.

This manual outlines the exact logistical mechanics:
1. Setting up localized payment processing with international card clearance
2. Building trust with domestic readers through reliable city motorbike couriers
3. Delivering instant, DRM-clean digital files to readers worldwide
4. Creating bookstore-grade covers with typographic balance and tactile restraint.`,
    stockPhysical: 0,
    uploadedAt: '2026-10-30',
  },
  {
    id: 'book-6',
    title: 'Design for the Quiet Web',
    author: 'Kaelen Morse',
    year: 2024,
    genre: 'Technology & Society',
    description:
      'Rejecting algorithmic engagement traps in favor of calm, legible, durable software interfaces and digital reading sanctuaries.',
    priceUSD: 9.0,
    priceNGN: 13500,
    formatAvailable: 'ebook',
    coverUrl: '',
    pageCount: 220,
    isbn: '978-0-472-19283-4',
    language: 'English',
    fileSize: '3.1 MB',
    fileType: 'epub',
    sampleContent: `CHAPTER 1: THE RETRIEVAL OF ATTENTION

Every interface makes an ontological claim about what a human being is.

When an application bombards the visual cortex with pulsing badges, infinite feeds, and synthetic urgency, it presumes the reader is an extractive resource. A book, by contrast, makes the opposite assumption: that the reader is a quiet consciousness capable of sustained contemplation.

How might we design digital instruments that possess the dignity and stillness of a printed volume?`,
    stockPhysical: 12,
    uploadedAt: '2026-11-03',
  },
  {
    id: 'book-7',
    title: 'The Architecture of Daily Discipline',
    author: 'Dr. Marcus Sterling',
    year: 2025,
    genre: 'Self-Help & Personal Growth',
    description:
      'A practical framework to eliminate mental friction, engineer purposeful morning routines, cultivate emotional sovereignty, and build unshakeable self-mastery.',
    priceUSD: 5.5,
    priceNGN: 8000,
    formatAvailable: 'both',
    coverUrl: '',
    pageCount: 248,
    isbn: '978-1-984-51009-3',
    language: 'English',
    fileSize: '3.6 MB',
    fileType: 'epub',
    sampleContent: `CHAPTER ONE: THE GEOMETRY OF FOCUS

You do not rise to the level of your ambitions; you fall to the level of your default daily systems.

Most people believe discipline is a personality trait bestowed upon the fortunate few. In truth, discipline is spatial and structural. When your mornings are dictated by the reactive demands of notifications, you have surrendered executive function before your feet have touched the ground.

True self-sovereignty begins with intentional boundaries:
1. The First Sixty Minutes: Silence, physical grounding, and proactive creation.
2. The Elimination of Micro-Decisions: Conserving cognitive fuel for high-leverage challenges.
3. The Audit of Attention: Guarding the gates of your subconscious against noise.`,
    featured: true,
    stockPhysical: 20,
    uploadedAt: '2026-11-04',
  },
  {
    id: 'book-8',
    title: 'The African Wealth Engine',
    author: 'Tariq Mensah',
    year: 2024,
    genre: 'Finance & Wealth',
    description:
      'Actionable strategies for generational capital accumulation, cross-border commerce, real estate syndication, and sovereign investment in emerging markets.',
    priceUSD: 7.0,
    priceNGN: 10500,
    formatAvailable: 'both',
    coverUrl: '',
    pageCount: 290,
    isbn: '978-0-998-33412-1',
    language: 'English',
    fileSize: '4.8 MB',
    fileType: 'pdf',
    sampleContent: `PRINCIPLE 1: CAPITAL VELOCITY & TANGIBLE ASSETS

Wealth in growing economies is not built by passive hoarding in depreciating currencies; it is built through velocity, production, and ownership of real productive infrastructure.

Whether trading across West African corridors, establishing sovereign digital exports, or anchoring equity in commercial logistics, the modern investor must master both local cash flow mechanics and global currency hedging.`,
    featured: true,
    stockPhysical: 15,
    uploadedAt: '2026-11-02',
  },
  {
    id: 'book-9',
    title: 'Wisdom for Still Waters',
    author: 'Pastor David Adebayo',
    year: 2025,
    genre: 'Religion & Spirituality',
    description:
      'A spiritual companion for quiet mornings and turbulent seasons: finding divine alignment, peace through fervent prayer, and steadfast faith.',
    priceUSD: 0, // Free spiritual gift
    priceNGN: 0,
    formatAvailable: 'ebook',
    coverUrl: '',
    pageCount: 160,
    isbn: '978-978-842-109-8',
    language: 'English',
    fileSize: '2.1 MB',
    fileType: 'epub',
    sampleContent: `DEVOTIONAL 1: HE LEADS ME BESIDE THE STILL WATERS

When noise presses in from every side, remember that God does not speak in the whirlwind of anxious striving, but in the gentle stillness of surrender.

Rest is not a concession to weakness; rest is an act of spiritual warfare that declares God is on the throne while we lay our burdens down. Take breath this morning and know that every step before you is already ordered.`,
    featured: false,
    stockPhysical: 0,
    uploadedAt: '2026-11-05',
  },
];
