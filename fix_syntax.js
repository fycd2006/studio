const fs = require('fs');

const path = 'src/app/plans/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// Replace literal "\\n" right before "const handleUpdatePlanGroup" with a real newline
if (content.includes(';\\n')) {
    content = content.replace(/;\\n\s*const handleUpdatePlanGroup/, ';\n\n  const handleUpdatePlanGroup');
    fs.writeFileSync(path, content, 'utf8');
    console.log('Fixed syntax error.');
} else {
    // maybe it is around the exact spot
    const problemStr = ');\\n';
    if (content.includes(problemStr)) {
        content = content.replace(/\);\n*/g, ');\n');
        content = content.replace(/\);\\n/g, ');\n');
        fs.writeFileSync(path, content, 'utf8');
        console.log('Fixed literal \\n.');
    }
}
