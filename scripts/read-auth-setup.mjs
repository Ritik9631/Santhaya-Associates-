import fs from 'fs';
const txt = fs.readFileSync('Santhaya-Associates/scripts/verify-quotation-template-update.mjs', 'utf8');
txt.split('\n').slice(30, 65).forEach(l => console.log(l));

