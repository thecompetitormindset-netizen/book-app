import { useState } from "react";

// Hand-picked, legal, free (or free-with-library-card) places to find books.
const SITES = [
  { name: "Project Gutenberg", url: "https://www.gutenberg.org", tags: ["Free ebooks", "Classics"],
    about: "70,000+ classic books whose copyright has expired. Download as EPUB, Kindle or read online." },
  { name: "Standard Ebooks", url: "https://standardebooks.org", tags: ["Free ebooks", "Classics"],
    about: "Beautifully formatted, carefully proofread versions of public-domain classics." },
  { name: "Open Library", url: "https://openlibrary.org", tags: ["Borrow", "Free ebooks"],
    about: "Borrow millions of digitized books for free from the Internet Archive, like a library card for the web." },
  { name: "Libby (OverDrive)", url: "https://libbyapp.com", tags: ["Borrow", "Audiobooks"],
    about: "Borrow new ebooks and audiobooks from your local public or school library with a library card." },
  { name: "LibriVox", url: "https://librivox.org", tags: ["Audiobooks", "Classics"],
    about: "Free public-domain audiobooks read by volunteers around the world." },
  { name: "OpenStax", url: "https://openstax.org", tags: ["Textbooks", "Classroom"],
    about: "Free, peer-reviewed college and high-school textbooks: biology, physics, math, history and more." },
  { name: "LibreTexts", url: "https://libretexts.org", tags: ["Textbooks", "Classroom"],
    about: "A huge open library of textbooks for STEM, humanities and social sciences." },
  { name: "Open Textbook Library", url: "https://open.umn.edu/opentextbooks", tags: ["Textbooks", "Classroom"],
    about: "Hundreds of reviewed, openly licensed textbooks you can read, download and share." },
  { name: "Wikibooks", url: "https://www.wikibooks.org", tags: ["Textbooks", "Classroom"],
    about: "Free how-to guides and textbooks written by the Wikipedia community." },
  { name: "Internet Archive", url: "https://archive.org/details/texts", tags: ["Borrow", "Free ebooks"],
    about: "Millions of texts, magazines and old books — free to read in your browser." },
  { name: "Storyline Online", url: "https://storylineonline.net", tags: ["Kids", "Classroom"],
    about: "Children's books read aloud by actors, with free activity guides for teachers." },
  { name: "International Children's Digital Library", url: "http://www.childrenslibrary.org", tags: ["Kids", "Free ebooks"],
    about: "Free children's books from around the world in many languages." },
  { name: "Directory of Open Access Books", url: "https://www.doabooks.org", tags: ["Free ebooks", "Research"],
    about: "Free academic books from university presses — great for essays and projects." },
  { name: "HathiTrust", url: "https://www.hathitrust.org", tags: ["Research", "Free ebooks"],
    about: "Millions of digitized books from research libraries; public-domain ones are free to read." },
  { name: "Google Books", url: "https://books.google.com", tags: ["Discover", "Research"],
    about: "Search inside books, preview pages and find free public-domain titles." },
  { name: "Goodreads", url: "https://www.goodreads.com", tags: ["Discover"],
    about: "Find your next read with reviews, lists and friends' recommendations." },
  { name: "The StoryGraph", url: "https://www.thestorygraph.com", tags: ["Discover"],
    about: "Book recommendations by mood and pace, plus reading challenges." },
];

const TAGS = ["All", ...Array.from(new Set(SITES.flatMap((s) => s.tags)))];

export default function Discover() {
  const [tag, setTag] = useState("All");
  const [q, setQ] = useState("");
  const shown = SITES.filter((s) => tag === "All" || s.tags.includes(tag));

  return (
    <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 sm:py-8">
      <h1 className="text-4xl text-white">Free book websites</h1>
      <p className="text-slate-400 mb-5">Read, borrow and listen for free — legally. Great for school too.</p>

      <form
        className="flex gap-2 mb-5 max-w-xl"
        onSubmit={(e) => {
          e.preventDefault();
          if (q.trim()) window.open(`https://openlibrary.org/search?q=${encodeURIComponent(q.trim())}`, "_blank", "noopener");
        }}
      >
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Find any book on Open Library…"
          className="flex-1 bg-card border border-white/10 rounded-xl px-4 py-2 outline-none focus:border-indigo-500" />
        <button className="bg-indigo-600 hover:bg-indigo-500 rounded-xl px-5">Search</button>
      </form>

      <div className="flex flex-wrap gap-2 mb-6">
        {TAGS.map((t) => (
          <button key={t} onClick={() => setTag(t)}
            className={`px-3 py-1 rounded-full ${tag === t ? "bg-indigo-600" : "bg-white/6 hover:bg-white/12 text-slate-300"}`}>
            {t}
          </button>
        ))}
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {shown.map((s) => (
          <a key={s.name} href={s.url} target="_blank" rel="noopener noreferrer"
            className={`block bg-card border border-white/10 rounded-lg p-5 hover:border-white/20 transition-colors`}>
            <h2 className="text-2xl leading-tight text-white">{s.name}</h2>
            <p className="text-slate-400 text-sm my-2">{s.about}</p>
            <div className="flex flex-wrap gap-1.5">
              {s.tags.map((t) => <span key={t} className="text-xs px-2 py-0.5 rounded-full bg-white/8 text-slate-400">{t}</span>)}
            </div>
          </a>
        ))}
      </div>
    </main>
  );
}
