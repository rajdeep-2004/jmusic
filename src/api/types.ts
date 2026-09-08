/**
 * Internal Track data model normalized from music source.
 * In accordance with buildPlan.md §14.
 */
export interface Track {
  id: string;
  title: string;
  artist: string;
  album?: string;
  duration: number; // in seconds
  artworkUrl?: string;
  audioUrl: string;
}
