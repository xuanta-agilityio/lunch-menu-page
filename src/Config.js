var CONFIG = {
  // Source sheets. READ-ONLY: only SourceSheets.js may open them, and it never writes.
  MENU_SHEET_ID: '1Dw9jGlMDs9iUY_zrgVEfpfaGV8L17B5M1ix1HooRh2g',
  SIGNUP_SHEET_ID: '1kuW7OIoI1i7xL77jOdcXqijWGkx4ELkI4HEPVjD6T-Q',

  ADMIN_EMAIL: 'xuan.tathanh@asnet.com.vn',
  DOMAIN: 'asnet.com.vn',

  // Votes live in a separate sheet, created on first use in the owner's My Drive.
  VOTES_SHEET_TITLE: 'Lunch Menu Votes',
  VOTES_SHEET_PROPERTY: 'VOTES_SHEET_ID',

  // Private Drive folder with the main-dish images, "DD-MM_Dish-name.jpg" (AC13).
  DISH_IMAGES_FOLDER_ID: '1V5qINYcDER4GHPmWbEPW2jo5HG0GEQVE'
};

/**
 * Holiday image slots (AC14). Keys are names as normalizeLabel() returns them
 * (lower case, single spaces), values are image URLs. Empty → placeholder.
 */
var IMAGES = {
  holidays: {}
};
