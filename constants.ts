
import { Bookmark } from './types';

export const SAMPLE_BOOKMARKS: Bookmark[] = [
  {
    id: '1',
    url: 'https://react.dev/',
    title: 'React - The library for web and native user interfaces',
    description: 'React is a JavaScript library for building user interfaces. It lets you compose complex UIs from small and isolated pieces of code called “components”.',
    imageUrl: 'https://picsum.photos/seed/react/600/400',
    tags: ['react', 'javascript', 'ui', 'library'],
    notes: 'The official documentation is a great place to start learning.',
    createdAt: new Date().toISOString(),
  },
  {
    id: '2',
    url: 'https://tailwindcss.com/',
    title: 'Tailwind CSS - A utility-first CSS framework',
    description: 'A utility-first CSS framework packed with classes like flex, pt-4, text-center and rotate-90 that can be composed to build any design, directly in your markup.',
    imageUrl: 'https://picsum.photos/seed/tailwind/600/400',
    tags: ['css', 'framework', 'utility-first', 'design'],
    notes: 'Remember to check out the JIT compiler for performance.',
    createdAt: new Date().toISOString(),
  },
  {
    id: '3',
    url: 'https://gemini.google.com/',
    title: 'Google Gemini - A powerful and versatile AI model',
    description: 'Gemini is a family of multimodal large language models developed by Google DeepMind, serving as the successor to LaMDA and PaLM 2.',
    imageUrl: 'https://picsum.photos/seed/gemini/600/400',
    tags: ['ai', 'google', 'llm', 'multimodal'],
    notes: 'This app uses the Gemini API!',
    createdAt: new Date().toISOString(),
  },
   {
    id: '4',
    url: 'https://www.typescriptlang.org/',
    title: 'TypeScript - JavaScript with syntax for types',
    description: 'TypeScript is a strongly typed programming language that builds on JavaScript, giving you better tooling at any scale.',
    imageUrl: 'https://picsum.photos/seed/typescript/600/400',
    tags: ['typescript', 'javascript', 'types', 'compiler'],
    createdAt: new Date().toISOString(),
  },
];
