let cachedTailwind = null;
const taiwlindUrl = "https://cdn.jsdelivr.net/npm/tailwindcss@2.2.19/dist/tailwind.min.css";

export const getTailwindCss = async () => {
    if (cachedTailwind) return cachedTailwind;

    try {
        const cdnLink = await fetch(taiwlindUrl, { cache: "force-cache" })

    } catch (error) {
        console.error("Tailwind fetch failed:", err);
        cachedTailwind = ""; // fallback safe empty
    }

    return cachedTailwind
}