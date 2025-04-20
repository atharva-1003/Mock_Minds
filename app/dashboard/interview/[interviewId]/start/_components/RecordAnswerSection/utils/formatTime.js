/**
 * Formats seconds into MM:SS format
 * @param {number} seconds - Number of seconds to format
 * @returns {string} Formatted time string in MM:SS format
 */
export const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
}; 