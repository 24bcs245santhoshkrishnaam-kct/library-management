import React, { useState } from 'react';
import { Search, Sparkles, Filter, X, CheckCircle2 } from 'lucide-react';

const SUGGESTED_QUERIES = [
  "Find beginner-friendly Python books.",
  "Show me books about artificial intelligence.",
  "Find Java books written for beginners.",
  "Which books are available for learning web development?",
  "Show available database management books."
];

export default function SearchBar({
  searchQuery,
  setSearchQuery,
  selectedCategory,
  setSelectedCategory,
  selectedAuthor,
  setSelectedAuthor,
  availableOnly,
  setAvailableOnly,
  categories,
  authors,
  onSearch,
  totalResults,
  loading
}) {
  const [inputValue, setInputValue] = useState(searchQuery);

  const handleSubmit = (e) => {
    e.preventDefault();
    setSearchQuery(inputValue);
    onSearch(inputValue);
  };

  const handleSuggestionClick = (suggestion) => {
    setInputValue(suggestion);
    setSearchQuery(suggestion);
    onSearch(suggestion);
  };

  const handleClear = () => {
    setInputValue('');
    setSearchQuery('');
    setSelectedCategory('All');
    setSelectedAuthor('All');
    setAvailableOnly(false);
    onSearch('', 'All', 'All', false);
  };

  const hasActiveFilters = searchQuery !== '' || selectedCategory !== 'All' || selectedAuthor !== 'All' || availableOnly;

  return (
    <div className="card shadow-sm border-0 mb-4 bg-white rounded-4 overflow-hidden">
      <div className="card-body p-4">
        {/* Title & Badge */}
        <div className="d-flex align-items-center justify-content-between mb-3">
          <div className="d-flex align-items-center gap-2">
            <div className="p-2 bg-primary bg-opacity-10 text-primary rounded-3">
              <Sparkles size={20} />
            </div>
            <div>
              <h5 className="mb-0 fw-bold text-dark">Intelligent AI Book Search</h5>
              <small className="text-muted">Search catalogue using natural language intent, topics, authors, or learning goals</small>
            </div>
          </div>
          {totalResults !== undefined && (
            <span className="badge bg-light text-dark border px-3 py-2 rounded-pill fw-medium">
              {totalResults} {totalResults === 1 ? 'Book' : 'Books'} Found
            </span>
          )}
        </div>

        {/* Search Input Form */}
        <form onSubmit={handleSubmit} className="mb-3">
          <div className="input-group input-group-lg shadow-sm rounded-4 overflow-hidden border">
            <span className="input-group-text bg-white border-0 ps-3 text-primary">
              <Search size={22} />
            </span>
            <input
              type="text"
              className="form-control border-0 px-2"
              placeholder="E.g. 'Find beginner-friendly Python books' or 'database systems'..."
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              style={{ boxShadow: 'none', fontSize: '1.05rem' }}
            />
            {inputValue && (
              <button
                type="button"
                className="btn btn-link text-muted border-0 pe-2"
                onClick={() => setInputValue('')}
              >
                <X size={18} />
              </button>
            )}
            <button
              type="submit"
              className="btn btn-primary px-4 fw-semibold d-flex align-items-center gap-2"
              disabled={loading}
            >
              {loading ? (
                <>
                  <span className="spinner-border spinner-border-sm" role="status" aria-hidden="true"></span>
                  Searching...
                </>
              ) : (
                <>
                  <Sparkles size={18} />
                  AI Search
                </>
              )}
            </button>
          </div>
        </form>

        {/* Suggested Queries Chips */}
        <div className="d-flex align-items-center flex-wrap gap-2 mb-3">
          <span className="small text-muted fw-semibold me-1">Try asking:</span>
          {SUGGESTED_QUERIES.map((q, idx) => (
            <button
              key={idx}
              type="button"
              className="btn btn-sm btn-outline-secondary rounded-pill py-1 px-3 small border-0 bg-light text-dark fw-normal hover-pill"
              style={{ fontSize: '0.82rem' }}
              onClick={() => handleSuggestionClick(q)}
            >
              "{q}"
            </button>
          ))}
        </div>

        {/* Filter Controls */}
        <div className="row g-3 align-items-center pt-2 border-top">
          <div className="col-12 col-md-4">
            <div className="d-flex align-items-center gap-2">
              <Filter size={16} className="text-secondary" />
              <label className="small text-muted fw-semibold mb-0">Category:</label>
              <select
                className="form-select form-select-sm rounded-3 border-secondary-subtle"
                value={selectedCategory}
                onChange={(e) => {
                  setSelectedCategory(e.target.value);
                  onSearch(inputValue, e.target.value, selectedAuthor, availableOnly);
                }}
              >
                {categories.map((c, i) => (
                  <option key={i} value={c}>{c}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="col-12 col-md-4">
            <div className="d-flex align-items-center gap-2">
              <label className="small text-muted fw-semibold mb-0">Author:</label>
              <select
                className="form-select form-select-sm rounded-3 border-secondary-subtle"
                value={selectedAuthor}
                onChange={(e) => {
                  setSelectedAuthor(e.target.value);
                  onSearch(inputValue, selectedCategory, e.target.value, availableOnly);
                }}
              >
                {authors.map((a, i) => (
                  <option key={i} value={a}>{a}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="col-12 col-md-4 d-flex align-items-center justify-content-between justify-content-md-end gap-3">
            <div className="form-check form-switch mb-0">
              <input
                className="form-check-input"
                type="checkbox"
                id="availableOnlySwitch"
                checked={availableOnly}
                onChange={(e) => {
                  setAvailableOnly(e.target.checked);
                  onSearch(inputValue, selectedCategory, selectedAuthor, e.target.checked);
                }}
                style={{ cursor: 'pointer' }}
              />
              <label className="form-check-label small fw-semibold text-dark" htmlFor="availableOnlySwitch" style={{ cursor: 'pointer' }}>
                Available Only
              </label>
            </div>

            {hasActiveFilters && (
              <button
                type="button"
                className="btn btn-sm btn-link text-danger text-decoration-none p-0 small fw-medium"
                onClick={handleClear}
              >
                Reset Filters
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

