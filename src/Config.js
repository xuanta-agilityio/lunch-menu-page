var CONFIG = {
  // Source sheets. READ-ONLY: only SourceSheets.js may open them, and it never writes.
  MENU_SHEET_ID: '1Dw9jGlMDs9iUY_zrgVEfpfaGV8L17B5M1ix1HooRh2g',
  SIGNUP_SHEET_ID: '1kuW7OIoI1i7xL77jOdcXqijWGkx4ELkI4HEPVjD6T-Q',

  ADMIN_EMAIL: 'xuan.tathanh@asnet.com.vn',
  DOMAIN: 'asnet.com.vn',

  // Deployments (AC15, AC17). Only these two give the company view: votes, and counts
  // for the admin. Any other deployment gets the public view, so a new one is safe by default.
  COMPANY_DEPLOYMENT_ID: 'AKfycbyZF5Mp6olm3c0PCO553KsXiSxxJ4bXAz4kmLdGdv1L0ExIIZsc49x3cUNl-2NakmFX',
  DEV_DEPLOYMENT_ID: 'AKfycby5Yjxq92MaJsQssq-VU_uzGT7ah9PDP1mZCGuEjsU', // the editor's /dev URL
  PUBLIC_DEPLOYMENT_ID: 'AKfycbwPPbsGrmrM8IiNSHOMxcEx9ki7bPbY0WtTfV8Vu94sortVl6Xo7Q84Ht1PUD-3sgbh',

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
