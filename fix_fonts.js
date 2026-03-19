const fs = require('fs');
const filePath = 'src/components/Dashboard/OKRDashboard.jsx';
let content = fs.readFileSync(filePath, 'utf8');

// Replace all uppercase with capitalize
content = content.replace(/\buppercase\b/g, 'capitalize');

// Replace all font-black and font-bold with font-medium
content = content.replace(/\bfont-black\b/g, 'font-medium');
content = content.replace(/\bfont-bold\b/g, 'font-medium');

// The user specifically mentioned the entire page words should be capitalize,
// make sure the headers in the string are properly cased if they are ALL CAPS in the JSX
// Looking at the table headers: "OBJ ID", "OBJECTIVE", "DEPTS", etc.
// They were hardcoded as uppercase strings in JSX:
// <th className="py-4 px-6">OBJ ID</th> -> <th className="py-4 px-6">Obj Id</th>
content = content.replace(/>OBJ ID</g, '>Obj Id<');
content = content.replace(/>OBJECTIVE</g, '>Objective<');
content = content.replace(/>DEPTS</g, '>Depts<');
content = content.replace(/>DONE</g, '>Done<');
content = content.replace(/>TOTAL</g, '>Total<');
content = content.replace(/>PROGRESS</g, '>Progress<');
content = content.replace(/>HEALTH</g, '>Health<');
content = content.replace(/>RISK</g, '>Risk<');

// Also the page title: FJ GROUP — OKR EXECUTION DASHBOARD
content = content.replace(/>FJ GROUP — OKR EXECUTION DASHBOARD</g, '>Fj Group — Okr Execution Dashboard<');

fs.writeFileSync(filePath, content, 'utf8');
console.log('Successfully updated fonts and text casing.');
