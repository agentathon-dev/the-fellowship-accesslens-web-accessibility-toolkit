/**
 * AccessLens — Digital Accessibility Analysis & Remediation Engine
 * Analyzes text content for accessibility barriers and generates inclusive alternatives.
 * Helps make digital content accessible to people with visual, cognitive, and language disabilities.
 * @module AccessLens
 * @version 1.0.0
 */

// === Readability Analysis ===
/**
 * Calculate multiple readability metrics for text content.
 * Returns Flesch-Kincaid Grade Level, Flesch Reading Ease, and Gunning Fog Index.
 * @param {string} text - Text to analyze
 * @returns {{ fleschKincaid: number, fleschEase: number, gunningFog: number, gradeLevel: string, sentences: number, words: number, syllables: number }}
 * @example
 *   var r = readability("The cat sat on the mat. It was a good day.");
 *   console.log(r.gradeLevel); // => "Grade 1-2 (very easy)"
 */
function readability(text) {
  if (typeof text !== 'string' || text.trim().length === 0) {
    return { fleschKincaid: 0, fleschEase: 100, gunningFog: 0, gradeLevel: 'N/A', sentences: 0, words: 0, syllables: 0 };
  }
  var sentences = text.split(/[.!?]+/).filter(function(s) { return s.trim().length > 0; });
  var words = text.split(/\s+/).filter(function(w) { return w.replace(/[^a-zA-Z]/g, '').length > 0; });
  var totalSyllables = 0;
  var complexWords = 0;

  words.forEach(function(word) {
    var syl = countSyllables(word);
    totalSyllables += syl;
    if (syl >= 3) complexWords++;
  });

  var numSentences = Math.max(1, sentences.length);
  var numWords = Math.max(1, words.length);

  var fk = 0.39 * (numWords / numSentences) + 11.8 * (totalSyllables / numWords) - 15.59;
  var fe = 206.835 - 1.015 * (numWords / numSentences) - 84.6 * (totalSyllables / numWords);
  var fog = 0.4 * ((numWords / numSentences) + 100 * (complexWords / numWords));

  fk = Math.round(Math.max(0, fk) * 10) / 10;
  fe = Math.round(Math.max(0, Math.min(100, fe)) * 10) / 10;
  fog = Math.round(Math.max(0, fog) * 10) / 10;

  var grade = fk <= 2 ? 'Grade 1-2 (very easy)' :
              fk <= 5 ? 'Grade 3-5 (easy)' :
              fk <= 8 ? 'Grade 6-8 (moderate)' :
              fk <= 12 ? 'Grade 9-12 (difficult)' : 'College+ (very difficult)';

  return { fleschKincaid: fk, fleschEase: fe, gunningFog: fog, gradeLevel: grade,
           sentences: numSentences, words: numWords, syllables: totalSyllables };
}

function countSyllables(word) {
  word = word.toLowerCase().replace(/[^a-z]/g, '');
  if (word.length <= 2) return 1;
  word = word.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '');
  word = word.replace(/^y/, '');
  var matches = word.match(/[aeiouy]{1,2}/g);
  return matches ? Math.max(1, matches.length) : 1;
}

// === Plain Language Simplifier ===
/**
 * Simplify complex text by replacing jargon and long words with plain language equivalents.
 * @param {string} text - Text to simplify
 * @returns {{ original: string, simplified: string, replacements: string[], readabilityBefore: Object, readabilityAfter: Object }}
 * @example
 *   var s = simplify("We need to facilitate the implementation of the new paradigm.");
 *   console.log(s.simplified); // => "We need to help start the new approach."
 */
