import React, { useState, useEffect } from 'react';
import { 
  X, 
  BookOpen, 
  CheckCircle2, 
  XCircle, 
  MapPin, 
  Hash, 
  Layers, 
  Sparkles,
  Bookmark,
  Calendar,
  Building2,
  Tag,
  ArrowRight
} from 'lucide-react';
import { getRelatedBooks } from '../services/api';

export default function BookDetailModal({ book, onClose, onBorrowBook, isBorrowing, onSelectBook, onAskBot }) {
  const [related, setRelated] = useState([]);
  const [loadingRelated, setLoadingRelated] = useState(false);

  useEffect(() => {
    if (book && book.id) {
      setLoadingRelated(true);
      getRelatedBooks(book.id, 4)
        .then(res => setRelated(res.related || []))
        .catch(() => setRelated([]))
        .finally(() => setLoadingRelated(false));
    }
  }, [book]);

  if (!book) return null;

  const isAvailable = book.available_copies > 0;
  const fallbackCover = 'https://images.unsplash.com/photo-1544716278-ca5e3f4abd8c?auto=format&fit=crop&w=600&q=80';
  const coverSrc = book.cover_image || fallbackCover;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div 
        className="modal-content-card" 
        onClick={(e) => e.stopPropagation()} 
        style={{ maxWidth: '780px' }}
      >
        {/* Header bar */}
        <div className="d-flex align-items-center justify-content-between p-4 border-bottom bg-light">
          <div className="d-flex align-items-center gap-2">
            <span className="badge-active-teal px-3 py-1 rounded-pill small fw-semibold">
              {book.department || 'Engineering'}
            </span>
            <span className="text-muted small">
              Category: <strong>{book.category}</strong>
            </span>
          </div>
          <button 
            type="button" 
            className="btn btn-sm btn-light border-0 rounded-circle p-2 text-muted"
            onClick={onClose}
          >
            <X size={20} />
          </button>
        </div>

        {/* Main Body */}
        <div className="p-4">
          <div className="row g-4">
            {/* Left Cover Image */}
            <div className="col-12 col-md-4">
              <div 
                className="rounded-3 overflow-hidden shadow-sm border bg-light"
                style={{ aspectRatio: '3 / 4.2' }}
              >
                <img 
                  src={coverSrc} 
                  alt={book.title}
                  className="w-100 h-100 object-fit-cover"
                  onError={(e) => { e.target.src = fallbackCover; }}
                />
              </div>

              {/* Stock Status Badge */}
              <div className="mt-3 p-2.5 rounded-3 border text-center bg-light">
                <div className="d-flex align-items-center justify-content-center gap-1.5 mb-1">
                  {isAvailable ? (
                    <CheckCircle2 size={16} className="text-teal-600" />
                  ) : (
                    <XCircle size={16} className="text-danger" />
                  )}
                  <span className={`fw-bold small ${isAvailable ? 'text-teal-600' : 'text-danger'}`}>
                    {isAvailable ? 'Available for Checkout' : 'All Copies Issued'}
                  </span>
                </div>
                <div className="text-muted" style={{ fontSize: '0.78rem' }}>
                  <strong>{book.available_copies}</strong> of <strong>{book.total_copies}</strong> copies in stock
                </div>
              </div>

              {/* Borrow Online Action */}
              {onBorrowBook && (
                <button
                  type="button"
                  className={`btn w-100 mt-3 py-2.5 rounded-3 fw-semibold d-flex align-items-center justify-content-center gap-2 ${
                    isAvailable ? 'btn-teal' : 'btn-light border text-muted'
                  }`}
                  disabled={!isAvailable || isBorrowing}
                  onClick={() => {
                    if (isAvailable) onBorrowBook(book);
                  }}
                >
                  {isBorrowing ? (
                    <>
                      <span className="spinner-border spinner-border-sm" role="status"></span>
                      <span>Borrowing...</span>
                    </>
                  ) : isAvailable ? (
                    <>
                      <BookOpen size={16} />
                      <span>Borrow This Book Online</span>
                    </>
                  ) : (
                    <span>Currently Checked Out</span>
                  )}
                </button>
              )}

              {onAskBot && (
                <button
                  type="button"
                  className="btn btn-outline-navy w-100 mt-2 py-2 rounded-3 small fw-semibold d-flex align-items-center justify-content-center gap-2"
                  onClick={() => {
                    onClose();
                    onAskBot(book);
                  }}
                >
                  <Sparkles size={14} className="text-teal-600" />
                  <span>Ask AI Assistant</span>
                </button>
              )}
            </div>

            {/* Right Book Details */}
            <div className="col-12 col-md-8">
              <h3 className="fw-bold text-navy-900 mb-1" style={{ letterSpacing: '-0.02em', lineHeight: '1.25' }}>
                {book.title}
              </h3>
              <p className="text-secondary mb-3">
                Author: <strong className="text-navy-900">{book.author}</strong>
              </p>

              {/* Metadata Grid */}
              <div className="row g-2 mb-4 p-3 rounded-3 bg-light border text-secondary small">
                <div className="col-6 d-flex align-items-center gap-2">
                  <Building2 size={14} className="text-muted" />
                  <span>Dept: <strong className="text-navy-900">{book.department || 'CSE'}</strong></span>
                </div>
                <div className="col-6 d-flex align-items-center gap-2">
                  <Hash size={14} className="text-muted" />
                  <span>ISBN: <strong className="text-navy-900">{book.isbn || '978-0131103627'}</strong></span>
                </div>
                <div className="col-6 d-flex align-items-center gap-2">
                  <MapPin size={14} className="text-muted" />
                  <span>Shelf: <strong className="text-navy-900">{book.shelf_location || 'A1-04'}</strong></span>
                </div>
                <div className="col-6 d-flex align-items-center gap-2">
                  <Calendar size={14} className="text-muted" />
                  <span>Year: <strong className="text-navy-900">{book.published_year || 2024}</strong></span>
                </div>
              </div>

              {/* Description */}
              <div className="mb-4">
                <h6 className="fw-bold text-navy-900 mb-2">Book Description & Syllabus Scope</h6>
                <p className="text-secondary small leading-relaxed mb-0" style={{ lineHeight: '1.65' }}>
                  {book.description || 'Comprehensive textbook tailored for university degree programs, featuring in-depth theoretical foundations, practical engineering examples, and end-of-chapter academic exercises.'}
                </p>
              </div>

              {/* AI Related Recommendations */}
              <div className="mt-4 pt-3 border-top">
                <div className="d-flex align-items-center justify-content-between mb-3">
                  <div className="d-flex align-items-center gap-1.5">
                    <Sparkles size={16} className="text-teal-600" />
                    <h6 className="fw-bold text-navy-900 mb-0">Related AI Recommendations</h6>
                  </div>
                  <span className="text-muted" style={{ fontSize: '0.72rem' }}>TF-IDF & Cross-Discipline Match</span>
                </div>

                {loadingRelated ? (
                  <div className="text-center py-3 text-muted small">
                    <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                    Analyzing subject similarity...
                  </div>
                ) : related.length === 0 ? (
                  <div className="text-muted small fst-italic">No related books found in this category.</div>
                ) : (
                  <div className="row g-2">
                    {related.map(rel => (
                      <div key={rel.id} className="col-6">
                        <div 
                          className="p-2.5 rounded-3 border bg-white shadow-xs d-flex align-items-center gap-2 cursor-pointer hover-card"
                          style={{ cursor: 'pointer', transition: 'all 0.15s ease' }}
                          onClick={() => onSelectBook && onSelectBook(rel)}
                        >
                          <img 
                            src={rel.cover_image || fallbackCover} 
                            alt={rel.title}
                            style={{ width: '38px', height: '48px', objectFit: 'cover', borderRadius: '4px' }}
                            onError={(e) => { e.target.src = fallbackCover; }}
                          />
                          <div className="overflow-hidden flex-grow-1">
                            <div className="fw-semibold text-navy-900 text-truncate" style={{ fontSize: '0.8rem' }}>
                              {rel.title}
                            </div>
                            <div className="text-muted text-truncate" style={{ fontSize: '0.7rem' }}>
                              {rel.category}
                            </div>
                          </div>
                          <ArrowRight size={13} className="text-muted flex-shrink-0" />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
