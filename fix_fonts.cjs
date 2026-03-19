const fs = require('fs');
const filePath = 'src/components/Dashboard/OKRDashboard.jsx';
let content = fs.readFileSync(filePath, 'utf8');

content = content.replace(/\buppercase\b/g, 'capitalize');
content = content.replace(/\bfont-black\b/g, 'font-medium');
content = content.replace(/\bfont-bold\b/g, 'font-medium');

content = content.replace(/>OBJ ID</g, '>Obj Id<');
content = content.replace(/>OBJECTIVE</g, '>Objective<');
content = content.replace(/>DEPTS</g, '>Depts<');
content = content.replace(/>DONE</g, '>Done<');
content = content.replace(/>TOTAL</g, '>Total<');
content = content.replace(/>PROGRESS</g, '>Progress<');
content = content.replace(/>HEALTH</g, '>Health<');
content = content.replace(/>RISK</g, '>Risk<');
content = content.replace(/>FJ GROUP — OKR EXECUTION DASHBOARD</g, '>Fj Group — Okr Execution Dashboard<');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated fonts and text casing.');