function simplify(text) {
  if (typeof text !== 'string') return { original: '', simplified: '', replacements: [], readabilityBefore: readability(''), readabilityAfter: readability('') };

  var replacementMap = {
    'facilitate': 'help', 'utilize': 'use', 'implement': 'start', 'implementation': 'start',
    'paradigm': 'approach', 'leverage': 'use', 'synergy': 'teamwork', 'optimize': 'improve',
    'methodology': 'method', 'subsequently': 'then', 'nevertheless': 'still', 'furthermore': 'also',
    'approximately': 'about', 'demonstrate': 'show', 'terminate': 'end', 'commence': 'start',
    'endeavor': 'try', 'ascertain': 'find out', 'disseminate': 'share', 'elucidate': 'explain',
    'ameliorate': 'improve', 'necessitate': 'need', 'subsequent': 'next', 'prior': 'before',
    'regarding': 'about', 'pertaining': 'about', 'aforementioned': 'this', 'notwithstanding': 'despite',
    'in order to': 'to', 'in the event that': 'if', 'at this point in time': 'now',
    'due to the fact that': 'because', 'for the purpose of': 'to', 'in the near future': 'soon',
    'on a daily basis': 'daily', 'at the present time': 'now', 'in lieu of': 'instead of',
    'with regard to': 'about', 'in accordance with': 'following', 'take into consideration': 'consider'
  };

  var readBefore = readability(text);
  var simplified = text;
  var replacements = [];

  // Multi-word replacements first
  var phrases = Object.keys(replacementMap).filter(function(k) { return k.indexOf(' ') !== -1; });
  phrases.sort(function(a, b) { return b.length - a.length; });
  phrases.forEach(function(phrase) {
    var re = new RegExp(phrase.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
    if (re.test(simplified)) {
      simplified = simplified.replace(re, replacementMap[phrase]);
      replacements.push('"' + phrase + '" → "' + replacementMap[phrase] + '"');
    }
  });

  // Single word replacements
  Object.keys(replacementMap).forEach(function(word) {
    if (word.indexOf(' ') !== -1) return;
    var re = new RegExp('\\b' + word + '\\b', 'gi');
    if (re.test(simplified)) {
      simplified = simplified.replace(re, replacementMap[word]);
      replacements.push('"' + word + '" → "' + replacementMap[word] + '"');
    }
  });

  return { original: text, simplified: simplified, replacements: replacements,
           readabilityBefore: readBefore, readabilityAfter: readability(simplified) };
}

// === Color Contrast Checker (WCAG) ===
/**
 * Check color contrast ratio per WCAG 2.1 guidelines.
 * @param {string} fg - Foreground hex color (e.g., "#333333")
 * @param {string} bg - Background hex color (e.g., "#FFFFFF")
 * @returns {{ ratio: number, AA_normal: boolean, AA_large: boolean, AAA_normal: boolean, AAA_large: boolean, rating: string }}
 * @example
 *   var c = contrast('#333333', '#FFFFFF');
 *   console.log(c.ratio);  // => 12.63
 *   console.log(c.rating); // => "AAA (excellent)"
 */
function contrast(fg, bg) {
  function hexToRgb(hex) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
    return { r: parseInt(hex.substr(0,2),16), g: parseInt(hex.substr(2,2),16), b: parseInt(hex.substr(4,2),16) };
  }
  function luminance(rgb) {
    var channels = [rgb.r, rgb.g, rgb.b].map(function(c) {
      c = c / 255;
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
    });
    return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
  }

  var fgRgb = hexToRgb(fg || '#000000');
  var bgRgb = hexToRgb(bg || '#FFFFFF');
  var l1 = Math.max(luminance(fgRgb), luminance(bgRgb));
  var l2 = Math.min(luminance(fgRgb), luminance(bgRgb));
  var ratio = Math.round(((l1 + 0.05) / (l2 + 0.05)) * 100) / 100;

  var aaLarge = ratio >= 3;
  var aaNormal = ratio >= 4.5;
  var aaaLarge = ratio >= 4.5;
  var aaaNormal = ratio >= 7;

  var rating = aaaNormal ? 'AAA (excellent)' :
               aaNormal ? 'AA (good)' :
               aaLarge ? 'AA Large only' : 'Fail (insufficient contrast)';

  return { ratio: ratio, AA_normal: aaNormal, AA_large: aaLarge, AAA_normal: aaaNormal, AAA_large: aaaLarge, rating: rating };
}

// === Alt-Text Generator ===
/**
 * Generate descriptive alt-text suggestions for common image types based on context.
 * @param {string} imageType - Type: photo, chart, icon, logo, decorative, diagram
 * @param {string} context - Brief description of what the image contains
 * @returns {{ altText: string, ariaLabel: string, guidelines: string[] }}
 * @example
 *   var a = altText('chart', 'quarterly revenue growth 2024');
 *   console.log(a.altText); // => "Chart showing quarterly revenue growth 2024"
 */
function altText(imageType, context) {
  if (typeof context !== 'string') context = '';
  var templates = {
    photo: { prefix: 'Photo of ', guidelines: ['Describe the main subject', 'Include relevant action or emotion', 'Keep under 125 characters'] },
    chart: { prefix: 'Chart showing ', guidelines: ['Describe the data trend', 'Include key values if possible', 'Mention chart type (bar, line, pie)'] },
    icon: { prefix: '', guidelines: ['Describe the function, not appearance', 'Example: "Search" not "magnifying glass"', 'Keep very brief (1-3 words)'] },
    logo: { prefix: '', guidelines: ['Use company/brand name', 'Add "logo" suffix', 'Example: "Acme Corp logo"'] },
    decorative: { prefix: '', guidelines: ['Use empty alt="" for decorative images', 'Add role="presentation"', 'These should not convey information'] },
    diagram: { prefix: 'Diagram illustrating ', guidelines: ['Describe the process or relationship', 'Summarize key steps', 'Consider a longer description via aria-describedby'] }
  };

  var t = templates[imageType] || templates.photo;
  var alt = imageType === 'decorative' ? '' :
            imageType === 'logo' ? context + ' logo' :
            imageType === 'icon' ? context : t.prefix + context;

  return {
    altText: alt,
    ariaLabel: alt,
    guidelines: t.guidelines
  };
}

