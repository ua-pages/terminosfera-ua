/**
 * @typedef {Object} Translations
 * @property {string} en - English translation
 * @property {string} uk - Ukrainian translation
 * @property {string} es - Spanish translation
 */

/**
 * @typedef {Object} Etymology
 * @property {string} origin - Language of origin
 * @property {string} root - Root word
 * @property {string} meaning - Meaning of the root
 */

/**
 * @typedef {Object} Term
 * @property {string} id - Unique identifier (slug)
 * @property {Translations} translations - Translations in all supported languages
 * @property {Translations} definition - Definitions in all supported languages
 * @property {Etymology} etymology - Etymology information
 * @property {string} category - Term category
 * @property {string[]} related - IDs of related terms
 */

export {}
