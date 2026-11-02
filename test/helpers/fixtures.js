// November 2026 test data in the real layout of the two source sheets, as read
// on 30 Oct 2026. Tests change copies of this data, never the real sheets.

const MENU_DAYS = [
  ['02/11/2026', [['Cá chiên mắm xoài', true], ['Đậu khuôn chiên xốt cà'], ['Bầu luộc'], ['Canh chua nấu đầu cá']]],
  ['03/11/2026', [['Thịt rang tôm', true], ['Cá cơm chiên mắm'], ['Rau bắp cải luộc'], ['Nước rau luộc']]],
  ['04/11/2026', [['Bún cá', true]]],
  ['05/11/2026', [['Mực xào thơm cà', true], ['Trứng kho'], ['Rau cải thìa xào'], ['Canh cải nấu tôm']]],
  ['06/11/2026', [['Cơm gà quay', true], ['Canh Lagim']]],
  ['09/11/2026', [['Sườn kho đậu khuôn', true], ['Khổ qua xào trứng'], ['Canh cải nấu tôm']]],
  ['10/11/2026', [['Phở bò', true]]],
  ['11/11/2026', [['Cá kho thơm', true], ['Cà tím mỡ hành'], ['Rau muống luộc'], ['Nước rau luộc']]],
  ['12/11/2026', [['Thịt xíu mại xốt cà', true], ['Súp lơ xào tim'], ['Canh cải nấu thịt']]],
  ['13/11/2026', [['Mì quảng cá ', true]]],
  ['16/11/2026', [['Bò xào cần'], ['Đậu khuôn nhồi thịt ', true], ['Xà lách, dưa leo'], ['Canh cải nấu tôm']]],
  ['17/11/2026', [['Cá kho tộ', true], ['Mướp xào mề gà'], ['Canh rau lang nấu hến'], ['Nước rau luộc']]],
  ['18/11/2026', [['Bún giò', true]]],
  ['19/11/2026', [['Gà xào sả ớt', true], ['Tôm xào đậu cove'], ['Canh khổ qua nấu thịt ']]],
  ['20/11/2026', [['Cơm tấm', true], ['Canh rong biển ']]],
  ['23/11/2026', [['Cá chiên', true], ['Thịt rang'], ['Bầu luộc'], ['Canh rau muống nấu hến']]],
  ['24/11/2026', [['Miến lươn', true]]],
  ['25/11/2026', [['Thịt heo quay', true], ['Trứng chiên'], ['Dưa giá'], ['Canh rau dền nấu tôm']]],
  ['26/11/2026', [['Cá kho tộ', true], ['Thịt xào dưa cải'], ['Rau mồng tơi xào '], ['Canh bí đao nấu tôm']]],
  ['27/11/2026', [['Hủ tiếu mực', true]]],
  ['30/11/2026', [['', false], ['', false], ['', false]]]
];

/** Menu tab 11/2026: month picker on row 1, header on row 3, a day's date on its first row only. */
function menuNovember() {
  const rows = [
    ['Chọn Tháng', '02/11/2026'],
    [],
    ['TUẦN', 'THỨ', 'NGÀY', 'TÊN MÓN', 'MÓN CHÍNH', 'NGÀY NGHỈ LỄ', 'REFERENCE IMAGES', 'REFERENCE HOLIDAY']
  ];
  MENU_DAYS.forEach(([date, dishes]) => {
    dishes.forEach(([name, main], i) => {
      rows.push(['', '', i === 0 ? date : '', name, main ? 'TRUE' : 'FALSE', '', main ? '#REF!' : '', '']);
    });
  });
  return rows;
}

// Day numbers in row 2 start at 2: 1 Nov is a Sunday and has no column.
const DAY_NUMBERS = Array.from({ length: 29 }, (_, i) => String(i + 2));
const X_MARKS = DAY_NUMBERS.map((d) => (['7', '8', '14', '15', '21', '22', '28', '29'].includes(d) ? '' : 'x'));
const person = (no, name, label) => [String(no), name, '', '', label, ...X_MARKS];

const NT604 = ['90', '90', '90', '89', '89', '', '', '90', '90', '90', '90', '89', '', '', '90', '90', '90', '89', '89', '', '', '90', '90', '90', '90', '90', '', '', '90'];
const TL18 = ['108', '108', '108', '108', '108', '0', '0', '108', '108', '108', '108', '108', '0', '0', '108', '108', '108', '108', '108', '0', '0', '108', '108', '108', '108', '108', '', '', '108'];
const HOME = ['15', '15', '15', '15', '15', '', '', '15', '15', '15', '15', '15', '', '', '15', '15', '15', '15', '15', '', '', '15', '15', '15', '15', '15', '', '', '15'];

/** Sign-up tab 2026-11: day numbers in row 2, labels in column E, people mixed with total rows. */
function signupNovember() {
  return [
    [],
    ['STT', 'Full Name', 'lastName', 'firstName', '', ...DAY_NUMBERS, 'Ghi chú'],
    person(1, 'Người Một', '2B'),
    person(2, 'Người Hai', '5A'),
    [],
    person(3, 'Người Ba', 'WFH'),
    ['96', 'x', '', '', 'VP 604 NT', ...NT604],
    person(4, 'Người Bốn', 'TL18 - 1'),
    person(5, 'Người Năm', 'TL18 '),
    person(6, 'Người Sáu', 'TL18'),
    ['212', '', '', '', 'VP TL18', ...TL18],
    person(7, 'Người Bảy', 'Home'),
    ['228', '', '', '', 'Mang về', ...HOME],
    ['229'],
    person(8, 'Người Tám', 'WFH')
  ];
}

/** Column index of a day number in the sign-up tab (day 2 is column F). */
const signupDayColumn = (day) => 5 + (day - 2);

/** Finds a total row by its exact label in column E. */
const signupRow = (rows, label) => rows.find((r) => r[4] === label);

// The file names in the real Drive image folder (20 files; none for 30/11).
const IMAGE_FILES = [
  '02-11_Ca-chien-mam-xoai.jpg', '03-11_Thit-rang-tom.jpg', '04-11_Bun-ca.jpg', '05-11_Muc-xao-thom-ca.jpg',
  '06-11_Com-ga-quay.jpg', '09-11_Suon-kho-dau-khuon.jpg', '10-11_Pho-bo.jpg', '11-11_Ca-kho-thom.jpg',
  '12-11_Thit-xiu-mai-xot-ca.jpg', '13-11_Mi-quang-ca.jpg', '16-11_Dau-khuon-nhoi-thit.jpg', '17-11_Ca-kho-to.jpg',
  '18-11_Bun-gio.jpg', '19-11_Ga-xao-sa-ot.jpg', '20-11_Com-tam.jpg', '23-11_Ca-chien.jpg', '24-11_Mien-luon.jpg',
  '25-11_Thit-heo-quay.jpg', '26-11_Ca-kho-to.jpg', '27-11_Hu-tieu-muc.jpg'
];

module.exports = { menuNovember, signupNovember, signupDayColumn, signupRow, IMAGE_FILES };