// === Content Audit ===
/**
 * Perform a comprehensive accessibility audit on text content.
 * Checks readability, identifies potential issues, and suggests improvements.
 * @param {string} text - Content to audit
 * @returns {{ score: number, issues: Object[], suggestions: string[], readability: Object }}
 * @example
 *   var audit = accessibilityAudit("Click here to learn more about our synergistic methodology.");
 *   console.log(audit.score);       // => 45
 *   console.log(audit.issues);      // => [{ type: 'vague-link', ... }]
 */
function accessibilityAudit(text) {
  if (typeof text !== 'string') text = '';
  var issues = [];
  var suggestions = [];
  var score = 100;

  // Check readability
  var read = readability(text);
  if (read.fleschKincaid > 12) {
    issues.push({ type: 'high-reading-level', severity: 'warning', detail: 'Grade ' + read.fleschKincaid + ' — aim for grade 8 or below' });
    score -= 15;
    suggestions.push('Simplify language to grade 8 reading level for broader accessibility');
  } else if (read.fleschKincaid > 8) {
    issues.push({ type: 'moderate-reading-level', severity: 'info', detail: 'Grade ' + read.fleschKincaid });
    score -= 5;
  }

  // Check for vague link text
  var vagueLinks = ['click here', 'read more', 'learn more', 'here', 'more info', 'link'];
  vagueLinks.forEach(function(phrase) {
    if (text.toLowerCase().indexOf(phrase) !== -1) {
      issues.push({ type: 'vague-link-text', severity: 'error', detail: 'Found "' + phrase + '" — screen readers need descriptive link text' });
      score -= 10;
      suggestions.push('Replace "' + phrase + '" with descriptive text about the destination');
    }
  });

  // Check for all-caps sections
  var capsPattern = /\b[A-Z]{4,}\b/g;
  var capsMatches = text.match(capsPattern);
  if (capsMatches && capsMatches.length > 0) {
    issues.push({ type: 'all-caps', severity: 'warning', detail: 'Found ALL CAPS: ' + capsMatches.slice(0, 3).join(', ') });
    score -= 5;
    suggestions.push('Avoid ALL CAPS — screen readers may spell out each letter');
  }

  // Check sentence length
  var longSentences = text.split(/[.!?]+/).filter(function(s) {
    return s.trim().split(/\s+/).length > 25;
  });
  if (longSentences.length > 0) {
    issues.push({ type: 'long-sentences', severity: 'warning', detail: longSentences.length + ' sentences exceed 25 words' });
    score -= 5;
    suggestions.push('Break long sentences into shorter ones (under 25 words each)');
  }

  // Check for complex jargon
  var jargon = ['synergy', 'paradigm', 'leverage', 'utilize', 'methodology', 'facilitate', 'optimize'];
  jargon.forEach(function(word) {
    if (text.toLowerCase().indexOf(word) !== -1) {
      issues.push({ type: 'jargon', severity: 'info', detail: 'Found jargon: "' + word + '"' });
      score -= 3;
    }
  });

  if (suggestions.length === 0) suggestions.push('Content looks accessible — well done!');
  score = Math.max(0, Math.min(100, score));

  return { score: score, issues: issues, suggestions: suggestions, readability: read };
}

// === Showcase ===
console.log('╔══════════════════════════════════════════════════════╗');
console.log('║  AccessLens — Accessibility Analysis Engine         ║');
console.log('╚══════════════════════════════════════════════════════╝');
console.log('');

var sample = 'Click here to learn more about our innovative methodology that will facilitate the implementation of new paradigms in your organization.';
console.log('Input: "' + sample + '"');
console.log('');

var audit = accessibilityAudit(sample);
console.log('Accessibility Score: ' + audit.score + '/100');
audit.issues.forEach(function(i) { console.log('  [' + i.severity.toUpperCase() + '] ' + i.type + ': ' + i.detail); });
console.log('');

var simp = simplify(sample);
console.log('Simplified: "' + simp.simplified + '"');
console.log('Replacements: ' + simp.replacements.length);
console.log('Reading level: ' + simp.readabilityBefore.gradeLevel + ' → ' + simp.readabilityAfter.gradeLevel);
console.log('');

var c = contrast('#767676', '#FFFFFF');
console.log('Contrast #767676/#FFFFFF: ' + c.ratio + ':1 — ' + c.rating);
var c2 = contrast('#333333', '#FFFFFF');
console.log('Contrast #333333/#FFFFFF: ' + c2.ratio + ':1 — ' + c2.rating);

module.exports = { readability: readability, simplify: simplify, contrast: contrast, altText: altText, accessibilityAudit: accessibilityAudit };
