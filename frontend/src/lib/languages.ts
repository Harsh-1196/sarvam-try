export interface LanguageOption {
  code: string;
  name: string;
  nativeName: string;
  script: string;
  ttsSupported: boolean;
  llmStrong: boolean;
}

export const LANGUAGES: LanguageOption[] = [
  { code: 'hi-IN', name: 'Hindi', nativeName: 'हिन्दी', script: 'Deva', ttsSupported: true, llmStrong: true },
  { code: 'en-IN', name: 'English', nativeName: 'English', script: 'Latn', ttsSupported: true, llmStrong: true },
  { code: 'bn-IN', name: 'Bengali', nativeName: 'বাংলা', script: 'Beng', ttsSupported: true, llmStrong: true },
  { code: 'gu-IN', name: 'Gujarati', nativeName: 'ગુજરાતી', script: 'Gujr', ttsSupported: true, llmStrong: true },
  { code: 'kn-IN', name: 'Kannada', nativeName: 'ಕನ್ನಡ', script: 'Knda', ttsSupported: true, llmStrong: true },
  { code: 'ml-IN', name: 'Malayalam', nativeName: 'മലയാളം', script: 'Mlym', ttsSupported: true, llmStrong: true },
  { code: 'mr-IN', name: 'Marathi', nativeName: 'मराठी', script: 'Deva', ttsSupported: true, llmStrong: true },
  { code: 'od-IN', name: 'Odia', nativeName: 'ଓଡ଼ିଆ', script: 'Orya', ttsSupported: true, llmStrong: true },
  { code: 'pa-IN', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', script: 'Guru', ttsSupported: true, llmStrong: true },
  { code: 'ta-IN', name: 'Tamil', nativeName: 'தமிழ்', script: 'Taml', ttsSupported: true, llmStrong: true },
  { code: 'te-IN', name: 'Telugu', nativeName: 'తెలుగు', script: 'Telu', ttsSupported: true, llmStrong: true },
  // Remaining 12 Indian languages supported by Vision, Saaras & Sarvam-Translate:
  { code: 'as-IN', name: 'Assamese', nativeName: 'অসমীয়া', script: 'Beng', ttsSupported: false, llmStrong: false },
  { code: 'brx-IN', name: 'Bodo', nativeName: 'बर’', script: 'Deva', ttsSupported: false, llmStrong: false },
  { code: 'doi-IN', name: 'Dogri', nativeName: 'डोगरी', script: 'Deva', ttsSupported: false, llmStrong: false },
  { code: 'ks-IN', name: 'Kashmiri', nativeName: 'کٲشُر', script: 'Arab', ttsSupported: false, llmStrong: false },
  { code: 'kok-IN', name: 'Konkani', nativeName: 'कोंकणी', script: 'Deva', ttsSupported: false, llmStrong: false },
  { code: 'mai-IN', name: 'Maithili', nativeName: 'मैथिली', script: 'Deva', ttsSupported: false, llmStrong: false },
  { code: 'mni-IN', name: 'Manipuri', nativeName: 'মৈতৈলোন্', script: 'Beng', ttsSupported: false, llmStrong: false },
  { code: 'ne-IN', name: 'Nepali', nativeName: 'नेपाली', script: 'Deva', ttsSupported: false, llmStrong: false },
  { code: 'sa-IN', name: 'Sanskrit', nativeName: 'संस्कृतम्', script: 'Deva', ttsSupported: false, llmStrong: false },
  { code: 'sat-IN', name: 'Santali', nativeName: 'संताली', script: 'Olck', ttsSupported: false, llmStrong: false },
  { code: 'sd-IN', name: 'Sindhi', nativeName: 'سنڌي', script: 'Arab', ttsSupported: false, llmStrong: false },
  { code: 'ur-IN', name: 'Urdu', nativeName: 'اردو', script: 'Arab', ttsSupported: false, llmStrong: false },
];

export const BULBUL_SUPPORTED_CODES = new Set(
  LANGUAGES.filter((l) => l.ttsSupported).map((l) => l.code)
);

export function getLanguageName(code: string): string {
  const match = LANGUAGES.find((l) => l.code === code);
  return match ? `${match.name} (${match.nativeName})` : code;
}
