const fs = require('fs');

let pageContent = fs.readFileSync('src/app/plans/page.tsx', 'utf8');

// The hover class is empty in grid items "hover: dark:hover: "
const brokenHover = "hover: dark:hover: ";
const newHover = "hover:-translate-y-1 hover:shadow-xl dark:hover:shadow-black/50 ";

if (pageContent.includes(brokenHover)) {
  pageContent = pageContent.replaceAll(brokenHover, newHover);
  fs.writeFileSync('src/app/plans/page.tsx', pageContent, 'utf8');
  console.log('Hover effects restored!');
} else {
  console.log('No broken hover effects found.');
}
