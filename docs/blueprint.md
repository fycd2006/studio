# **App Name**: Camp Plan Studio

## Core Features:

- Lesson Plan Management: Organize lesson plans into 'Activity Group' and 'Teaching Group' via a left sidebar. Includes functionality to add, delete (with 'admin' password confirmation), and drag-and-drop to reorder lesson plans. All data is automatically saved to LocalStorage.
- Detailed Lesson Plan Editor: Input fields for lesson details: 'Scheduled Name' (dropdown), 'Activity Name', 'Lesson Plan Members', 'Lesson Plan Time', 'Location', and 'Purpose'. Text areas like 'Process', 'Opening/Closing Remarks', and 'Remarks' support Markdown rendering.
- Google Document Integration: A dedicated field for 'Google Doc Link' that automatically displays a live preview within an 800px tall iframe when a valid URL is entered.
- Interactive Drawing Canvas: Integrates a Fabric.js powered canvas in the 'Lesson Plan Content' section, offering drawing tools like multi-color pens (adjustable thickness), multi-size erasers, text insertion (double-click to edit), image insertion, and geometric shapes (rectangle, circle, triangle, line).
- Canvas Object Manipulation: Supports object selection on the canvas, allowing free movement, rotation, scaling, and layering controls ('Bring to Front/Back') for all drawn and inserted elements.
- Real-time Canvas Persistence: Automatically saves all changes made on the interactive canvas in real-time, ensuring the visual content is retained within the respective lesson plan data in LocalStorage.
- AI Content Assistant: A generative AI tool that can suggest initial drafts or enhance descriptions for lesson plan objectives, activity names, or introductory/concluding remarks based on user input or keywords.

## Style Guidelines:

- Primary color: A mid-tone, composed blue (#336699), chosen to convey clarity, organization, and a connection to the serene aspects of nature and learning for camp planning.
- Background color: A very light, almost white shade with a subtle hint of the primary blue (#F7F9FC), providing a clean and calm canvas for content.
- Accent color: A vibrant, energetic aqua (#39BDDD), used sparingly for interactive elements, highlights, and calls to action to create engaging contrast.
- Headline font: 'Space Grotesk' (sans-serif) for its modern, slightly technical feel, suitable for titles and emphasized text.
- Body font: 'Inter' (sans-serif) for its high readability, neutral design, and versatility, ideal for detailed lesson plan content and editor fields.
- Use clear, concise, and modern line icons that subtly convey the function, maintaining a streamlined and professional appearance aligned with the Shadcn UI framework.
- Implement a two-column layout with a fixed-width left sidebar for navigation and a main content area for the lesson plan editor and canvas. Utilize responsive design principles for adaptability across device sizes.
- Apply subtle, non-intrusive animations for state changes, such as item reordering, dialogue box transitions, and interactive canvas element manipulations, ensuring a smooth user experience.