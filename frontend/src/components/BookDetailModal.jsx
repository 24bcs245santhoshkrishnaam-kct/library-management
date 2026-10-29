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
  ArrowRight,
  Briefcase,
  TrendingUp,
  DollarSign,
  Award,
  Globe,
  ChevronDown,
  ChevronUp,
  AlertCircle
} from 'lucide-react';
import { getRelatedBooks, getCareerGuidance } from '../services/api';

export default function BookDetailModal({ book, onClose, onBorrowBook, isBorrowing, onSelectBook, onAskBot }) {
  const [related, setRelated] = useState([]);
  const [loadingRelated, setLoadingRelated] = useState(false);
  
  // Career Guidance state for this book
  const [careerData, setCareerData] = useState(null);
  const [loadingCareer, setLoadingCareer] = useState(false);
  const [showCareerPanel, setShowCareerPanel] = useState(false);
  const [currencyRegion, setCurrencyRegion] = useState('india'); // 'india' | 'global'

  useEffect(() => {
    if (book && book.id) {
      setLoadingRelated(true);
      getRelatedBooks(book.id, 4)
        .then(res => setRelated(res.related || []))
        .catch(() => setRelated([]))
        .finally(() => setLoadingRelated(false));

      setLoadingCareer(true);
      getCareerGuidance({ bookId: book.id })
        .then(res => setCareerData(res))
        .catch(() => setCareerData(null))
        .finally(() => setLoadingCareer(false));
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
        style={{ maxWidth: '820px', maxHeight: '90vh', overflowY: 'auto' }}
      >
        {/* Header bar */}
        <div className="d-flex align-items-center justify-content-between p-4 border-bottom bg-light sticky-top">
          <div className="d-flex align-items-center gap-2 flex-wrap">
            <span className="badge-active-teal px-3 py-1 rounded-pill small fw-semibold">
              {book.department || 'Library'}
            </span>
            <span className="text-muted small">
              Category: <strong>{book.category}</strong>
            </span>
            {book.language && book.language === 'Tamil' && (
              <span className="badge bg-danger bg-opacity-10 text-danger border border-danger border-opacity-25 rounded-pill px-2.5 py-0.5 small fw-semibold">
                தமிழ் நூல்
              </span>
            )}
            {book.catalog_collection === 'Shakespeare Collection' && (
              <span className="badge bg-primary bg-opacity-10 text-primary border border-primary border-opacity-25 rounded-pill px-2.5 py-0.5 small fw-semibold">
                Shakespeare
              </span>
            )}
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
              <p className="text-secondary mb-2">
                Author: <strong className="text-navy-900">{book.author}</strong>
              </p>

              {book.alternate_titles && (
                <div className="text-muted small fst-italic mb-3">
                  Also known as: <span>{book.alternate_titles}</span>
                </div>
              )}

              {/* Metadata Grid */}
              <div className="row g-2 mb-4 p-3 rounded-3 bg-light border text-secondary small">
                <div className="col-6 d-flex align-items-center gap-2">
                  <Building2 size={14} className="text-muted" />
                  <span>Dept: <strong className="text-navy-900">{book.department || 'General'}</strong></span>
                </div>
                <div className="col-6 d-flex align-items-center gap-2">
                  <Hash size={14} className="text-muted" />
                  <span>ISBN: <strong className="text-navy-900">{book.isbn || 'N/A'}</strong></span>
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
                <h6 className="fw-bold text-navy-900 mb-2">Book Description & Scope</h6>
                <p className="text-secondary small leading-relaxed mb-0" style={{ lineHeight: '1.65' }}>
                  {book.description || 'Comprehensive textbook tailored for academic degree programs, featuring in-depth theoretical foundations, practical examples, and scholarly exercises.'}
                </p>
              </div>

              {/* AI Career Paths & Earning Opportunities Panel */}
              <div className="mb-4 border rounded-3 overflow-hidden bg-white">
                <div 
                  className="d-flex align-items-center justify-content-between p-3 bg-light border-bottom cursor-pointer"
                  style={{ cursor: 'pointer' }}
                  onClick={() => setShowCareerPanel(!showCareerPanel)}
                >
                  <div className="d-flex align-items-center gap-2">
                    <Briefcase size={16} className="text-teal-600" />
                    <span className="fw-bold text-navy-900 small">
                      Career Paths & Earning Opportunities
                    </span>
                    <span className="badge bg-teal-50 text-teal-700 border border-teal-200 small py-0.5 px-2 rounded-pill">
                      AI Career Engine
                    </span>
                  </div>
                  <button type="button" className="btn btn-sm btn-link text-muted p-0 text-decoration-none">
                    {showCareerPanel ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                  </button>
                </div>

                {showCareerPanel && (
                  <div className="p-3 bg-white">
                    {loadingCareer ? (
                      <div className="text-center py-3 text-muted small">
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        Analyzing career pathways and compensation benchmarks...
                      </div>
                    ) : careerData ? (
                      <div>
                        {/* Domain */}
                        <div className="mb-3">
                          <span className="text-muted small">Subject Field: </span>
                          <strong className="text-navy-900 small">{careerData.domain}</strong>
                        </div>

                        {/* Skills Learned */}
                        <div className="mb-3">
                          <h6 className="fw-bold text-navy-900 small mb-1.5 d-flex align-items-center gap-1.5">
                            <Award size={14} className="text-teal-600" />
                            Skills You Can Learn From This Subject:
                          </h6>
                          <ul className="mb-0 ps-3 small text-secondary">
                            {careerData.skillsLearned.map((skill, idx) => (
                              <li key={idx} className="mb-1">{skill}</li>
                            ))}
                          </ul>
                        </div>

                        {/* Possible Career Paths */}
                        <div className="mb-3">
                          <h6 className="fw-bold text-navy-900 small mb-1.5 d-flex align-items-center gap-1.5">
                            <Briefcase size={14} className="text-teal-600" />
                            Possible Career Paths:
                          </h6>
                          <div className="d-flex flex-wrap gap-1.5">
                            {careerData.careerPaths.map((path, idx) => (
                              <span key={idx} className="badge bg-light text-navy-900 border rounded-pill px-2.5 py-1 small">
                                {path}
                              </span>
                            ))}
                          </div>
                        </div>

                        {/* How People Earn Money */}
                        <div className="mb-3">
                          <h6 className="fw-bold text-navy-900 small mb-1.5 d-flex align-items-center gap-1.5">
                            <TrendingUp size={14} className="text-teal-600" />
                            How People Earn Money With These Skills:
                          </h6>
                          <ul className="mb-0 ps-3 small text-secondary">
                            {careerData.realWorldApplications.map((app, idx) => (
                              <li key={idx} className="mb-1">{app}</li>
                            ))}
                          </ul>
                        </div>

                        {/* Earning & Salary Benchmarks */}
                        {careerData.earningGuidance && (
                          <div className="p-3 rounded-3 bg-light border mb-2">
                            <div className="d-flex align-items-center justify-content-between mb-2">
                              <span className="fw-bold text-navy-900 small d-flex align-items-center gap-1.5">
                                <DollarSign size={14} className="text-teal-600" />
                                Realistic Market Earning Estimates
                              </span>
                              <div className="btn-group btn-group-sm">
                                <button
                                  type="button"
                                  className={`btn btn-xs py-0.5 px-2 ${currencyRegion === 'india' ? 'btn-navy active' : 'btn-light border'}`}
                                  onClick={() => setCurrencyRegion('india')}
                                  style={{ fontSize: '0.72rem' }}
                                >
                                  India (₹ INR)
                                </button>
                                <button
                                  type="button"
                                  className={`btn btn-xs py-0.5 px-2 ${currencyRegion === 'global' ? 'btn-navy active' : 'btn-light border'}`}
                                  onClick={() => setCurrencyRegion('global')}
                                  style={{ fontSize: '0.72rem' }}
                                >
                                  Global ($ USD)
                                </button>
                              </div>
                            </div>

                            {currencyRegion === 'india' ? (
                              <div className="row g-2 small mb-2">
                                <div className="col-4">
                                  <div className="p-2 bg-white rounded border">
                                    <div className="text-muted" style={{ fontSize: '0.7rem' }}>Entry-Level / Fresher</div>
                                    <div className="fw-bold text-navy-900" style={{ fontSize: '0.8rem' }}>
                                      {careerData.earningGuidance.india.entryLevel}
                                    </div>
                                  </div>
                                </div>
                                <div className="col-4">
                                  <div className="p-2 bg-white rounded border">
                                    <div className="text-muted" style={{ fontSize: '0.7rem' }}>Experienced Professional</div>
                                    <div className="fw-bold text-teal-700" style={{ fontSize: '0.8rem' }}>
                                      {careerData.earningGuidance.india.experienced}
                                    </div>
                                  </div>
                                </div>
                                <div className="col-4">
                                  <div className="p-2 bg-white rounded border">
                                    <div className="text-muted" style={{ fontSize: '0.7rem' }}>Freelance / Contract</div>
                                    <div className="fw-bold text-navy-900" style={{ fontSize: '0.8rem' }}>
                                      {careerData.earningGuidance.india.freelance}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            ) : (
                              <div className="row g-2 small mb-2">
                                <div className="col-4">
                                  <div className="p-2 bg-white rounded border">
                                    <div className="text-muted" style={{ fontSize: '0.7rem' }}>Entry-Level / Junior</div>
                                    <div className="fw-bold text-navy-900" style={{ fontSize: '0.8rem' }}>
                                      {careerData.earningGuidance.global.entryLevel}
                                    </div>
                                  </div>
                                </div>
                                <div className="col-4">
                                  <div className="p-2 bg-white rounded border">
                                    <div className="text-muted" style={{ fontSize: '0.7rem' }}>Experienced Specialist</div>
                                    <div className="fw-bold text-teal-700" style={{ fontSize: '0.8rem' }}>
                                      {careerData.earningGuidance.global.experienced}
                                    </div>
                                  </div>
                                </div>
                                <div className="col-4">
                                  <div className="p-2 bg-white rounded border">
                                    <div className="text-muted" style={{ fontSize: '0.7rem' }}>Freelance Hourly</div>
                                    <div className="fw-bold text-navy-900" style={{ fontSize: '0.8rem' }}>
                                      {careerData.earningGuidance.global.freelance}
                                    </div>
                                  </div>
                                </div>
                              </div>
                            )}

                            <div className="text-muted d-flex align-items-center gap-1" style={{ fontSize: '0.68rem' }}>
                              <span>📊 Source: {careerData.earningGuidance.source}</span>
                            </div>
                            <div className="text-muted mt-1 fst-italic" style={{ fontSize: '0.68rem', lineHeight: '1.3' }}>
                              ⚠️ {careerData.earningGuidance.disclaimer}
                            </div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-muted small">Career guidance information unavailable.</div>
                    )}
                  </div>
                )}
              </div>

              {/* AI Related Recommendations */}
              <div className="mt-4 pt-3 border-top">
                <div className="d-flex align-items-center justify-content-between mb-3">
                  <div className="d-flex align-items-center gap-1.5">
                    <Sparkles size={16} className="text-teal-600" />
                    <h6 className="fw-bold text-navy-900 mb-0">Related Books in College Library</h6>
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
