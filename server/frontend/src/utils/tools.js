export const truncateWords = (text, wordLimit = 100) => {
    if (!text) return "";
    const words = text.trim().split(/\s+/);
    return words.length > wordLimit
        ? words.slice(0, wordLimit).join(" ") + "..."
        : text;
};
