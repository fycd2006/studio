const fs = require('fs');
const path = require('path');

function walk(dir) {
    let count = 0;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const p = path.join(dir, file);
        if (fs.statSync(p).isDirectory()) {
            count += walk(p);
        } else if (p.endsWith('.tsx') && !p.includes('AdminRotationTable')) {
            let content = fs.readFileSync(p, 'utf8');

            const newContent = content.replace(/(<([a-zA-Z0-9]+)[^>]*?)className="([^"]+)"/g, (match, prefix, tag, cls) => {
                if (['table', 'th', 'td', 'tr', 'thead', 'tbody'].includes(tag.toLowerCase())) {
                    return match;
                }
                
                // remove borders
                let newCls = cls.replace(/\b(hover:|focus:|dark:|md:|lg:|sm:|xl:)?(border|ring)[a-z0-9-/]*\b/g, '');
                
                if (!newCls.includes('border-none')) {
                    newCls += ' border-none';
                }

                if ((newCls.includes('bg-white') || newCls.includes('bg-slate') || newCls.includes('bg-stone')) 
                    && !newCls.includes('shadow') && !newCls.includes('bg-transparent')) {
                    if (['button', 'input', 'select', 'textarea'].includes(tag.toLowerCase())) {
                        newCls += ' shadow-sm hover:shadow-md transition-shadow';
                    } else if (tag.toLowerCase() === 'card' || tag.toLowerCase() === 'div' || tag.toLowerCase() === 'section') {
                        newCls += ' shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(255,255,255,0.01)]';
                    }
                }

                newCls = newCls.replace(/\s+/g, ' ').trim();
                return prefix + 'className="' + newCls + '"';
            });

            if (newContent !== content) {
                fs.writeFileSync(p, newContent, 'utf8');
                count++;
            }
        }
    }
    return count;
}

const c = walk('src');
console.log('Modified ' + c + ' files.');