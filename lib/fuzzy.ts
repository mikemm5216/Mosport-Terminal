/**
 * Dice Coefficient 字串相似度演算法
 * @param s1 字串 1
 * @param s2 字串 2
 * @returns 0.0 ~ 1.0 的相似度評分
 */
export function getSimilarity(s1: string, s2: string): number {
  const str1 = s1.replace(/\s+/g, "").toLowerCase();
  const str2 = s2.replace(/\s+/g, "").toLowerCase();

  if (str1 === str2) return 1.0;
  if (str1.length < 2 || str2.length < 2) return 0.0;

  const pairs1 = getBigrams(str1);
  const pairs2 = getBigrams(str2);

  const union = pairs1.length + pairs2.length;
  let intersection = 0;

  for (const p1 of pairs1) {
    for (let i = 0; i < pairs2.length; i++) {
      if (p1 === pairs2[i]) {
        intersection++;
        pairs2.splice(i, 1);
        break;
      }
    }
  }

  return (2.0 * intersection) / union;
}

function getBigrams(str: string): string[] {
  const bigrams = [];
  for (let i = 0; i < str.length - 1; i++) {
    bigrams.push(str.substring(i, i + 2));
  }
  return bigrams;
}
