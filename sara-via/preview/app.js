const items = [
  ['Frontend', 'Next.js 14 + TypeScript + Tailwind + Framer Motion'],
  ['Backend', 'NestJS + Prisma + Redis + Zero Trust'],
  ['Payments', 'Pi approve / complete / verify / reconcile webhook'],
  ['AI', 'GPT-4o + LangChain + Pinecone concierge'],
];

document.getElementById('cta')?.addEventListener('click', () => {
  document.getElementById('status').innerHTML = items
    .map(([title, text]) => `<article class="card"><h3>${title}</h3><p>${text}</p></article>`)
    .join('');
});
