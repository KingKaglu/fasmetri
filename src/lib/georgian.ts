// Georgian → Latin transliteration, shared by search tokenization and slug
// generation.
//
// Phonetic rather than a strict standard: catalog text is English product
// titles, so "ინფინიქს" should head toward "infiniks"/"infinix", not
// "inpiniksi".
const GEORGIAN_LATIN: Record<string, string> = {
  ა: "a", ბ: "b", გ: "g", დ: "d", ე: "e", ვ: "v", ზ: "z", თ: "t",
  ი: "i", კ: "k", ლ: "l", მ: "m", ნ: "n", ო: "o", პ: "p", ჟ: "zh",
  რ: "r", ს: "s", ტ: "t", უ: "u", ფ: "f", ქ: "k", ღ: "gh", ყ: "q",
  შ: "sh", ჩ: "ch", ც: "ts", ძ: "dz", წ: "ts", ჭ: "ch", ხ: "kh",
  ჯ: "j", ჰ: "h",
};

export function hasGeorgianLetters(value: string) {
  return /[Ⴀ-ჿ]/.test(value);
}

/** Transliterates in place, leaving every non-Georgian character untouched. */
export function latinizeGeorgian(value: string) {
  let out = "";
  for (const char of value) out += GEORGIAN_LATIN[char] ?? char;
  return out;
}

/** Search-token form: null when the token has no Georgian letters to convert. */
export function transliterateGeorgianToken(token: string): string | null {
  if (!hasGeorgianLetters(token)) return null;
  const latin = latinizeGeorgian(token);
  return latin === token ? null : latin;
}
