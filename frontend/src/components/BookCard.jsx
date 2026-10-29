import React, { useState } from 'react';
import { BookOpen } from 'lucide-react';

/**
 * STRICT REQUIREMENT (Section 5):
 * Displays ONLY:
 * 1. Book picture or cover
 * 2. Book name directly below the picture
 * NO authors, ISBNs, descriptions, prices, availability counts or buttons on this grid card!
 */
export default function BookCard({ book, onSelectBook }) {
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  // Fallback high-quality engineering book placeholder
  const fallbackCover = 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=400&q=80';
  const coverSrc = (!imageError && book.cover_image) ? book.cover_image : fallbackCover;

  return (
    <div 
      className="book-cover-card"
      onClick={() => onSelectBook && onSelectBook(book)}
      title={`Click to view full details for "${book.title}"`}
    >
      <div className="book-cover-wrapper">
        {!imageLoaded && (
          <div className="position-absolute top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center bg-light">
            <BookOpen size={24} className="text-muted opacity-50" />
          </div>
        )}
        <img
          src={coverSrc}
          alt={book.title}
          className="book-cover-image"
          loading="lazy"
          onLoad={() => setImageLoaded(true)}
          onError={() => {
            setImageError(true);
            setImageLoaded(true);
          }}
        />
      </div>

      <div className="book-title-box">
        <h6 className="book-card-name">
          {book.title}
        </h6>
      </div>
    </div>
  );
}
