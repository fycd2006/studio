const fs = require('fs');
let locZh = fs.readFileSync('src/locales/zh.ts', 'utf8');
locZh = locZh.replace('MILESTONE_1: "一籌",', 'MILESTONE_1: "一收",');
locZh = locZh.replace('MILESTONE_2: "二籌",', 'MILESTONE_2: "二收",');
locZh = locZh.replace('MILESTONE_3: "三籌",', 'MILESTONE_3: "三收",');
locZh = locZh.replace('MEETING_1: "一籌",', 'MEETING_1: "一收",');
locZh = locZh.replace('MEETING_2: "二籌",', 'MEETING_2: "二收",');
locZh = locZh.replace('MEETING_3: "三籌",', 'MEETING_3: "三收",');
fs.writeFileSync('src/locales/zh.ts', locZh, 'utf8');

let locEn = fs.readFileSync('src/locales/en.ts', 'utf8');
locEn = locEn.replace('MILESTONE_1: "1st Meeting",', 'MILESTONE_1: "1st Collection",');
locEn = locEn.replace('MILESTONE_2: "2nd Meeting",', 'MILESTONE_2: "2nd Collection",');
locEn = locEn.replace('MILESTONE_3: "3rd Meeting",', 'MILESTONE_3: "3rd Collection",');
locEn = locEn.replace('MEETING_1: "1st Meeting",', 'MEETING_1: "1st Collection",');
locEn = locEn.replace('MEETING_2: "2nd Meeting",', 'MEETING_2: "2nd Collection",');
locEn = locEn.replace('MEETING_3: "3rd Meeting",', 'MEETING_3: "3rd Collection",');
fs.writeFileSync('src/locales/en.ts', locEn, 'utf8');

let appPage = fs.readFileSync('src/app/page.tsx', 'utf8');
appPage = appPage.replace('label: "一籌"', 'label: "一收"');
appPage = appPage.replace('label: "二籌"', 'label: "二收"');
appPage = appPage.replace('label: "三籌"', 'label: "三收"');
fs.writeFileSync('src/app/page.tsx', appPage, 'utf8');

let dashPage = fs.readFileSync('src/components/Dashboard.tsx', 'utf8');
dashPage = dashPage.replace('一籌 / 1st Meeting', '一收 / 1st Collection');
dashPage = dashPage.replace('二籌 / 2nd Meeting', '二收 / 2nd Collection');
dashPage = dashPage.replace('三籌 / 3rd Meeting', '三收 / 3rd Collection');
fs.writeFileSync('src/components/Dashboard.tsx', dashPage, 'utf8');

let planSidebar = fs.readFileSync('src/components/PlanSidebar.tsx', 'utf8');
planSidebar = planSidebar.replace("l: '一籌'", "l: '一收'");
planSidebar = planSidebar.replace("l: '二籌'", "l: '二收'");
planSidebar = planSidebar.replace("l: '三籌'", "l: '三收'");
fs.writeFileSync('src/components/PlanSidebar.tsx', planSidebar, 'utf8');

console.log('Done');
