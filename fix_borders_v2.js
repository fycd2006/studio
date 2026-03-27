const fs = require('fs');
const path = require('path');

function walk(dir) {
    let count = 0;
    const files = fs.readdirSync(dir);
    for (const file of files) {
        const p = path.join(dir, file);
        if (fs.statSync(p).isDirectory()) {
            count += walk(p);
        } else if (p.endsWith('.tsx') || p.endsWith('.ts')) {
            // skip explicitly if needed, but we do table checks
            let content = fs.readFileSync(p, 'utf8');

            const newContent = content.replace(/(<([a-zA-Z0-9]+)[^>]*?)className=\"([^\"]+)\"/g, (match, prefix, tag, cls) => {
                if (['table', 'th', 'td', 'tr', 'thead', 'tbody'].includes(tag.toLowerCase())) {
                    return match; // don't touch table borders
                }
                
                // Track if it had borders
                const hadBorder = /\b(border|ring)[a-z0-9-/]*\b/.test(cls);
                
                // Remove borders
                let newCls = cls.replace(/\b(hover:|focus:|dark:|md:|lg:|sm:|xl:)?(border|ring)[a-z0-9-/]*\b/g, '');
                
                // Only add border-none if we removed border or if it's an input/button where default borders appear
                // Wait, default HTML inputs have borders. So we should add border-none to inputs/buttons/selects if they don't have it
                const isFormEl = ['button', 'input', 'select', 'textarea'].includes(tag.toLowerCase());
                
                if ((hadBorder || isFormEl) && !newCls.includes('border-none') && !newCls.includes('border-0')) {
                    newCls += ' border-none';
                }

                // Add nice shadow to add 3D feel if it has a background or it's a form element
                const hasBg = /\bbg-(white|slate-|stone-|zinc-|gray-|\[)/.test(cls);
                
                if (isFormEl && !newCls.includes('shadow')) {
                    newCls += ' shadow-[0_2px_8px_rgba(0,0,0,0.04)] hover:shadow-md transition-shadow';
                } else if ((tag.toLowerCase() === 'div' || tag.toLowerCase() === 'section' || tag.toLowerCase() === 'article') && hasBg && hadBorder && !newCls.includes('shadow')) {
                    newCls += ' shadow-[0_8px_30px_rgb(0,0,0,0.04)] dark:shadow-[0_8px_30px_rgba(255,255,255,0.01)]';
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
