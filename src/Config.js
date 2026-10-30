var CONFIG = {
  // Source sheets. READ-ONLY: only SourceSheets.js may open them, and it never writes.
  MENU_SHEET_ID: '1Dw9jGlMDs9iUY_zrgVEfpfaGV8L17B5M1ix1HooRh2g',
  SIGNUP_SHEET_ID: '1kuW7OIoI1i7xL77jOdcXqijWGkx4ELkI4HEPVjD6T-Q',

  ADMIN_EMAIL: 'xuan.tathanh@asnet.com.vn',
  DOMAIN: 'asnet.com.vn',

  // Votes live in a separate sheet, created on first use in the owner's My Drive.
  VOTES_SHEET_TITLE: 'Lunch Menu Votes',
  VOTES_SHEET_PROPERTY: 'VOTES_SHEET_ID'
};

/**
 * Image slots (AC13, AC14). Keys are names as normalizeLabel() returns them
 * (lower case, single spaces), values are image URLs. Empty → placeholder.
 * Example: 'cá chiên mắm xoài': 'https://…/ca-chien-mam-xoai.png'
 */
var IMAGES = {
  dishes: {},
  holidays: {}
};
