export const API_BASE_URL = (
  process.env.NEXT_PUBLIC_API_URL ||
  (typeof window !== 'undefined' && window.location.hostname === 'localhost'
    ? 'http://localhost:4000'
    : 'https://agentic-code-lab.onrender.com')
).replace(/\/$/, '');
