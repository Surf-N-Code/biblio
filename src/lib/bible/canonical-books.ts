export type CanonicalBook = {
  usfm: string;
  slug: string;
  name: string;
  chapters: number;
};

/** Protestant canon — chapter counts for navigation. */
export const CANONICAL_BOOKS: CanonicalBook[] = [
  { usfm: "GEN", slug: "genesis", name: "Genesis", chapters: 50 },
  { usfm: "EXO", slug: "exodus", name: "Exodus", chapters: 40 },
  { usfm: "LEV", slug: "leviticus", name: "Leviticus", chapters: 27 },
  { usfm: "NUM", slug: "numbers", name: "Numbers", chapters: 36 },
  { usfm: "DEU", slug: "deuteronomy", name: "Deuteronomy", chapters: 34 },
  { usfm: "JOS", slug: "joshua", name: "Joshua", chapters: 24 },
  { usfm: "JDG", slug: "judges", name: "Judges", chapters: 21 },
  { usfm: "RUT", slug: "ruth", name: "Ruth", chapters: 4 },
  { usfm: "1SA", slug: "1-samuel", name: "1 Samuel", chapters: 31 },
  { usfm: "2SA", slug: "2-samuel", name: "2 Samuel", chapters: 24 },
  { usfm: "1KI", slug: "1-kings", name: "1 Kings", chapters: 22 },
  { usfm: "2KI", slug: "2-kings", name: "2 Kings", chapters: 25 },
  { usfm: "1CH", slug: "1-chronicles", name: "1 Chronicles", chapters: 29 },
  { usfm: "2CH", slug: "2-chronicles", name: "2 Chronicles", chapters: 36 },
  { usfm: "EZR", slug: "ezra", name: "Ezra", chapters: 10 },
  { usfm: "NEH", slug: "nehemiah", name: "Nehemiah", chapters: 13 },
  { usfm: "EST", slug: "esther", name: "Esther", chapters: 10 },
  { usfm: "JOB", slug: "job", name: "Job", chapters: 42 },
  { usfm: "PSA", slug: "psalms", name: "Psalms", chapters: 150 },
  { usfm: "PRO", slug: "proverbs", name: "Proverbs", chapters: 31 },
  { usfm: "ECC", slug: "ecclesiastes", name: "Ecclesiastes", chapters: 12 },
  { usfm: "SNG", slug: "song-of-solomon", name: "Song of Solomon", chapters: 8 },
  { usfm: "ISA", slug: "isaiah", name: "Isaiah", chapters: 66 },
  { usfm: "JER", slug: "jeremiah", name: "Jeremiah", chapters: 52 },
  { usfm: "LAM", slug: "lamentations", name: "Lamentations", chapters: 5 },
  { usfm: "EZK", slug: "ezekiel", name: "Ezekiel", chapters: 48 },
  { usfm: "DAN", slug: "daniel", name: "Daniel", chapters: 12 },
  { usfm: "HOS", slug: "hosea", name: "Hosea", chapters: 14 },
  { usfm: "JOL", slug: "joel", name: "Joel", chapters: 3 },
  { usfm: "AMO", slug: "amos", name: "Amos", chapters: 9 },
  { usfm: "OBA", slug: "obadiah", name: "Obadiah", chapters: 1 },
  { usfm: "JON", slug: "jonah", name: "Jonah", chapters: 4 },
  { usfm: "MIC", slug: "micah", name: "Micah", chapters: 7 },
  { usfm: "NAM", slug: "nahum", name: "Nahum", chapters: 3 },
  { usfm: "HAB", slug: "habakkuk", name: "Habakkuk", chapters: 3 },
  { usfm: "ZEP", slug: "zephaniah", name: "Zephaniah", chapters: 3 },
  { usfm: "HAG", slug: "haggai", name: "Haggai", chapters: 2 },
  { usfm: "ZEC", slug: "zechariah", name: "Zechariah", chapters: 14 },
  { usfm: "MAL", slug: "malachi", name: "Malachi", chapters: 4 },
  { usfm: "MAT", slug: "matthew", name: "Matthew", chapters: 28 },
  { usfm: "MRK", slug: "mark", name: "Mark", chapters: 16 },
  { usfm: "LUK", slug: "luke", name: "Luke", chapters: 24 },
  { usfm: "JHN", slug: "john", name: "John", chapters: 21 },
  { usfm: "ACT", slug: "acts", name: "Acts", chapters: 28 },
  { usfm: "ROM", slug: "romans", name: "Romans", chapters: 16 },
  { usfm: "1CO", slug: "1-corinthians", name: "1 Corinthians", chapters: 16 },
  { usfm: "2CO", slug: "2-corinthians", name: "2 Corinthians", chapters: 13 },
  { usfm: "GAL", slug: "galatians", name: "Galatians", chapters: 6 },
  { usfm: "EPH", slug: "ephesians", name: "Ephesians", chapters: 6 },
  { usfm: "PHP", slug: "philippians", name: "Philippians", chapters: 4 },
  { usfm: "COL", slug: "colossians", name: "Colossians", chapters: 4 },
  { usfm: "1TH", slug: "1-thessalonians", name: "1 Thessalonians", chapters: 5 },
  { usfm: "2TH", slug: "2-thessalonians", name: "2 Thessalonians", chapters: 3 },
  { usfm: "1TI", slug: "1-timothy", name: "1 Timothy", chapters: 6 },
  { usfm: "2TI", slug: "2-timothy", name: "2 Timothy", chapters: 4 },
  { usfm: "TIT", slug: "titus", name: "Titus", chapters: 3 },
  { usfm: "PHM", slug: "philemon", name: "Philemon", chapters: 1 },
  { usfm: "HEB", slug: "hebrews", name: "Hebrews", chapters: 13 },
  { usfm: "JAS", slug: "james", name: "James", chapters: 5 },
  { usfm: "1PE", slug: "1-peter", name: "1 Peter", chapters: 5 },
  { usfm: "2PE", slug: "2-peter", name: "2 Peter", chapters: 3 },
  { usfm: "1JN", slug: "1-john", name: "1 John", chapters: 5 },
  { usfm: "2JN", slug: "2-john", name: "2 John", chapters: 1 },
  { usfm: "3JN", slug: "3-john", name: "3 John", chapters: 1 },
  { usfm: "JUD", slug: "jude", name: "Jude", chapters: 1 },
  { usfm: "REV", slug: "revelation", name: "Revelation", chapters: 22 },
];

const bySlug = new Map(CANONICAL_BOOKS.map((b) => [b.slug, b]));
const byUsfm = new Map(CANONICAL_BOOKS.map((b) => [b.usfm, b]));

export function getBookBySlug(slug: string): CanonicalBook | undefined {
  return bySlug.get(slug.toLowerCase());
}

export function getBookByUsfm(usfm: string): CanonicalBook | undefined {
  return byUsfm.get(usfm.toUpperCase());
}

export function chapterId(usfm: string, chapter: number): string {
  return `${usfm.toUpperCase()}.${chapter}`;
}

/** 1 = Genesis … 66 = Revelation (Protestant order). */
export function getProtestantBookOrder(usfm: string): number {
  const idx = CANONICAL_BOOKS.findIndex((b) => b.usfm === usfm.toUpperCase());
  return idx >= 0 ? idx + 1 : 0;
}
